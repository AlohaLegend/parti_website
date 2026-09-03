# PARTI inquiry email notification

This Google Apps Script receives `INSERT` database webhooks for `public.inquiries` and sends a formatted notification from the `liam@letsparti.co` Google Workspace account to `liam@letsparti.co`.

The deployed script stores `WEBHOOK_SECRET` in Apps Script project properties. Supabase calls the deployment URL with the same value as the `key` query parameter. Never commit that value to this repository.

Deployment settings:

- Execute as: Me (`liam@letsparti.co`)
- Who has access: Anyone
- Trigger: Supabase Database Webhook, `public.inquiries`, `INSERT`
