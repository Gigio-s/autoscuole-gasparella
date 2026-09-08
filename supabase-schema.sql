-- ============================================================
-- Schema Supabase per le prenotazioni corsi Autoscuole Gasparella
-- Esegui questo file una volta sola:
--   Dashboard Supabase > SQL Editor > New query > incolla > Run
-- Crea un progetto in regione EU (Frankfurt) per la conformita' GDPR.
-- ============================================================

-- 1) Tabella prenotazioni --------------------------------------------------
create table if not exists public.prenotazioni (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  corso             text not null,
  nome              text not null,
  cognome           text not null,
  telefono          text not null,
  email             text not null,
  codice_fiscale    text not null,
  n_carta_identita  text not null,
  n_patente         text not null,
  extra_ue          boolean not null default false,
  n_permesso        text,
  sede              text,
  documenti         jsonb not null default '{}'::jsonb,  -- { "cf_fronte": "path", ... }
  stato             text not null default 'nuova',        -- nuova | gestita | annullata
  note              text
);

-- Indice per ordinare/filtrare le piu' recenti
create index if not exists prenotazioni_created_idx on public.prenotazioni (created_at desc);

-- RLS attiva SENZA policy pubbliche: solo la service_role key (lato server,
-- nelle Netlify Functions) puo' leggere/scrivere. Il browser non accede mai.
alter table public.prenotazioni enable row level security;

-- 2) Bucket storage privato per i documenti -------------------------------
insert into storage.buckets (id, name, public)
values ('documenti-corsi', 'documenti-corsi', false)
on conflict (id) do nothing;

-- Nessuna policy pubblica sullo storage: i file sono privati.
-- L'upload avviene con URL firmati generati lato server (service_role);
-- il download in segreteria avviene con URL firmati a scadenza.

-- ============================================================
-- GDPR / retention (promemoria operativo):
-- Cancellare periodicamente le prenotazioni e i documenti piu' vecchi
-- della retention decisa (es. 12 mesi). Esempio manuale da lanciare quando serve:
--
--   delete from public.prenotazioni where created_at < now() - interval '12 months';
--
-- (I file nello storage vanno rimossi a parte, vedi funzione di pulizia
--  o cancellazione manuale dal bucket.)
-- ============================================================
