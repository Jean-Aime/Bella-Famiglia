/* ============================================================================
# Booking notification log (delivery history for booking emails)

Every attempt to send a booking email is recorded here — sent, failed or
skipped — so the admin panel can show what actually went out instead of you
having to query `net._http_response` by hand.

Written ONLY by the Edge Functions (service role, which bypasses RLS):
  * supabase/functions/notify-booking                 (triggered by the DB)
  * supabase/functions/resend-booking-notification    (clicked in the admin)

Read (and pruned) by signed-in admins. Anonymous visitors see nothing.

HOW TO RUN
----------
Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
Safe to re-run.

NOTE ON RE-RUNNING THE RLS HARDENING FILE
-----------------------------------------
`20261010120000_harden_row_level_security.sql` drops every policy in `public`
before recreating the set it knows about. If you ever run that file again
after this one, re-run this file afterwards so this table's policies come
back. (That file also recreates them for this table, so either order works.)
*/

CREATE TABLE IF NOT EXISTS public.booking_notification_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kept even if the reservation is later deleted (audit trail).
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  -- What caused the send: the DB trigger (INSERT/UPDATE) or a manual resend.
  event          text NOT NULL CHECK (event IN ('INSERT', 'UPDATE', 'MANUAL')),
  kind           text NOT NULL CHECK (kind IN (
                   'host_alert', 'guest_acknowledgement', 'guest_confirmation')),
  recipient      text,
  status         text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  -- Provider response body, or the reason it was skipped.
  detail         text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_notification_log_reservation
  ON public.booking_notification_log (reservation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_notification_log_created
  ON public.booking_notification_log (created_at DESC);


-- ---------------------------------------------------------------------------
-- Access rules: admins read/prune; nobody writes through the API.
-- ---------------------------------------------------------------------------
ALTER TABLE public.booking_notification_log ENABLE ROW LEVEL SECURITY;

-- Defence in depth: no anonymous table privileges at all.
REVOKE ALL ON public.booking_notification_log FROM anon;

DROP POLICY IF EXISTS "auth_read_booking_notification_log" ON public.booking_notification_log;
CREATE POLICY "auth_read_booking_notification_log" ON public.booking_notification_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_delete_booking_notification_log" ON public.booking_notification_log;
CREATE POLICY "auth_delete_booking_notification_log" ON public.booking_notification_log
  FOR DELETE TO authenticated USING (true);

-- Deliberately NO insert/update policy: only the service-role Edge Functions
-- may write rows here, so the history cannot be forged from the browser.

GRANT SELECT, DELETE ON public.booking_notification_log TO authenticated;


-- ============================================================================
-- Verification: rowsecurity must be true and the two policies present.
-- ============================================================================
SELECT c.relname AS table_name, c.relrowsecurity AS rowsecurity,
       array_agg(p.policyname ORDER BY p.policyname) AS policies
  FROM pg_class c
  LEFT JOIN pg_policies p
         ON p.schemaname = 'public' AND p.tablename = c.relname
 WHERE c.relname = 'booking_notification_log'
 GROUP BY c.relname, c.relrowsecurity;
