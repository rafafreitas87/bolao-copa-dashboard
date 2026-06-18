create unique index if not exists participants_display_name_unique
on public.participants (display_name);

drop policy if exists "participants_select_authenticated" on public.participants;
drop policy if exists "teams_select_authenticated" on public.teams;
drop policy if exists "matches_select_authenticated" on public.matches;
drop policy if exists "prediction_scores_select_authenticated" on public.prediction_scores;
drop policy if exists "ranking_snapshots_select_authenticated" on public.ranking_snapshots;
drop policy if exists "configs_select_authenticated" on public.configs;
drop policy if exists "predictions_select_admin_or_own" on public.predictions;

create policy "participants_public_read"
on public.participants for select
using (true);

create policy "teams_public_read"
on public.teams for select
using (true);

create policy "matches_public_read"
on public.matches for select
using (true);

create policy "predictions_public_read"
on public.predictions for select
using (true);

create policy "prediction_scores_public_read"
on public.prediction_scores for select
using (true);

create policy "ranking_snapshots_public_read"
on public.ranking_snapshots for select
using (true);

create policy "configs_public_read"
on public.configs for select
using (true);
