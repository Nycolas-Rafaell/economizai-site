-- Execute uma vez no SQL Editor do Supabase, após SUPABASE-AUDITORIA-ADMIN.sql.

alter table public.admin_action_logs
  add column if not exists actor_name text;
