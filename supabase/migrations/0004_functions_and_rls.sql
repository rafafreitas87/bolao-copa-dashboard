create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'ADMIN'
  )
$$;

create or replace function public.prevent_last_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'ADMIN' and new.role <> 'ADMIN' then
    if (select count(*) from public.profiles where role = 'ADMIN' and id <> old.id) = 0 then
      raise exception 'Cannot remove the last ADMIN';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_prevent_last_admin_removal
before update of role on public.profiles
for each row
execute function public.prevent_last_admin_removal();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_participants_updated_at before update on public.participants for each row execute function public.set_updated_at();
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_teams_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger trg_matches_updated_at before update on public.matches for each row execute function public.set_updated_at();
create trigger trg_predictions_updated_at before update on public.predictions for each row execute function public.set_updated_at();
create trigger trg_import_templates_updated_at before update on public.import_templates for each row execute function public.set_updated_at();
create trigger trg_import_drafts_updated_at before update on public.import_drafts for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.participants enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.uploads enable row level security;
alter table public.import_templates enable row level security;
alter table public.import_drafts enable row level security;
alter table public.import_draft_rows enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_scores enable row level security;
alter table public.ranking_snapshots enable row level security;
alter table public.audit_logs enable row level security;
alter table public.configs enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_admin_write" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "participants_select_authenticated" on public.participants for select using (auth.role() = 'authenticated');
create policy "participants_admin_write" on public.participants for all using (public.is_admin()) with check (public.is_admin());

create policy "teams_select_authenticated" on public.teams for select using (auth.role() = 'authenticated');
create policy "teams_admin_write" on public.teams for all using (public.is_admin()) with check (public.is_admin());

create policy "matches_select_authenticated" on public.matches for select using (auth.role() = 'authenticated');
create policy "matches_admin_write" on public.matches for all using (public.is_admin()) with check (public.is_admin());

create policy "uploads_admin_all" on public.uploads for all using (public.is_admin()) with check (public.is_admin());
create policy "import_templates_admin_all" on public.import_templates for all using (public.is_admin()) with check (public.is_admin());
create policy "import_drafts_admin_all" on public.import_drafts for all using (public.is_admin()) with check (public.is_admin());
create policy "import_draft_rows_admin_all" on public.import_draft_rows for all using (public.is_admin()) with check (public.is_admin());

create policy "predictions_select_admin_or_own" on public.predictions for select using (
  public.is_admin()
  or participant_id = (select participant_id from public.profiles where id = auth.uid())
);
create policy "predictions_admin_write" on public.predictions for all using (public.is_admin()) with check (public.is_admin());

create policy "prediction_scores_select_authenticated" on public.prediction_scores for select using (auth.role() = 'authenticated');
create policy "prediction_scores_admin_write" on public.prediction_scores for all using (public.is_admin()) with check (public.is_admin());

create policy "ranking_snapshots_select_authenticated" on public.ranking_snapshots for select using (auth.role() = 'authenticated');
create policy "ranking_snapshots_admin_write" on public.ranking_snapshots for all using (public.is_admin()) with check (public.is_admin());

create policy "audit_logs_admin_select" on public.audit_logs for select using (public.is_admin());
create policy "audit_logs_admin_insert" on public.audit_logs for insert with check (public.is_admin());

create policy "configs_select_authenticated" on public.configs for select using (auth.role() = 'authenticated');
create policy "configs_admin_write" on public.configs for all using (public.is_admin()) with check (public.is_admin());
