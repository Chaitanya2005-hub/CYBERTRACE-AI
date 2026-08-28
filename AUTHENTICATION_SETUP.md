# Authentication Setup Guide

This document explains how to set up and configure authentication for Cyber Trace AI.

## Overview

Cyber Trace AI supports two authentication modes:

1. **Production Mode**: Full Supabase Auth with real user accounts
2. **Bypass Mode**: Demo mode that accepts any credentials for instant access

## Production Mode Setup

### 1. Create Supabase Project

1. Go to https://supabase.com and sign up/log in
2. Create a new project
3. Wait for the project to be provisioned (2-3 minutes)

### 2. Enable Authentication

1. In your Supabase project dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider (enabled by default)
3. Configure email templates if needed (optional)

### 3. Get API Credentials

1. Go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xyz.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys" - keep this secret!)

### 4. Configure Environment Variables

Create `.env` files in both `client/` and `server/` directories:

**client/.env:**
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**server/.env:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PORT=3000
```

### 5. Apply Database Schema

Run the SQL from `ARCHITECTURE.md` section 4 in your Supabase SQL Editor:

```sql
-- Create cases table
create table cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  case_name text not null,
  created_at timestamptz default now()
);

-- Create CDR records table
create table cdr_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  caller_number text not null,
  receiver_number text not null,
  timestamp timestamptz not null,
  duration_sec integer not null,
  tower_id text,
  call_type text not null check (call_type in ('voice', 'sms', 'data'))
);

-- Create financial transactions table
create table financial_transactions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  sender_account text not null,
  receiver_account text not null,
  amount_inr numeric not null,
  timestamp timestamptz not null,
  txn_type text not null,
  flagged_risk_score numeric
);

-- Enable RLS
alter table cases enable row level security;
alter table cdr_records enable row level security;
alter table financial_transactions enable row level security;

-- RLS policies
create policy "Users can view their own cases" on cases
  for select using (auth.uid() = user_id);

create policy "Users can insert their own cases" on cases
  for insert with check (auth.uid() = user_id);

create policy "Users can view CDR records for their cases" on cdr_records
  for select using (
    case_id in (select id from cases where user_id = auth.uid())
  );

create policy "Users can insert CDR records for their cases" on cdr_records
  for insert with check (
    case_id in (select id from cases where user_id = auth.uid())
  );

create policy "Users can view financial transactions for their cases" on financial_transactions
  for select using (
    case_id in (select id from cases where user_id = auth.uid())
  );

create policy "Users can insert financial transactions for their cases" on financial_transactions
  for insert with check (
    case_id in (select id from cases where user_id = auth.uid())
  );
```

### 6. Start the Application

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### 7. Test Authentication

1. Open `http://localhost:5173`
2. Click "Need an account? Create one"
3. Enter email and password
4. Check your email for verification (if enabled)
5. Sign in with your credentials

## Bypass Mode Setup (Demo)

Bypass mode is automatically enabled when:
- No Supabase credentials are configured
- `VITE_API_BASE_URL` points to port 3001 (demo server)

### Quick Start (No Database Required)

1. Install dependencies:
```bash
npm install  # in both client/ and server/
```

2. Start demo server:
```bash
cd server
node node_modules/tsx/dist/cli.mjs demo-server.ts
```

3. Start client:
```bash
cd client
npm run dev
```

4. Open `http://localhost:5173`
5. Enter **any** email/password to sign in
6. Click "Pre-load Sample Network" to load Kaggle data

### Configure Bypass Mode

To force bypass mode, set in `client/.env`:
```bash
VITE_API_BASE_URL=http://localhost:3001
# Leave VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY empty
```

## Authentication Features

### User Management
- **Sign Up**: Create new accounts with email/password
- **Sign In**: Authenticate existing users
- **Sign Out**: Securely end sessions
- **Session Persistence**: Sessions persist across page refreshes

### Bypass Mode Features
- **Any Credentials**: Accepts any email/password combination
- **Mock User**: Returns demo user (`demo@investigator.gov`)
- **No Database**: No Supabase connection required
- **Instant Access**: Perfect for demos and hackathons

### Security Notes

- **Production Mode**: Uses Supabase Auth with proper security
- **Bypass Mode**: For demo only - do not use in production
- **Session Management**: Tokens handled by Supabase Auth
- **RLS Policies**: Row-Level Security enforced in production

## Troubleshooting

### "Missing Supabase credentials" error
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `client/.env`
- Ensure you've copied the correct values from Supabase dashboard

### Authentication not persisting
- Check browser console for Supabase errors
- Verify Supabase Auth is enabled in your project
- Check that RLS policies allow user operations

### Bypass mode not working
- Ensure `VITE_API_BASE_URL` points to port 3001
- Verify demo server is running on port 3001
- Check that Supabase credentials are not set (bypass mode activates when missing)

### User info not showing in header
- Check that user state is properly set after login
- Verify Header component receives user prop
- Check browser console for JavaScript errors

## Migration from Bypass to Production

To switch from bypass mode to production:

1. Set up Supabase project (see Production Mode Setup)
2. Configure environment variables
3. Apply database schema
4. Restart both client and server
5. Users will now need real Supabase accounts

Existing demo data will not be available in production mode - users must upload their own CSV files.