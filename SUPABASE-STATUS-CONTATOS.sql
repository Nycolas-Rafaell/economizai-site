-- Execute uma vez no SQL Editor do Supabase.
-- Troca o antigo estado "read" por "refused" (Recusada).

update public.contact_messages set status = 'refused' where status = 'read';

alter table public.contact_messages
  drop constraint if exists contact_messages_status_check;

alter table public.contact_messages
  add constraint contact_messages_status_check
  check (status in ('new', 'refused', 'answered', 'archived'));
