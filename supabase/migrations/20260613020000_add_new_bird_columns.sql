-- Add the raptor species introduced after the initial table was created.
-- Guarded with IF NOT EXISTS so it is safe to re-run on existing databases.

alter table public.kestrel_high_scores
  add column if not exists bald_eagle_count integer not null default 0,
  add column if not exists white_tailed_kite_count integer not null default 0,
  add column if not exists osprey_count integer not null default 0;
