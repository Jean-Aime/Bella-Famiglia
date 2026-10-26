// ============================================================================
// Shared helpers for booking-notification emails + delivery logging.
//
// Imported by:
//   ../notify-booking/index.ts               (database-triggered)
//   ../resend-booking-notification/index.ts  (admin-triggered)
//
// Emails go out through Resend (https://resend.com) over its plain REST API —
// no SDK needed. Every attempt, whether sent, failed or skipped, is recorded in
// public.booking_notification_log so the admin panel can show delivery history.
//
// SECRETS (set once, shared by both functions)
//   RESEND_API_KEY  - required to actually send
//   EMAIL_FROM      - verified sender, e.g. "Maison Privee <stay@example.com>"
//   WEBHOOK_SECRET  - only used by notify-booking (authenticates the DB webhook)
//   NOTIFY_EMAIL    - optional; overrides the host-alert recipient
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// ============================================================================

export const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
export const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? '';
export const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';
export const NOTIFY_EMAIL = Deno.env.get('NOTIFY_EMAIL') ?? '';
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
export const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export type NotificationEvent = 'INSERT' | 'UPDATE' | 'MANUAL';
export type NotificationKind = 'host_alert' | 'guest_acknowledgement' | 'guest_confirmation';
export type NotificationStatus = 'sent' | 'failed' | 'skipped';

export interface ReservationRecord {
  id: string;
  house_id: string;
  guest_id: string | null;
  check_in: string;
  check_out: string;
  num_guests: number;
  status: string;
  source: string;
  currency: string;
  notes: string | null;
}

export interface WebhookPayload {
  type?: NotificationEvent;
  table?: string;
  schema?: string;
  record?: ReservationRecord;
  old_record?: ReservationRecord | null;
}

export interface ResendEmail {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
}

export interface SendOutcome {
  status: NotificationStatus;
  detail: string;
}

// ============================================================================
// PostgREST helpers (service role — bypasses RLS)
// ============================================================================
export async function sbGet<T>(path: string): Promise<T | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as T[];
  return rows[0] ?? null;
}

/**
 * Writes one row to the delivery log. Never throws: a logging failure must not
 * fail the notification (or the booking) it is recording.
 */
export async function logNotification(entry: {
  reservation_id: string | null;
  event: NotificationEvent;
  kind: NotificationKind;
  recipient: string | null;
  status: NotificationStatus;
  detail: string | null;
}): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/booking_notification_log`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      console.error('notify: log write failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('notify: log write threw', err);
  }
}

// ============================================================================
// Formatting
// ============================================================================
export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

// ============================================================================
// Email rendering
// ============================================================================
function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f4f0;font-family:Georgia,'Times New Roman',serif;color:#1c1b19">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="letter-spacing:.22em;text-transform:uppercase;font-size:11px;color:#8a8578;margin:0 0 20px">Bella Famiglia</p>
    <h1 style="font-size:22px;font-weight:400;margin:0 0 16px">${title}</h1>
    ${bodyHtml}
    <p style="font-size:12px;color:#8a8578;margin-top:28px">This message was sent automatically. Just reply to reach your host.</p>
  </div></body></html>`;
}

function detailsBlock(r: ReservationRecord, houseName: string): string {
  const nights = nightsBetween(r.check_in, r.check_out);
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#8a8578">House</td><td style="padding:6px 0;text-align:right">${houseName}</td></tr>
    <tr><td style="padding:6px 0;color:#8a8578">Check-in</td><td style="padding:6px 0;text-align:right">${prettyDate(r.check_in)}</td></tr>
    <tr><td style="padding:6px 0;color:#8a8578">Check-out</td><td style="padding:6px 0;text-align:right">${prettyDate(r.check_out)}</td></tr>
    <tr><td style="padding:6px 0;color:#8a8578">Nights</td><td style="padding:6px 0;text-align:right">${nights}</td></tr>
    <tr><td style="padding:6px 0;color:#8a8578">Guests</td><td style="padding:6px 0;text-align:right">${r.num_guests}</td></tr>
  </table>`;
}

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => replacements[character]);
}

// ============================================================================
// Message builders — one per notification kind
// ============================================================================

/** To the HOST: a new request needs your attention. */
export function buildHostAlert(
  r: ReservationRecord, houseName: string, guestName: string, guestEmail: string | null, to: string,
): ResendEmail {
  const nights = nightsBetween(r.check_in, r.check_out);
  return {
    from: EMAIL_FROM,
    to: [to],
    subject: `New booking request · ${houseName} · ${prettyDate(r.check_in)}`,
    reply_to: guestEmail || undefined,
    text:
      `New booking request (PENDING)\n\n${houseName}\n` +
      `Guest: ${guestName}${guestEmail ? ` <${guestEmail}>` : ''}\n` +
      `Check-in: ${prettyDate(r.check_in)}\nCheck-out: ${prettyDate(r.check_out)}\n` +
      `Nights: ${nights}\nGuests: ${r.num_guests}\n\n` +
      `Notes: ${r.notes || '—'}\n\n` +
      `Confirm or decline it in the admin panel.`,
    html: shell(
      'New booking request',
      `<p style="font-size:15px;line-height:1.6">A guest has requested to book <strong>${houseName}</strong>.</p>
       ${detailsBlock(r, houseName)}
       <p style="font-size:14px;line-height:1.6;margin-top:16px"><strong>Guest:</strong> ${guestName}${
        guestEmail ? ` &lt;${guestEmail}&gt;` : ''}</p>
       <p style="font-size:14px;line-height:1.6"><strong>Notes:</strong> ${r.notes || '—'}</p>
       <p style="font-size:14px;line-height:1.6;margin-top:16px">Confirm or decline it in the admin panel to notify the guest.</p>`,
    ),
  };
}

/** To the GUEST: we got your request. */
export function buildGuestAcknowledgement(
  r: ReservationRecord, houseName: string, guestName: string, hostEmail: string | null, to: string,
): ResendEmail {
  const nights = nightsBetween(r.check_in, r.check_out);
  return {
    from: EMAIL_FROM,
    to: [to],
    subject: `We received your request · ${houseName}`,
    reply_to: hostEmail || undefined,
    text:
      `Hi ${guestName},\n\nThanks for your booking request for ${houseName}.\n\n` +
      `Check-in: ${prettyDate(r.check_in)}\nCheck-out: ${prettyDate(r.check_out)}\n` +
      `Nights: ${nights}\nGuests: ${r.num_guests}\n\n` +
      `Nothing to pay now — we review every request and reply within 24 hours to confirm.\n\n` +
      `Warm regards,\nMaison Privee`,
    html: shell(
      'We received your request',
      `<p style="font-size:15px;line-height:1.6">Hi ${guestName}, thanks for your booking request for <strong>${houseName}</strong>.</p>
       ${detailsBlock(r, houseName)}
       <p style="font-size:14px;line-height:1.6;margin-top:16px">Nothing to pay now — we review every request and reply within 24 hours to confirm.</p>`,
    ),
  };
}

/** To the GUEST: your stay is confirmed. */
export function buildGuestConfirmation(
  r: ReservationRecord,
  houseName: string,
  guestName: string,
  hostEmail: string | null,
  to: string,
  streetAddress: string,
  contactPhone: string,
): ResendEmail {
  const nights = nightsBetween(r.check_in, r.check_out);
  const escapedAddress = escapeHtml(streetAddress);
  const escapedPhone = escapeHtml(contactPhone);
  return {
    from: EMAIL_FROM,
    to: [to],
    subject: `Confirmed · your stay at ${houseName}`,
    reply_to: hostEmail || undefined,
    text:
      `Hi ${guestName},\n\nYour stay at ${houseName} is confirmed.\n\n` +
      `Check-in: ${prettyDate(r.check_in)}\nCheck-out: ${prettyDate(r.check_out)}\n` +
      `Nights: ${nights}\nGuests: ${r.num_guests}\n\n` +
      `Property address: ${streetAddress}\nGuest contact phone: ${contactPhone}\n\n` +
      `Warm regards,\nBella Famiglia`,
    html: shell(
      'Your stay is confirmed',
      `<p style="font-size:15px;line-height:1.6">Hi ${guestName}, your stay at <strong>${houseName}</strong> is confirmed.</p>
       ${detailsBlock(r, houseName)}
       <p style="font-size:14px;line-height:1.6;margin-top:16px"><strong>Property address:</strong><br>${escapedAddress}</p>
       <p style="font-size:14px;line-height:1.6"><strong>Guest contact phone:</strong> ${escapedPhone}</p>`,
    ),
  };
}

// ============================================================================
// Delivery
// ============================================================================
async function sendEmail(email: ResendEmail): Promise<{ ok: boolean; detail: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(email),
  });
  const body = await res.text();
  return { ok: res.ok, detail: body.slice(0, 500) };
}

/**
 * Sends one email if possible, and records the outcome either way. Returns the
 * outcome so the caller can report it back to the admin panel.
 */
export async function deliver(opts: {
  reservationId: string | null;
  event: NotificationEvent;
  kind: NotificationKind;
  recipient: string | null | undefined;
  build: (to: string) => ResendEmail;
}): Promise<SendOutcome> {
  const to = opts.recipient?.trim();

  if (!to) {
    const detail = 'No email address on record';
    await logNotification({
      reservation_id: opts.reservationId, event: opts.event, kind: opts.kind,
      recipient: null, status: 'skipped', detail,
    });
    return { status: 'skipped', detail };
  }

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    const detail = 'Email provider not configured (RESEND_API_KEY / EMAIL_FROM missing)';
    console.log(`notify: ${detail} — skipping ${opts.kind}`);
    await logNotification({
      reservation_id: opts.reservationId, event: opts.event, kind: opts.kind,
      recipient: to, status: 'skipped', detail,
    });
    return { status: 'skipped', detail };
  }

  const result = await sendEmail(opts.build(to));
  await logNotification({
    reservation_id: opts.reservationId, event: opts.event, kind: opts.kind,
    recipient: to, status: result.ok ? 'sent' : 'failed', detail: result.detail,
  });
  return { status: result.ok ? 'sent' : 'failed', detail: result.detail };
}

// ============================================================================
// Higher-level convenience
// ============================================================================

/** Loads house name, guest identity and the host email for one reservation. */
export async function loadNotificationContext(record: ReservationRecord): Promise<{
  houseName: string;
  guestName: string;
  guestEmail: string | null;
  hostEmail: string | null;
  privateAddress: string | null;
  contactPhone: string | null;
}> {
  const house = await sbGet<{ name: string }>(`houses?id=eq.${record.house_id}&select=name`);
  const guest = record.guest_id
    ? await sbGet<{ name: string; email: string | null }>(
        `guests?id=eq.${record.guest_id}&select=name,email`,
      )
    : null;
  const settings = await sbGet<{ value: string }>(
    `property_settings?key=eq.contact_email&select=value`,
  );
  const privateDetails = await sbGet<{ street_address: string; contact_phone: string }>(
    'private_property_details?id=eq.1&select=street_address,contact_phone',
  );

  return {
    houseName: house?.name ?? 'your house',
    guestName: guest?.name ?? 'there',
    guestEmail: guest?.email ?? null,
    hostEmail: NOTIFY_EMAIL || settings?.value || null,
    privateAddress: privateDetails?.street_address.trim() || null,
    contactPhone: privateDetails?.contact_phone.trim() || null,
  };
}

/** Builds and sends one notification kind, logging the outcome. */
export async function sendNotification(args: {
  kind: NotificationKind;
  event: NotificationEvent;
  record: ReservationRecord;
  houseName: string;
  guestName: string;
  guestEmail: string | null;
  hostEmail: string | null;
  privateAddress: string | null;
  contactPhone: string | null;
}): Promise<SendOutcome> {
  const { kind, event, record, houseName, guestName, guestEmail, hostEmail, privateAddress, contactPhone } = args;
  const reservationId = record.id;

  if (kind === 'host_alert') {
    return deliver({
      reservationId, event, kind, recipient: hostEmail,
      build: (to) => buildHostAlert(record, houseName, guestName, guestEmail, to),
    });
  }
  if (kind === 'guest_acknowledgement') {
    return deliver({
      reservationId, event, kind, recipient: guestEmail,
      build: (to) => buildGuestAcknowledgement(record, houseName, guestName, hostEmail, to),
    });
  }
  if (!privateAddress || !contactPhone) {
    const detail = 'Private property address and guest contact phone must be configured before sending the confirmation.';
    await logNotification({
      reservation_id: reservationId, event, kind,
      recipient: guestEmail, status: 'skipped', detail,
    });
    return { status: 'skipped', detail };
  }
  return deliver({
    reservationId, event, kind, recipient: guestEmail,
    build: (to) => buildGuestConfirmation(
      record,
      houseName,
      guestName,
      hostEmail,
      to,
      privateAddress,
      contactPhone,
    ),
  });
}
