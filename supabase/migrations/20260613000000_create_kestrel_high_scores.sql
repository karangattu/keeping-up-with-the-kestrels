-- Create the kestrel_high_scores table
create table public.kestrel_high_scores (
  id bigint generated always as identity primary key,
  player_name text not null,
  score integer not null,
  level text not null,
  accuracy integer not null default 0,
  total_counted integer not null default 0,
  total_actual integer not null default 0,
  kestrel_count integer not null default 0,
  coopers_hawk_count integer not null default 0,
  golden_eagle_count integer not null default 0,
  northern_harrier_count integer not null default 0,
  red_shouldered_hawk_count integer not null default 0,
  red_tailed_hawk_count integer not null default 0,
  turkey_vulture_count integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.kestrel_high_scores enable row level security;

-- Create policy that allows anyone to read scores
create policy "Allow public read access"
on public.kestrel_high_scores for select
using (true);

-- Create policy that allows anyone to insert new scores
create policy "Allow public insert access"
on public.kestrel_high_scores for insert
with check (true);

-- Enable real-time updates for the kestrel_high_scores table
alter publication supabase_realtime add table public.kestrel_high_scores;
