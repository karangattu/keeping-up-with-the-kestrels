-- Separate table so old app versions cannot read or overwrite new grades.
-- Keep the original leaderboard intact for older installs.
create table public.kestrel_high_scores_v2 (
  id bigint generated always as identity primary key,
  player_name text not null check (char_length(player_name) between 1 and 15),
  score integer not null check (score between 0 and 6000),
  level text not null check (level in ('beginner', 'expert')),
  accuracy integer not null default 0 check (accuracy between 0 and 100),
  total_counted integer not null default 0 check (total_counted between 0 and 300),
  total_actual integer not null default 0 check (total_actual between 0 and 300),
  kestrel_count integer not null default 0 check (kestrel_count >= 0),
  coopers_hawk_count integer not null default 0 check (coopers_hawk_count >= 0),
  golden_eagle_count integer not null default 0 check (golden_eagle_count >= 0),
  northern_harrier_count integer not null default 0 check (northern_harrier_count >= 0),
  red_shouldered_hawk_count integer not null default 0 check (red_shouldered_hawk_count >= 0),
  red_tailed_hawk_count integer not null default 0 check (red_tailed_hawk_count >= 0),
  turkey_vulture_count integer not null default 0 check (turkey_vulture_count >= 0),
  bald_eagle_count integer not null default 0 check (bald_eagle_count >= 0),
  white_tailed_kite_count integer not null default 0 check (white_tailed_kite_count >= 0),
  osprey_count integer not null default 0 check (osprey_count >= 0),
  created_at timestamptz not null default now()
);

create unique index kestrel_high_scores_v2_level_player_name_unique
  on public.kestrel_high_scores_v2 (level, lower(btrim(player_name)));
create index kestrel_high_scores_v2_ranking
  on public.kestrel_high_scores_v2 (level, score desc, created_at);

alter table public.kestrel_high_scores_v2 enable row level security;
create policy "Allow public read access" on public.kestrel_high_scores_v2
  for select to anon, authenticated using (true);
create policy "Allow public insert access" on public.kestrel_high_scores_v2
  for insert to anon, authenticated with check (true);
create policy "Allow public update access" on public.kestrel_high_scores_v2
  for update to anon, authenticated using (true) with check (true);

grant select, insert, update on public.kestrel_high_scores_v2 to anon, authenticated;
grant usage, select on sequence public.kestrel_high_scores_v2_id_seq to anon, authenticated;
alter publication supabase_realtime add table public.kestrel_high_scores_v2;
