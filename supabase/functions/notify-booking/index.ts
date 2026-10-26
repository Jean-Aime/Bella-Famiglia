// ============================================================================
// Supabase Edge Function: notify-booking
//
// Sends the emails the booking flow promises:
//   * INSERT  (new PENDING request)   -> alert the HOST, confirm to the GUEST
//   * UPDATE  (status -> CONFIRMED)   -> confirmation email to the GUEST
//
// Called by database triggers on public.reservations
// (see migrations/20261010123000_booking_notification_webhooks.sql).
//
// Every attempt is recorded in public.booking_notification_log so the admin
// panel can show delivery history (see migrations/20261010140000_*.sql).
//
// REQUIRED SECRETS (Dashboard -> Edge Functions -> Secrets, or `supabase secrets set`):
//   RESEND_API_KEY   - from https://resend.com/api-keys
//   EMAIL_FROM       - verified sender, e.g. "Maison Privee <stay@yourdomain.com>"
//   WEBHOOK_SECRET   - any long random string; must match the webhook header
// Optional:
//   NOTIFY_EMAIL     - where host alerts go (defaults to property_settings.contact_email)
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Deploy:
//   supabase functions deploy notify-booking --no-verify-jwt
// ============================================================================

import {
  WEBHOOK_SECRET,
  loadNotificationContext,
  sendNotification,
  type NotificationKind,
  type WebhookPayload,
} from '../_shared/notifyCore.ts';

Deno.serve(async (req: Request) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Verify the caller is our database webhook.
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const record = payload.record;
  if (!record || payload.table !== 'reservations') {
    return json({ skipped: true, reason: 'Not a reservations event' });
  }

  const event = payload.type === 'UPDATE' ? 'UPDATE' : 'INSERT';
  const ctx = await loadNotificationContext(record);
  const results: Record<string, unknown> = { event, status: record.status };

  // ---- new request: alert host + acknowledge guest -------------------------
  if (event === 'INSERT' && record.status === 'PENDING') {
    results.hostAlert = await sendNotification({ kind: 'host_alert', event, record, ...ctx });
    results.guestAcknowledgement = await sendNotification({
      kind: 'guest_acknowledgement', event, record, ...ctx,
    });
  }

  // ---- confirmed by the host: email the guest ------------------------------
  const wasConfirmed = payload.old_record?.status === 'CONFIRMED';
  if (event === 'UPDATE' && record.status === 'CONFIRMED' && !wasConfirmed) {
    const kind: NotificationKind = 'guest_confirmation';
    results.guestConfirmation = await sendNotification({ kind, event, record, ...ctx });
  }

  return json({ ok: true, ...results });
});
