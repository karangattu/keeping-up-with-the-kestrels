-- Keep only the best score for each player name within each difficulty level.
with ranked_scores as (
  select
    id,
    row_number() over (
      partition by level, lower(btrim(player_name))
      order by score desc, created_at asc, id asc
    ) as rank
  from public.kestrel_high_scores
)
delete from public.kestrel_high_scores
where id in (
  select id
  from ranked_scores
  where rank > 1
);

-- Enforce one case-insensitive name per difficulty level going forward.
create unique index if not exists kestrel_high_scores_level_player_name_unique
on public.kestrel_high_scores (level, lower(btrim(player_name)));

-- Allow public clients to update an existing score row when a player beats their best.
create policy "Allow public update access"
on public.kestrel_high_scores for update
using (true)
with check (true);
