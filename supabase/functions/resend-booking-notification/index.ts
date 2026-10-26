// ============================================================================
// Supabase Edge Function: resend-booking-notification
//
// Admin-only. Re-sends one booking email on demand — used by the "Resend"
// buttons on Admin -> Reservations when a guest says nothing arrived.
//
// Unlike notify-booking this is NOT called by a webhook, so it is deployed with
// the default JWT verification ON and additionally checks the caller's token,
// so only a signed-in admin can trigger it. Every attempt is logged to
// public.booking_notification_log just like the automatic sends.
//
// Request body (JSON):
//   { "reservationId": "<uuid>", "kind": "guest_confirmation" }
// kind is one of: host_alert | guest_acknowledgement | guest_confirmation
//
// Deploy:
//   supabase functions deploy resend-booking-notification
// (no --no-verify-jwt — the gatekeeper must verify the admin's token)
// ============================================================================

import {
  SERVICE_ROLE_KEY,
  SUPABASE_URL,
  loadNotificationContext,
  sendNotification,
  type NotificationKind,
  type ReservationRecord,
} from '../_shared/notifyCore.ts';

const KINDS: NotificationKind[] = ['host_alert', 'guest_acknowledgement', 'guest_confirmation'];

/** Resolves the caller's user id from their access token, or null if invalid. */
async function getUserId(token: string): Promise<string | null> {
  if (!token || !SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return user?.id ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Belt-and-braces on top of the gateway's JWT check.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const userId = await getUserId(token);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  let body: { reservationId?: string; kind?: NotificationKind };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const reservationId = body.reservationId;
  const kind = body.kind;
  if (!reservationId) return json({ error: 'reservationId is required' }, 400);
  if (!kind || !KINDS.includes(kind)) {
    return json({ error: `kind must be one of: ${KINDS.join(', ')}` }, 400);
  }

  // Load the reservation with the service role (bypasses RLS, admin-only path).
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(reservationId)}&select=*`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Accept: 'application/json',
      },
    },
  );
  if (!res.ok) {
    return json({ error: `Could not load reservation (${res.status})` }, 502);
  }
  const rows = (await res.json()) as ReservationRecord[];
  const record = rows[0];
  if (!record) return json({ error: 'Reservation not found' }, 404);

  const ctx = await loadNotificationContext(record);
  const outcome = await sendNotification({ kind, event: 'MANUAL', record, ...ctx });

  return json({
    ok: outcome.status === 'sent',
    status: outcome.status,
    detail: outcome.detail,
    kind,
    recipient: kind === 'host_alert' ? ctx.hostEmail : ctx.guestEmail,
  });
});
