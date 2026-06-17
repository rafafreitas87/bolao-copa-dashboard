create extension if not exists "pgcrypto";

create type public.user_role as enum ('ADMIN', 'PARTICIPANT');
create type public.match_status as enum ('PENDING', 'FINISHED', 'CANCELLED');
create type public.upload_file_type as enum ('PDF', 'XLS', 'XLSX');
create type public.upload_status as enum ('UPLOADED', 'PARSED', 'NEEDS_REVIEW', 'DRAFT', 'CONFIRMED', 'DISCARDED', 'ERROR');
create type public.import_draft_status as enum ('DRAFT', 'CONFIRMED', 'DISCARDED');
create type public.import_row_status as enum ('AUTO_DETECTED', 'NEEDS_CONFIRMATION', 'NOT_RECOGNIZED', 'ERROR', 'MANUALLY_CORRECTED');
