-- Migration: Persistencia Global de Finanzas / Bóveda
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.finanzas_config (
    id text PRIMARY KEY,
    boveda_ahorro_porcentaje numeric DEFAULT 15,
    boveda_saldo_acumulado numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Initialize the default row
INSERT INTO public.finanzas_config (id, boveda_ahorro_porcentaje, boveda_saldo_acumulado)
VALUES ('default', 15, 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.finanzas_transferencias_boveda (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo text NOT NULL, -- 'transferencia', 'gasto'
    concepto text,
    monto numeric NOT NULL,
    destino text, -- 'Socio A', 'Compra Servidor', etc.
    created_at timestamp with time zone DEFAULT now()
);

-- Permissions (assuming RLS is not fully strictly blocking or allowing anon)
ALTER TABLE public.finanzas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzas_transferencias_boveda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for config" ON public.finanzas_config FOR ALL USING (true);
CREATE POLICY "Allow all operations for transf" ON public.finanzas_transferencias_boveda FOR ALL USING (true);
