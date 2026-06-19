insert into public.configs (key, value)
values
  ('pool_name', '"Bolao Copa 2026"'::jsonb),
  ('participants_can_view_others_predictions', 'false'::jsonb),
  ('exact_score_points', '3'::jsonb),
  ('correct_outcome_points', '1'::jsonb),
  ('main_chart_participant_limit', '10'::jsonb),
  ('participant_import_enabled', 'false'::jsonb),
  ('correction_requests_enabled', 'false'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
