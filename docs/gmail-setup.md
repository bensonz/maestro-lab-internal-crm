# Gmail API Integration Setup

## Prerequisites
- Google Cloud account
- Access to the business Gmail inbox
- Admin access to the CRM

## Google Cloud Setup

### 1. Create Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Maestro CRM Gmail")
3. Select the project

### 2. Enable Gmail API
1. Go to **APIs & Services > Library**
2. Search for "Gmail API"
3. Click **Enable**

### 3. Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**
2. Choose **Internal** (if Google Workspace) or **External**
3. Fill in required fields:
   - App name: "Maestro CRM"
   - User support email: your admin email
   - Developer contact: your admin email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
5. Add test users (if external): the business Gmail address

### 4. Create OAuth Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Web application**
4. Name: "Maestro CRM"
5. Authorized redirect URIs:
   - Production: `https://your-domain.com/api/gmail/callback`
   - Local dev: `http://localhost:3000/api/gmail/callback`
6. Copy **Client ID** and **Client Secret**

## Environment Variables

Add to `.env` (local) or Vercel environment:

```env
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=https://your-domain.com/api/gmail/callback
CRON_SECRET=any-random-secret-for-cron-auth
```

For local development:
```env
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
CRON_SECRET=local-dev-secret
```

## Connect Gmail

1. Navigate to `/backoffice/settings/gmail` (admin only)
2. Click **Connect Gmail**
3. Google will ask for consent — grant access
4. You'll be redirected back with a success message
5. Click **Sync Now** to test

## How It Works

### Email Detection
The system checks incoming emails against 5 detectors:

| Detector | Triggers On | Creates |
|----------|-------------|---------|
| VIP | "VIP", "elevated status" from sportsbooks | Todo: "VIP Account — Reply Required" |
| Verification | "verify", "action needed" from platforms | Todo: "Account Verification — Send to Client" |
| Fund Deposit | "deposit confirmed" + $ amount | Todo: "Confirm Fund Deposit" + auto-match |
| Fund Withdrawal | "withdrawal processed" + $ amount | Todo: "Confirm Fund Withdrawal" + auto-match |
| PayPal | PayPal transfer notifications | Todo: "Confirm Fund Deposit/Withdrawal" + auto-match |

### Client Identification
Emails are matched to clients via the `assignedGmail` field on ClientDraft. The "to" address of the email is compared against stored Gmail addresses to identify which client's account generated the email, and the todo is assigned to that client's closer agent.

### Fund Matching
When a deposit/withdrawal email is detected:
1. System searches for matching `FundAllocation` records (same platform, direction, within 48h)
2. If amount matches within 5%: auto-confirms the allocation
3. If amount differs by 5-25%: flags as discrepancy with notes
4. If no match: creates a manual review todo

### Cron Schedule
- Vercel Cron runs every 5 minutes (`*/5 * * * *`)
- Secured with `CRON_SECRET` bearer token
- Configured in `vercel.json`

### Manual Sync
- Admin/Backoffice can trigger sync from `/backoffice/settings/gmail`
- Also available programmatically via `triggerManualSync()` action

## Troubleshooting

### "Gmail OAuth not configured"
Missing environment variables. Check `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`.

### "OAuth consent was denied"
User declined Google's consent screen. Try again and accept all permissions.

### "Token exchange failed"
The authorization code expired. Start the OAuth flow again.

### No emails being detected
- Check that the inbox actually receives platform emails
- Verify the `assignedGmail` field matches on ClientDraft records
- Check ProcessedEmail table for records with `detectionType: 'UNKNOWN'`

### Cron not running
- Verify `vercel.json` is deployed
- Check Vercel dashboard > Cron Jobs for execution logs
- For local testing, use "Sync Now" button or call the API directly
