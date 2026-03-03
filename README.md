# Smart Parking Management

Production-oriented smart parking platform built with React + Supabase. It supports user booking flows, owner space management, payments/wallet tracking, notifications, and secured backend RPC workflows.

## Core Capabilities

- User authentication with profile management.
- Owner parking space management (capacity, pricing, images).
- Real-time parking discovery and booking.
- Booking lifecycle controls (create, cancel, complete).
- Payment and refund tracking.
- Notifications for booking/payment events.
- Role-based backend access with strict RLS and secured RPCs.
- Login protection with failed-attempt lockout support.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- Backend: Supabase (Postgres, Auth, Storage, RLS, RPC, pg_cron).
- API (admin routes): Next.js API handlers in `pages/api/admin/*`.

## Project Structure

- `src/pages/dashboard/` - User and owner dashboard pages.
- `src/components/` - Reusable UI and dashboard layout components.
- `src/contexts/` - Auth context and session handling.
- `supabase/migrations/` - Database schema and security migrations.
- `scripts/e2e-smoke.cjs` - Live Supabase end-to-end smoke test.

## Environment Variables

Create `.env` in project root:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ADMIN_SESSION_SECRET=<long-random-secret>
```

Notes:
- `VITE_*` values are required for frontend runtime.
- `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_SESSION_SECRET` are required for admin API routes.
- Never commit secrets. `.env` is ignored by git.

## Getting Started

```bash
npm install
npm run dev
```

Open: `http://localhost:5173`

## Scripts

- `npm run dev` - Start development server.
- `npm run build` - Build production bundle.
- `npm run preview` - Preview production build locally.
- `npm run lint` - Run ESLint.
- `npm run sb -- <command>` - Run Supabase CLI commands.
- `npm run test:e2e:smoke` - Run live backend E2E smoke test (creates + cleans temporary data).

## Database and Security

The project uses hardened Supabase migration layers including:

- Strict RLS policies (no broad public write access).
- Security-definer RPC controls with auth checks.
- Booking/payment flow integrity constraints.
- Cron-driven completion processing.
- Login lockout helper functions and cleanup job.

Latest hardening migrations are in `supabase/migrations/20260303*.sql`.

## End-to-End Validation

Run:

```bash
npm run test:e2e:smoke
```

This verifies key edge cases:

- Failed-login lockout threshold and reset.
- Booking creation and availability checks.
- Overbooking rejection.
- Cancellation and refund flow.
- Completion job idempotence.

## Deployment Checklist

- Set all required env vars in target environment.
- Apply latest Supabase migrations.
- Rotate any exposed or shared keys.
- Run `npm run build` and `npm run test:e2e:smoke` before release.

## Community Standards

- Code of Conduct: `CODE_OF_CONDUCT.md`
- Contributing Guide: `CONTRIBUTING.md`
- Security Policy: `SECURITY.md`
- License: `LICENSE`
