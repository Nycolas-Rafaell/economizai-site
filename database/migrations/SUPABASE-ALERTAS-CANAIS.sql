-- Execute uma única vez no Supabase: SQL Editor > New query > Run.
-- Guarda as preferências de entrega de cada alerta de preço.

alter table public.user_price_alerts
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_whatsapp boolean not null default false;

comment on column public.user_price_alerts.notify_email is 'Usuário quer receber a notificação por e-mail.';
comment on column public.user_price_alerts.notify_whatsapp is 'Usuário quer receber a notificação por WhatsApp quando a integração for configurada.';
