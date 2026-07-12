-- Leaderboard integrity: reject absurd or malformed rows at the database.
-- These are defenses against client tampering and accidental bad writes.
-- Runs after the add_new_bird_columns migration so every count column exists.

alter table public.kestrel_high_scores
  add constraint kestrel_high_scores_score_range
    check (score >= 0 and score <= 1000),
  add constraint kestrel_high_scores_accuracy_range
    check (accuracy >= 0 and accuracy <= 100),
  add constraint kestrel_high_scores_level_values
    check (level in ('beginner', 'expert')),
  add constraint kestrel_high_scores_name_length
    check (char_length(player_name) >= 1 and char_length(player_name) <= 15),
  add constraint kestrel_high_scores_total_counted_range
    check (total_counted >= 0 and total_counted <= 300),
  add constraint kestrel_high_scores_total_actual_range
    check (total_actual >= 0 and total_actual <= 300),
  add constraint kestrel_high_scores_kestrel_count_min
    check (kestrel_count >= 0),
  add constraint kestrel_high_scores_coopers_hawk_count_min
    check (coopers_hawk_count >= 0),
  add constraint kestrel_high_scores_golden_eagle_count_min
    check (golden_eagle_count >= 0),
  add constraint kestrel_high_scores_northern_harrier_count_min
    check (northern_harrier_count >= 0),
  add constraint kestrel_high_scores_red_shouldered_hawk_count_min
    check (red_shouldered_hawk_count >= 0),
  add constraint kestrel_high_scores_red_tailed_hawk_count_min
    check (red_tailed_hawk_count >= 0),
  add constraint kestrel_high_scores_turkey_vulture_count_min
    check (turkey_vulture_count >= 0),
  add constraint kestrel_high_scores_bald_eagle_count_min
    check (bald_eagle_count >= 0),
  add constraint kestrel_high_scores_white_tailed_kite_count_min
    check (white_tailed_kite_count >= 0),
  add constraint kestrel_high_scores_osprey_count_min
    check (osprey_count >= 0);
