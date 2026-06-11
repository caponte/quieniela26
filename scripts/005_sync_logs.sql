CREATE TABLE public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'cron', -- 'cron' | 'manual' | 'test'
  synced integer,
  total integer,
  errors jsonb,
  payload jsonb
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read sync_logs" ON public.sync_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
