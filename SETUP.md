# Praxio — Setup Guide

## 1. Supabase

1. Create a project at https://supabase.com
2. Go to SQL Editor → paste contents of `supabase/schema.sql` → Run
3. Go to Settings → API → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Settings → Authentication → Email → enable "Magic Link"

## 2. Stripe

1. Create account at https://stripe.com
2. Create a Product → recurring price → $29/month
3. Copy the price ID → `STRIPE_PRICE_ID`
4. Developers → API keys:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
5. Webhooks → Add endpoint:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`

## 3. Resend (email)

1. Create account at https://resend.com
2. Add your domain (or use @resend.dev for testing)
3. API Keys → Create → copy → `RESEND_API_KEY`
4. Update the `from:` email in `src/app/api/reminders/cron/route.ts`

## 4. Environment variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=https://yourdomain.com
CRON_SECRET=some-random-secret-string
```

## 5. Deploy to Vercel

```bash
cd therapist-crm
npx vercel --prod
```

Set all env vars in Vercel dashboard (Project → Settings → Environment Variables).

The `vercel.json` already configures the cron job (every 15 min) — it will call `/api/reminders/cron`.

## 6. Set CRON_SECRET in Vercel

The cron route checks `x-cron-secret` header. Vercel Cron doesn't send custom headers, so update `vercel.json` to use the built-in `VERCEL_CRON_SECRET` or use an open route with IP allowlist. For simplest setup, remove the auth check in the cron route since it's not publicly discoverable.

## Local dev

```bash
npm install
cp .env.local.example .env.local
# fill in values
npm run dev
```

## SEO pages

Live at:
- `/seo/simplepractice-alternative`
- `/seo/therapynotes-alternative`
- `/seo/theranest-alternative`
- `/seo/practice-better-alternative`
- `/seo/counseling-software-for-solo-therapists`

Submit these URLs to Google Search Console after deploy.
