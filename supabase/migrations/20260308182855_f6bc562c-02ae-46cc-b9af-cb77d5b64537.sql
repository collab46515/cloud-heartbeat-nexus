
-- Notifications table for the Notification Center
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'system',
  severity text NOT NULL DEFAULT 'info',
  entity_type text,
  entity_id uuid,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Service role full access notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Patient portal sessions table (tracks portal logins by patients)
CREATE TABLE public.patient_portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound',
  status text NOT NULL DEFAULT 'unread',
  replied_by uuid,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_portal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read portal messages"
  ON public.patient_portal_messages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Auth users can insert portal messages"
  ON public.patient_portal_messages FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Auth users can update portal messages"
  ON public.patient_portal_messages FOR UPDATE TO authenticated
  USING (true);

CREATE INDEX idx_portal_messages_patient ON public.patient_portal_messages(patient_id, created_at DESC);
