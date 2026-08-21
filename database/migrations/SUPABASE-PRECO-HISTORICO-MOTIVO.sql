-- Economizaí: registra o motivo legível de cada alteração automática de preço.
-- Seguro para executar mais de uma vez no SQL Editor do Supabase.

ALTER TABLE public.price_history
  ADD COLUMN IF NOT EXISTS change_reason text;

COMMENT ON COLUMN public.price_history.change_reason IS
  'Motivo legível da alteração de preço, gerado pelo monitoramento ou painel.';
