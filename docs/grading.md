# Observation grading (version 2)

Beginner awards 10 points per correct observation. Expert awards 20.
For each species, points are `(actual - abs(counted - actual)) × points per observation`.
The round total is the sum across all species, with a minimum of zero.

For example, three kestrels counted correctly earn 30 Beginner points.
Counting two or four earns 20. Counting none earns zero.
An extra bird of a species that never appeared subtracts 10 points.
Streaks still appear during play, but do not add points to the final grade.
The maximum score is the total actual observations times the mode's point value.

## Fresh leaderboard

The new app reads and writes `kestrel_high_scores_v2`. Its local leaderboard
cache and offline score queue also use version 2 keys. Earlier scores are
retired from this leaderboard, including scores still waiting to sync.
The original table remains available to older installs; those apps cannot
read or overwrite the new leaderboard.

Before publishing the new app, run
`supabase/migrations/20261102000000_create_observation_grading_leaderboard.sql`
in the game's Supabase SQL editor. It creates the separate table, public
read/write policies, per-mode unique player names, ranking index, and realtime
subscription. It does not delete any existing scores.
