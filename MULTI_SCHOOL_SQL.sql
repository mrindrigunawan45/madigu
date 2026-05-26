-- =====================================
-- MULTI SCHOOL FOUNDATION
-- =====================================

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  nama_sekolah text not null,
  created_at timestamptz default now()
);

alter table profiles
add column if not exists school_id uuid references schools(id);

alter table jurnal
add column if not exists school_id uuid references schools(id);

alter table nilai
add column if not exists school_id uuid references schools(id);
