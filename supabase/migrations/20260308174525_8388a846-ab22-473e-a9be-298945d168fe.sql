
-- AI feedback table for continuous improvement loop
CREATE TABLE public.ai_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_capability TEXT NOT NULL,
  prediction_id UUID,
  claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  outcome TEXT,
  feedback_text TEXT,
  prediction_was_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can insert ai_feedback" ON public.ai_feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can read ai_feedback" ON public.ai_feedback FOR SELECT TO authenticated USING (true);

-- AI usage tracking table for operations center & cost management
CREATE TABLE public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  capability TEXT NOT NULL,
  edge_function TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  request_tokens INTEGER DEFAULT 0,
  response_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  model_used TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can insert ai_usage_logs" ON public.ai_usage_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can read ai_usage_logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access feedback" ON public.ai_usage_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access ai_feedback" ON public.ai_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_ai_usage_logs_capability ON public.ai_usage_logs(capability);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);
CREATE INDEX idx_ai_feedback_capability ON public.ai_feedback(ai_capability);
CREATE INDEX idx_ai_feedback_created_at ON public.ai_feedback(created_at);
