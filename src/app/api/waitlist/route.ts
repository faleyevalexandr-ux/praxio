// Waitlist capture for the founding cohort. Public POST, stored via service role.
// No PHI here — this is prospect intent (email + optional practice context).
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('waitlist').upsert(
    {
      email,
      source: body.source ? String(body.source) : 'founding',
      practice_type: body.practice_type ? String(body.practice_type) : null,
      current_tool: body.current_tool ? String(body.current_tool) : null,
      willing_to_pay: true,
    },
    { onConflict: 'email' }
  )

  if (error) {
    console.error('Waitlist insert error:', error.message)
    return NextResponse.json({ error: 'Could not save — try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// Live count of founding signups — drives the "X of 30 spots" counter.
export async function GET() {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
  if (error) {
    return NextResponse.json({ count: 0 })
  }
  return NextResponse.json({ count: count ?? 0 })
}
