-- De-identification token map (never leaves Supabase)
create table deid_token_map (
  id uuid primary key default uuid_generate_v4(),
  practitioner_id uuid references practitioner(id) not null,
  token text not null,
  entity_type text not null check (entity_type in ('client', 'location', 'gp', 'practitioner', 'facility')),
  real_entity_id uuid not null,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '24 hours',
  unique(practitioner_id, token)
);

-- AI request audit log (stores NO content, only metadata)
create table ai_request_log (
  id uuid primary key default uuid_generate_v4(),
  practitioner_id uuid references practitioner(id) not null,
  agent_type text not null check (agent_type in ('clinical', 'claims', 'schedule', 'safety', 'correspondence', 'analytics', 'orchestrator')),
  request_hash text not null,
  response_hash text not null,
  model_id text not null,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  bedrock_request_id text,
  created_at timestamptz default now()
);

-- Client consent for AI processing
create table ai_consent (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references client(id) not null,
  practitioner_id uuid references practitioner(id) not null,
  consent_type text not null check (consent_type in ('general_ai', 'clinical_screening', 'correspondence')),
  consented_at timestamptz not null default now(),
  consent_method text check (consent_method in ('verbal', 'written', 'digital')),
  withdrawn_at timestamptz,
  notes text,
  unique(client_id, consent_type) where withdrawn_at is null
);

-- RLS for AI tables
alter table deid_token_map enable row level security;
alter table ai_request_log enable row level security;
alter table ai_consent enable row level security;

create policy "deid_own" on deid_token_map
  for all using (practitioner_id in (
    select id from practitioner where auth_user_id = auth.uid()
  ));

create policy "ai_log_own" on ai_request_log
  for all using (practitioner_id in (
    select id from practitioner where auth_user_id = auth.uid()
  ));

create policy "ai_consent_own" on ai_consent
  for all using (practitioner_id in (
    select id from practitioner where auth_user_id = auth.uid()
  ));

-- Auto-expire old tokens
create index idx_deid_expires on deid_token_map(expires_at);
