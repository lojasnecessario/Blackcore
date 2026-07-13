CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    external_payment_id TEXT,
    external_reference TEXT,
    status TEXT,
    raw_payload JSONB,
    verified_payload JSONB,
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver
CREATE POLICY "Admins can view payment events" ON public.payment_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'ADMIN' OR profiles.role = 'EMPLOYEE')
        )
    );
