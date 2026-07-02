// Cron endpoint: send pending appointment reminders.
// Vercel Cron schedule: every 15 minutes (see vercel.json)
// Secured with x-cron-secret header (set CRON_SECRET env var)
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY ?? 'placeholder')
  // Auth check
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Find pending reminders due in the next 5 minutes (with buffer)
  const now = new Date()
  const windowEnd = new Date(now.getTime() + 5 * 60 * 1000)

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select(`
      id, type,
      appointments(
        id, title, start_time,
        clients(full_name, email),
        profiles:therapist_id(full_name, practice_name, email)
      )
    `)
    .eq('status', 'pending')
    .lte('send_at', windowEnd.toISOString())
    .limit(100)

  if (error) {
    console.error('Reminders fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const reminder of reminders ?? []) {
    const appt = (reminder as any).appointments
    const client = appt?.clients

    if (!client?.email) {
      // Skip — no email, mark as skipped
      await supabase.from('reminders').update({ status: 'skipped' }).eq('id', reminder.id)
      continue
    }

    const startTime = new Date(appt.start_time)
    const dateStr = startTime.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    })
    const timeStr = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    })

    // PHI minimization: reminder emails deliberately carry NO protected health
    // information — no client name, no appointment title, no "therapy"/"session"
    // wording, no practice name that could reveal a mental-health context. Only
    // a neutral date/time. Keeps the email channel out of scope for PHI so a
    // BAA with the email provider is not required. Details live behind login.
    const subject = reminder.type === '24h'
      ? `Appointment reminder for tomorrow`
      : `Appointment reminder — in 1 hour`

    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="background: #2563eb; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">Appointment Reminder</h2>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p style="color: #475569; margin: 0 0 16px;">Hi there,</p>
          <p style="color: #475569; margin: 0 0 24px;">
            This is a reminder of your upcoming appointment:
          </p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #0f172a; font-size: 15px;"><strong>${dateStr} at ${timeStr}</strong></p>
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">
            If you need to reschedule, please contact your provider directly.
          </p>
        </div>
        <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin-top: 16px;">
          Sent by Praxio
        </p>
      </div>
    `

    try {
      await resend.emails.send({
        from: `Appointments <reminders@praxio.app>`,
        to: client.email,
        subject,
        html,
      })

      await supabase.from('reminders').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', reminder.id)

      // Mark the appointment field too
      const field = reminder.type === '24h' ? 'reminder_24h_sent' : 'reminder_1h_sent'
      await supabase.from('appointments').update({ [field]: true }).eq('id', appt.id)

      sent++
    } catch (err: any) {
      console.error('Email send error:', err)
      await supabase.from('reminders').update({
        status: 'failed',
        error: err.message,
      }).eq('id', reminder.id)
      failed++
    }
  }

  return NextResponse.json({ sent, failed, total: reminders?.length ?? 0 })
}
