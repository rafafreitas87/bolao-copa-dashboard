create table public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role public.user_role not null default 'PARTICIPANT',
  participant_id uuid unique references public.participants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text not null,
  code text not null unique,
  flag_url text,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_date date not null,
  match_time time,
  kickoff_utc timestamptz,
  group_name text,
  round text,
  team_a_id uuid not null references public.teams(id),
  team_b_id uuid not null references public.teams(id),
  stadium text,
  city text,
  host_country text,
  official_score_a int,
  official_score_b int,
  status public.match_status not null default 'PENDING',
  display_order int not null,
  source_match_number int unique,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_distinct_teams check (team_a_id <> team_b_id),
  constraint official_scores_together check (
    (official_score_a is null and official_score_b is null)
    or
    (official_score_a is not null and official_score_b is not null)
  )
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  uploaded_by_user_id uuid not null references public.profiles(id),
  file_name text not null,
  file_type public.upload_file_type not null,
  storage_path text not null,
  file_url text,
  status public.upload_status not null default 'UPLOADED',
  raw_extracted_text text,
  parse_result_json jsonb,
  error_message text,
  uploaded_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by_user_id uuid references public.profiles(id)
);

create table public.import_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_type public.upload_file_type not null,
  mapping_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_drafts (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  status public.import_draft_status not null default 'DRAFT',
  selected_sheet_name text,
  mapping_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_draft_rows (
  id uuid primary key default gen_random_uuid(),
  import_draft_id uuid not null references public.import_drafts(id) on delete cascade,
  row_number int not null,
  raw_json jsonb not null,
  detected_team_a text,
  detected_team_b text,
  detected_score_a int,
  detected_score_b int,
  matched_match_id uuid references public.matches(id),
  confidence numeric,
  status public.import_row_status not null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_score_a int not null,
  predicted_score_b int not null,
  source_file_name text,
  source_upload_id uuid references public.uploads(id),
  confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, match_id)
);

create table public.prediction_scores (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null unique references public.predictions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  points int not null default 0,
  exact_score boolean not null default false,
  correct_outcome boolean not null default false,
  wrong boolean not null default false,
  calculated_at timestamptz not null default now()
);

create table public.ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  participant_id uuid not null references public.participants(id) on delete cascade,
  position int not null,
  total_points int not null default 0,
  exact_scores int not null default 0,
  correct_outcomes int not null default 0,
  wrong_predictions int not null default 0,
  total_predictions int not null default 0,
  points_behind_leader int not null default 0,
  position_change int,
  calculated_at timestamptz not null default now(),
  unique (snapshot_date, participant_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value_json jsonb,
  new_value_json jsonb,
  created_at timestamptz not null default now()
);

create table public.configs (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
