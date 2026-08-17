-- Execute uma vez no SQL Editor do Supabase.
-- Guarda dados públicos coletados para exibição nos cards e na página da oferta.

alter table public.products
  add column if not exists quantity_sold text,
  add column if not exists coupon_text text;
