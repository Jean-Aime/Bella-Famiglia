/* ============================================================================
# Booking notification webhooks (emails on request + confirmation)

Wires public.reservations to the `notify-booking` Edge Function so that:
  * a new PENDING request  -> host alert + "we received your request" to guest
  * status becomes CONFIRMED -> confirmation email to the guest

PAIRS WITH: supabase/functions/notify-booking/index.ts

This uses the `pg_net` extension (enabled below), which ships with every
Supabase project. It does NOT depend on the `supabase_functions` schema — that
schema only exists if you have created a Database Webhook from the Dashboard,
which is why an earlier version of this file failed with
`schema "supabase_functions" does not exist`.

BEFORE RUNNING
--------------
1. Deploy the function:
     supabase functions deploy notify-booking --no-verify-jwt
2. Set its secrets (Dashboard -> Edge Functions -> notify-booking -> Secrets):
     RESEND_API_KEY   (https://resend.com/api-keys)
     EMAIL_FROM       e.g. "Maison Privee <stay@yourdomain.com>"
     WEBHOOK_SECRET   a long random string
   Optionally NOTIFY_EMAIL to send host alerts somewhere other than
   property_settings.contact_email.
3. The project ref and webhook secret are ALREADY filled in below —
   there is nothing left to edit in this file.
     project ref   = qlpgcljfqmtttnywgqaz  (your API URL)
     webhook secret = see the webhook_secret line below. It must be IDENTICAL
     to WEBHOOK_SECRET on the function — set it with `supabase secrets set`,
     copying the value straight from this file (never type it into chat).
4. Run this file in the Supabase SQL Editor.

CHECK IT WORKED
---------------
After running, submit a booking request on the site, then inspect:
  select * from net._http_response order by created desc limit 5;
A row with status_code = 200 means the Edge Function received the event. If it
is NULL the request is still in flight; if it is 4xx/5xx check the function's
logs (Dashboard -> Edge Functions -> notify-booking -> Logs).
*/

-- pg_net gives us net.http_post(), a non-blocking HTTP client usable from SQL.
-- (Its functions live in the `net` schema regardless of where the extension
-- itself is installed. `IF NOT EXISTS` never relocates an existing install.)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- One function shared by both triggers. It builds the same JSON payload shape
-- that Supabase's own Database Webhooks send, so the Edge Function needs no
-- changes to work with either wiring method.
CREATE OR REPLACE FUNCTION public.notify_booking_http()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_url    text := 'https://qlpgcljfqmtttnywgqaz.supabase.co/functions/v1/notify-booking';
  webhook_secret text := '76dc0175679513b43d6c5cb7cfa1dbd45135f80fc93ea79a674cb91a62164c78';
  payload        jsonb;
BEGIN
  -- On UPDATE only fire when the status actually changes to CONFIRMED;
  -- everything else (notes edits, payment flags, …) is ignored.
  IF TG_OP = 'UPDATE'
     AND NOT (NEW.status = 'CONFIRMED' AND OLD.status IS DISTINCT FROM 'CONFIRMED')
  THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type',        TG_OP,
    'table',       TG_TABLE_NAME,
    'schema',      TG_TABLE_SCHEMA,
    'record',      to_jsonb(NEW),
    'old_record',  CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  PERFORM net.http_post(
    url                  := webhook_url,
    body                 := payload,
    headers              := jsonb_build_object(
                              'Content-Type', 'application/json',
                              'x-webhook-secret', webhook_secret
                            ),
    timeout_milliseconds := 10000
  );

  RETURN NEW;
END;
$$;


-- New direct booking request received ---------------------------------------
DROP TRIGGER IF EXISTS notify_booking_on_insert ON public.reservations;
CREATE TRIGGER notify_booking_on_insert
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_http();


-- Reservation confirmed by the host -----------------------------------------
DROP TRIGGER IF EXISTS notify_booking_on_update ON public.reservations;
CREATE TRIGGER notify_booking_on_update
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_http();


-- ============================================================================
-- Verification: both triggers should be listed.
-- ============================================================================
SELECT tgname AS trigger_name, tgrelid::regclass AS table_name, tgenabled AS enabled
  FROM pg_trigger
 WHERE tgname IN ('notify_booking_on_insert', 'notify_booking_on_update');
