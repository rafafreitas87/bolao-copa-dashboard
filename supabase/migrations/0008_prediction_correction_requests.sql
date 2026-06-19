create type public.correction_request_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create table public.prediction_correction_requests (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  prediction_id uuid references public.predictions(id) on delete set null,
  match_id uuid not null references public.matches(id) on delete cascade,
  current_score_a int,
  current_score_b int,
  requested_score_a int not null,
  requested_score_b int not null,
  requester_name text,
  note text,
  status public.correction_request_status not null default 'PENDING',
  reviewed_by_user_id uuid references public.profiles(id),
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_prediction_correction_requests_status
on public.prediction_correction_requests(status);

create index idx_prediction_correction_requests_participant
on public.prediction_correction_requests(participant_id);

create index idx_prediction_correction_requests_match
on public.prediction_correction_requests(match_id);

alter table public.prediction_correction_requests enable row level security;

create policy "prediction_correction_requests_public_insert"
on public.prediction_correction_requests for insert
with check (true);

create policy "prediction_correction_requests_admin_all"
on public.prediction_correction_requests for all
using (public.is_admin())
with check (public.is_admin());

insert into public.configs (key, value)
values ('correction_requests_enabled', 'false'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
