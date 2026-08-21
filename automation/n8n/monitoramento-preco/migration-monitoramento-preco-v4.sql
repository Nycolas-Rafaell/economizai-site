-- Migration: monitoramento de preço (v3) — campos em public.offers + tabela de
-- auditoria detalhada public.offer_monitoring_logs.
-- Rodar manualmente no SQL Editor do Supabase ANTES de ativar o workflow
-- "MONITORAMENTO DE PRECO - BANCO DO SITE".
--
-- Seguro rodar mesmo se os campos/tabela já existirem (IF NOT EXISTS).
-- Não altera nenhuma outra tabela do site.

-- Necessário para gen_random_uuid() abaixo (normalmente já habilitado no Supabase).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Campos de controle de checagem em offers (já usados desde a v2).
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS last_check_status text,
  ADD COLUMN IF NOT EXISTS last_check_error text,
  ADD COLUMN IF NOT EXISTS consecutive_check_failures integer NOT NULL DEFAULT 0;

-- Auditoria detalhada: uma linha por oferta verificada em cada execução,
-- inclusive sucessos, "sem alteração", falhas e revisões manuais.
-- Nunca contém cookie, cabeçalhos HTTP ou qualquer token.
CREATE TABLE IF NOT EXISTS public.offer_monitoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id),
  checked_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL,                 -- atualizar_preco | sem_alteracao | revisao_manual | indisponivel | falha_temporaria
  product_title text,                    -- products.title cadastrado (o que deveria estar na página)
  page_title text,                       -- título detectado de fato na página (h1 / json-ld / og:title)
  public_url text,
  stored_current_price numeric,          -- preço que já estava salvo em offers.current_price
  detected_current_price numeric,        -- preço detectado nesta checagem (se houver)
  detected_original_price numeric,       -- preço "de" detectado nesta checagem (se houver)
  price_source text,                     -- json-ld | container-principal | json-ld+container-principal | divergencia
  parser_version text,
  reason text,                           -- motivo legível (por que bloqueou, por que falhou, etc.)
  http_status integer
);

CREATE INDEX IF NOT EXISTS offer_monitoring_logs_offer_id_idx
  ON public.offer_monitoring_logs (offer_id);

CREATE INDEX IF NOT EXISTS offer_monitoring_logs_checked_at_idx
  ON public.offer_monitoring_logs (checked_at);
