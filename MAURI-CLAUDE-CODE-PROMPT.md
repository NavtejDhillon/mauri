# Mauri - Maternity Practice Management System

## Project overview

Build a Progressive Web App (PWA) called "Mauri" (te reo Maori for life force/vitality) that replaces Expect Maternity as the practice management system for LMC (Lead Maternity Carer) midwives in New Zealand. The primary user is a solo LMC midwife on the West Coast, South Island, operating in a rural environment with intermittent connectivity.

This prompt covers Phase 1 (foundation) and Phase 2 (clinical completion). Build incrementally, committing working code at each milestone.

## Tech stack

- **Framework**: Next.js 14+ (App Router) with TypeScript, strict mode
- **Styling**: Tailwind CSS 3.4+ with a custom design system (details below)
- **PWA**: next-pwa with Workbox for service worker, Dexie.js for IndexedDB
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime, Storage)
- **AI inference**: AWS Bedrock Sydney (ap-southeast-2) via @aws-sdk/client-bedrock-runtime, Claude Sonnet model
- **De-identification**: Supabase Edge Functions (Deno) as privacy gateway
- **Auth**: Supabase Auth with email + TOTP MFA
- **Deployment**: Vercel
- **Package manager**: pnpm

## Project structure

```
mauri/
  src/
    app/
      (auth)/
        login/page.tsx
        setup-mfa/page.tsx
      (app)/
        layout.tsx              # Authenticated shell with sidebar
        dashboard/page.tsx
        clients/
          page.tsx              # Client list
          [id]/
            page.tsx            # Client detail (tabbed: overview, visits, history, claims, documents)
            visits/
              new-antenatal/page.tsx
              new-postnatal/page.tsx
              [visitId]/page.tsx
            labour-birth/page.tsx
        calendar/page.tsx
        claims/page.tsx
        financials/page.tsx
        prescriptions/page.tsx
        settings/page.tsx
      layout.tsx
      page.tsx                  # Redirect to dashboard or login
    components/
      ui/                       # Design system primitives
        badge.tsx
        button.tsx
        card.tsx
        input.tsx
        select.tsx
        textarea.tsx
        avatar.tsx
        metric-card.tsx
        modal.tsx
        toast.tsx
        sidebar.tsx
        calendar-mini.tsx
      clinical/                 # Domain-specific components
        gestation-badge.tsx     # Shows "32+4" with color coding by trimester
        bp-display.tsx          # Blood pressure with alert coloring
        visit-form.tsx          # Reusable AN/PN visit form
        client-row.tsx          # Client list row
        visit-timeline.tsx      # Chronological visit display
        edd-calculator.tsx      # EDD wheel / gestation calculator
        risk-indicator.tsx      # Risk level badge with tooltip
      ai/
        tautoko-panel.tsx       # AI assistant slide-over panel
        ai-insight-card.tsx     # Dashboard insight cards
        agent-context.tsx       # React context for agent state
    lib/
      supabase/
        client.ts               # Browser Supabase client
        server.ts               # Server-side Supabase client
        middleware.ts            # Auth middleware
        types.ts                # Generated database types
      db/
        schema.ts               # Dexie.js IndexedDB schema
        sync.ts                 # Sync engine (IndexedDB <-> Supabase)
        offline-queue.ts        # Mutation queue for offline changes
      ai/
        deid.ts                 # De-identification utilities (client-side preview)
        agents.ts               # Agent type definitions and routing
        bedrock.ts              # Bedrock client wrapper
      clinical/
        gestation.ts            # Gestation calculation utilities
        claiming.ts             # Section 94 claim calculation engine
        alerts.ts               # Clinical alert rules
        rpats.ts                # RPaTS distance/travel calculator
      utils/
        date.ts
        format.ts
        validation.ts
    hooks/
      use-online-status.ts
      use-sync.ts
      use-client.ts             # CRUD hooks for client records
      use-visits.ts
      use-claims.ts
      use-agent.ts              # AI agent interaction hook
    styles/
      globals.css               # Tailwind base + custom properties
  supabase/
    migrations/
      001_initial_schema.sql
      002_rls_policies.sql
      003_ai_privacy.sql
    functions/
      deid-proxy/index.ts       # De-identification Edge Function
      reid-proxy/index.ts       # Re-identification Edge Function
      sync-handler/index.ts     # Sync conflict resolution
  public/
    manifest.json
    sw.js
    icons/
  tailwind.config.ts
  next.config.js
```

## Design system

The UI should feel warm, organic, and premium. Not clinical blue/white. Think Linear meets a wellness app. Avoid generic SaaS aesthetics.

### Color palette (Tailwind config)

```typescript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f0f4ef',
          100: '#dce5d8',
          200: '#b8cbb1',
          300: '#94b18a',
          400: '#7a9e6e',
          500: '#5d8350',
          600: '#4a7040',
          700: '#3a5932',
          800: '#2d4a26',
          900: '#1a2d17',
        },
        warm: {
          50: '#faf8f5',
          100: '#f0ebe3',
          200: '#e5ddd1',
          300: '#d4c8b8',
          400: '#b8a894',
          500: '#9c8e7a',
          600: '#8a7a6a',
          700: '#6b5f52',
          800: '#504840',
          900: '#383028',
        },
        coral: {
          50: '#fef0ec',
          100: '#fcd5ca',
          200: '#f9b0a0',
          400: '#e87756',
          600: '#c45535',
          800: '#7a2e1a',
        },
        sky: {
          50: '#eef6fb',
          100: '#c8e2f4',
          400: '#4a9ed6',
          600: '#2874a6',
          800: '#14476a',
        },
        plum: {
          50: '#f4eef6',
          100: '#dcc8e4',
          400: '#9b6bb0',
          600: '#6d3f85',
          800: '#3e2050',
        },
      },
      fontFamily: {
        sans: ['Instrument Sans', 'DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
      },
    },
  },
};
```

### Design principles

- Background: warm-50 for page, white for cards
- Borders: 1px warm-200, rounded-lg (14px) for cards
- Text: sage-900 for headings, warm-800 for body, warm-400 for muted/labels
- Sidebar: white background, sage-50 for active nav items, sage-600 for active text
- Font sizes: 26px page titles, 15px section headers, 14px body, 12px labels/captions, 11px badges
- Letter spacing: -0.02em on headings, 0.05em uppercase on labels
- Metric cards: warm-50 background, no border, 14px rounded
- Clinical data (BP, FHR, times): use font-mono
- Badges: pill-shaped (rounded-full), color-50 background with color-800 text and color-100 border
- AI elements: plum palette for AI-generated content, with a subtle left border accent
- Status colors: sage for active/healthy, coral for alerts/overdue, sky for postnatal/info, warm for discharged/neutral
- No shadows anywhere. Flat, clean surfaces with subtle borders.
- Transitions: 150ms for hover states, 200ms for panel slides

### Key UI patterns

**Sidebar navigation**: Fixed left sidebar (240px) with app logo ("M" in sage-600 rounded square), nav items with emoji icons, AI assistant button at bottom, sync status indicator at very bottom.

**Dashboard layout**: Greeting with name and date, 4 metric cards in a row, two-column grid (AI insights left, calendar + today's visits right), full-width client list below.

**Client detail**: Back button, avatar + name + EDD/gestation + risk badge, quick action buttons row, tabbed content (Overview, Visits, History, Claims, Documents). Overview shows two-column grid: clinical summary table on left, AI care summary on right.

**AI panel (Tautoko)**: Slide-over panel from the right (380px), chat interface with message bubbles, quick suggestion chips at bottom, thinking indicator (three pulsing dots).

**Visit forms**: Full-page forms with grouped sections. Clinical fields use appropriate input types (number for BP, select for presentation). Notes field is a large textarea. After-hours toggle, duration field, interpreter toggle. Save works offline.

## Database schema

### Supabase migration 001_initial_schema.sql

```sql
-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Practitioner (the midwife)
create table practitioner (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) unique not null,
  nzmc_id text not null,
  hpi_cpn text,
  name text not null,
  email text not null,
  phone text,
  practice_name text,
  practice_address text,
  practice_lat numeric,
  practice_lng numeric,
  bank_account text,
  claiming_authority_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Client (the pregnant woman / new mother)
create table client (
  id uuid primary key default uuid_generate_v4(),
  practitioner_id uuid references practitioner(id) not null,
  nhi text,
  first_name text not null,
  last_name text not null,
  preferred_name text,
  date_of_birth date,
  address_line_1 text,
  address_line_2 text,
  city text,
  postcode text,
  lat numeric,
  lng numeric,
  phone text,
  email text,
  ethnicity text[],
  iwi_affiliation text,
  language text default 'English',
  interpreter_required boolean default false,
  gp_name text,
  gp_practice text,
  gp_phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version bigint default 1
);

-- Registration (one per pregnancy, links client to LMC)
create table registration (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references client(id) not null,
  practitioner_id uuid references practitioner(id) not null,
  registration_date date not null,
  agreed_edd date not null,
  edd_method text check (edd_method in ('lmp', 'ultrasound', 'clinical')),
  registration_gestation_weeks integer,
  registration_gestation_days integer,
  gravida integer,
  parity integer,
  transfer_in_from text,
  transfer_in_date date,
  transfer_out_to text,
  transfer_out_date date,
  status text not null default 'active' check (status in ('active', 'postnatal', 'discharged', 'transferred')),
  discharge_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version bigint default 1
);

-- Maternal history
create table maternal_history (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references client(id) not null,
  previous_pregnancies jsonb default '[]',
  medical_conditions text[],
  surgical_history text[],
  current_medications text[],
  allergies text[],
  blood_group text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null)),
  rhesus text check (rhesus in ('positive', 'negative', 'unknown', null)),
  height_cm numeric,
  weight_kg numeric,
  bmi numeric generated always as (
    case when height_cm > 0 and weight_kg > 0
    then round((weight_kg / ((height_cm/100) * (height_cm/100)))::numeric, 1)
    else null end
  ) stored,
  smoking_status text check (smoking_status in ('never', 'former', 'current', null)),
  cigarettes_per_day integer,
  alcohol_use text check (alcohol_use in ('none', 'occasional', 'regular', null)),
  substance_use text,
  mental_health_history text,
  family_history text,
  gbs_status text check (gbs_status in ('positive', 'negative', 'not_tested', null)),
  rubella_immune boolean,
  hep_b_status text,
  hiv_status text,
  blood_count_results jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sync_version bigint default 1
);

-- Antenatal visit
create table antenatal_visit (
  id uuid primary key default uuid_generate_v4(),
  registration_id uuid references registration(id) not null,
  practitioner_id uuid references practitioner(id) not null,
  visit_date date not null,
  visit_time time,
  gestation_weeks integer,
  gestation_days integer,
  location text,
  visit_type text default 'routine' check (visit_type in ('routine', 'follow_up', 'urgent', 'phone', 'video')),
  bp_systolic integer,
  bp_diastolic integer,
  pulse integer,
  temperature numeric,
  weight_kg numeric,
  fundal_height_cm numeric,
  presentation text check (presentation in ('cephalic', 'breech', 'transverse', 'oblique', 'unstable', 'not_assessed', null)),
  position text,
  engagement text,
  fetal_heart_rate integer,
  fetal_movements text check (fetal_movements in ('normal', 'reduced', 'not_assessed', null)),
  urine_protein text check (urine_protein in ('nil', 'trace', '+', '++', '+++', 'not_tested', null)),
  urine_glucose text check (urine_glucose in ('nil', 'trace', '+', '++', '+++', 'not_tested', null)),
  oedema text check (oedema in ('nil', 'mild', 'moderate', 'severe', 'not_assessed', null)),
  hb_result numeric,
  blood_tests_ordered text[],
  ultrasound_ordered boolean default false,
  referrals_made text[],
  topics_discussed text[],
  plan text,
  notes text,
  after_hours boolean default false,
  duration_minutes integer,
  interpreter_present boolean default false,
  next_visit_date date,
  next_visit_gestation text,
  midwife_signature boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version bigint default 1
);

-- Postnatal visit
create table postnatal_visit (
  id uuid primary key default uuid_generate_v4(),
  registration_id uuid references registration(id) not null,
  practitioner_id uuid references practitioner(id) not null,
  visit_date date not null,
  visit_time time,
  baby_age_days integer,
  location text,
  visit_type text default 'routine' check (visit_type in ('routine', 'follow_up', 'urgent', 'phone', 'video')),
  -- Maternal observations
  maternal_bp_systolic integer,
  maternal_bp_diastolic integer,
  maternal_pulse integer,
  maternal_temperature numeric,
  lochia text check (lochia in ('normal', 'heavy', 'offensive', 'absent', null)),
  uterus text,
  perineum text,
  perineum_wound text check (perineum_wound in ('intact', 'healing', 'infected', 'dehisced', null)),
  breasts text,
  breastfeeding_assessment text,
  maternal_mood text,
  edinburgh_pnd_score integer,
  maternal_concerns text,
  -- Baby observations
  baby_weight_g integer,
  baby_weight_change text,
  feeding_type text check (feeding_type in ('exclusive_breast', 'predominantly_breast', 'mixed', 'artificial', null)),
  feeding_frequency text,
  feeding_concerns text,
  baby_skin_colour text,
  jaundice_assessment text check (jaundice_assessment in ('none', 'mild', 'moderate', 'severe', 'not_assessed', null)),
  cord text check (cord in ('intact', 'separating', 'separated', 'infected', null)),
  baby_bowels text,
  baby_urine text,
  hearing_test text check (hearing_test in ('pass', 'refer', 'not_done', null)),
  hearing_test_date date,
  newborn_metabolic_screen text check (newborn_metabolic_screen in ('done', 'not_done', 'declined', null)),
  newborn_metabolic_screen_date date,
  baby_hips text,
  red_eye_test text check (red_eye_test in ('normal', 'abnormal', 'not_done', null)),
  immunisations_discussed boolean default false,
  safe_sleep_discussed boolean default false,
  car_seat_discussed boolean default false,
  well_child_referral boolean default false,
  well_child_provider text,
  notes text,
  plan text,
  after_hours boolean default false,
  duration_minutes integer,
  interpreter_present boolean default false,
  next_visit_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version bigint default 1
);

-- Labour and birth
create table labour_birth (
  id uuid primary key default uuid_generate_v4(),
  registration_id uuid references registration(id) unique not null,
  practitioner_id uuid references practitioner(id) not null,
  -- Labour
  labour_onset_type text check (labour_onset_type in ('spontaneous', 'induced', 'no_labour', null)),
  labour_onset_datetime timestamptz,
  induction_method text,
  induction_indication text,
  membranes_ruptured_datetime timestamptz,
  membranes_rupture_type text check (membranes_rupture_type in ('spontaneous', 'artificial', null)),
  liquor_colour text check (liquor_colour in ('clear', 'meconium_light', 'meconium_heavy', 'blood_stained', null)),
  pain_relief text[],
  augmentation boolean default false,
  augmentation_method text,
  complications_labour text[],
  -- Birth
  birth_datetime timestamptz not null,
  birth_gestation_weeks integer,
  birth_gestation_days integer,
  birth_type text not null check (birth_type in ('normal_vaginal', 'assisted_vacuum', 'assisted_forceps', 'elective_caesarean', 'emergency_caesarean', 'breech_vaginal')),
  birth_position text,
  birth_location text not null,
  birth_location_type text check (birth_location_type in ('home', 'primary_unit', 'secondary_hospital', 'tertiary_hospital')),
  -- Perineum
  perineum_outcome text check (perineum_outcome in ('intact', 'first_degree', 'second_degree', 'third_degree', 'fourth_degree', 'episiotomy', 'graze')),
  episiotomy_type text,
  suturing text,
  -- Third stage
  placenta_delivery text check (placenta_delivery in ('physiological', 'active_management', 'manual_removal')),
  placenta_delivery_datetime timestamptz,
  placenta_complete boolean,
  blood_loss_ml integer,
  blood_loss_type text check (blood_loss_type in ('normal', 'pph_minor', 'pph_major')),
  -- Baby
  baby_gender text check (baby_gender in ('male', 'female', 'indeterminate')),
  baby_weight_g integer not null,
  baby_length_cm numeric,
  baby_head_circumference_cm numeric,
  apgar_1 integer,
  apgar_5 integer,
  apgar_10 integer,
  resuscitation text[],
  baby_nhi text,
  skin_to_skin boolean,
  skin_to_skin_duration_minutes integer,
  breastfeeding_initiated boolean,
  first_breastfeed_minutes integer,
  vitamin_k text check (vitamin_k in ('oral', 'im', 'declined')),
  cord_clamping text check (cord_clamping in ('delayed', 'immediate')),
  cord_blood_collected boolean default false,
  abnormalities_noted text,
  baby_admitted_nicu boolean default false,
  nicu_reason text,
  -- Practitioners present
  backup_lmc text,
  other_practitioners text[],
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sync_version bigint default 1
);

-- Appointments
create table appointment (
  id uuid primary key default uuid_generate_v4(),
  registration_id uuid references registration(id),
  practitioner_id uuid references practitioner(id) not null,
  client_id uuid references client(id),
  appointment_datetime timestamptz not null,
  duration_minutes integer default 30,
  location text,
  appointment_type text check (appointment_type in ('antenatal', 'postnatal', 'initial', 'follow_up', 'scan', 'bloods', 'admin', 'other')),
  status text default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,
  reminder_sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version bigint default 1
);

-- Section 94 claims
create table claim (
  id uuid primary key default uuid_generate_v4(),
  registration_id uuid references registration(id) not null,
  practitioner_id uuid references practitioner(id) not null,
  module_type text not null check (module_type in (
    'first_second_trimester', 'third_trimester',
    'labour_birth', 'postnatal',
    'acs_complex_social', 'acs_complex_clinical',
    'acs_additional_care', 'rpats'
  )),
  partial_type text default 'full' check (partial_type in ('full', 'first', 'last')),
  amount numeric not null,
  claim_date date,
  status text default 'draft' check (status in ('draft', 'ready', 'submitted', 'paid', 'rejected', 'queried')),
  submission_date date,
  payment_date date,
  payment_reference text,
  rejection_reason text,
  auto_calculated boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sync_version bigint default 1
);

-- Attachments (clinical documents, scans, photos)
create table attachment (
  id uuid primary key default uuid_generate_v4(),
  registration_id uuid references registration(id),
  client_id uuid references client(id),
  attachment_type text check (attachment_type in ('lab_result', 'ultrasound', 'referral', 'letter', 'photo', 'consent_form', 'other')),
  filename text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes integer,
  description text,
  uploaded_by uuid references practitioner(id),
  created_at timestamptz default now(),
  deleted_at timestamptz,
  sync_version bigint default 1
);

-- Indexes
create index idx_client_practitioner on client(practitioner_id) where deleted_at is null;
create index idx_client_nhi on client(nhi) where nhi is not null;
create index idx_registration_client on registration(client_id);
create index idx_registration_status on registration(status);
create index idx_antenatal_visit_registration on antenatal_visit(registration_id);
create index idx_antenatal_visit_date on antenatal_visit(visit_date desc);
create index idx_postnatal_visit_registration on postnatal_visit(registration_id);
create index idx_appointment_datetime on appointment(appointment_datetime);
create index idx_appointment_practitioner on appointment(practitioner_id);
create index idx_claim_registration on claim(registration_id);
create index idx_claim_status on claim(status);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.sync_version = old.sync_version + 1;
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on client for each row execute function update_updated_at();
create trigger set_updated_at before update on registration for each row execute function update_updated_at();
create trigger set_updated_at before update on maternal_history for each row execute function update_updated_at();
create trigger set_updated_at before update on antenatal_visit for each row execute function update_updated_at();
create trigger set_updated_at before update on postnatal_visit for each row execute function update_updated_at();
create trigger set_updated_at before update on labour_birth for each row execute function update_updated_at();
create trigger set_updated_at before update on appointment for each row execute function update_updated_at();
create trigger set_updated_at before update on claim for each row execute function update_updated_at();
```

### Supabase migration 002_rls_policies.sql

```sql
-- Enable RLS on all tables
alter table practitioner enable row level security;
alter table client enable row level security;
alter table registration enable row level security;
alter table maternal_history enable row level security;
alter table antenatal_visit enable row level security;
alter table postnatal_visit enable row level security;
alter table labour_birth enable row level security;
alter table appointment enable row level security;
alter table claim enable row level security;
alter table attachment enable row level security;

-- Practitioner can only see their own record
create policy "practitioner_own" on practitioner
  for all using (auth_user_id = auth.uid());

-- Client access: only the owning practitioner
create policy "client_own" on client
  for all using (practitioner_id in (
    select id from practitioner where auth_user_id = auth.uid()
  ));

-- Registration: practitioner who owns the registration
create policy "registration_own" on registration
  for all using (practitioner_id in (
    select id from practitioner where auth_user_id = auth.uid()
  ));

-- Visits: practitioner who owns them
create policy "antenatal_own" on antenatal_visit
  for all using (practitioner_id in (
    select id from practitioner where auth_user_id = auth.uid()
  ));

create policy "postnatal_own" on postnatal_visit
  for all using (practitioner_id in (
    select id from practitioner where auth_user_id = auth.uid()
  ));

create policy "labour_birth_own" on labour_birth
  for all using (practitioner_id in (
    select id from practitioner where auth_user_id = auth.uid()
  ));

-- Maternal history: via client ownership
create policy "maternal_history_own" on maternal_history
  for all using (client_id in (
    select id from client where practitioner_id in (
      select id from practitioner where auth_user_id = auth.uid()
    )
  ));

-- Appointments, claims, attachments: via practitioner ownership
create policy "appointment_own" on appointment
  for all using (practitioner_id in (
    select id from practitioner where auth_user_id = auth.uid()
  ));

create policy "claim_own" on claim
  for all using (practitioner_id in (
    select id from practitioner where auth_user_id = auth.uid()
  ));

create policy "attachment_own" on attachment
  for all using (uploaded_by in (
    select id from practitioner where auth_user_id = auth.uid()
  ));
```

### Supabase migration 003_ai_privacy.sql

```sql
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
```

## De-identification pipeline

### How it works

1. Client code prepares a request (e.g., "summarise this client's visit history for a referral letter")
2. The request includes clinical data from IndexedDB
3. Before sending to the AI, a Supabase Edge Function (`deid-proxy`):
   - Generates pseudonymous tokens (Client_1, Location_1, GP_1) for each unique identifier
   - Stores the token-to-real-ID mapping in `deid_token_map` (expires after 24h)
   - Strips: NHI, name, DOB (replaces with age), address (replaces with location token + rural/urban flag), phone, email, GP name (replaces with GP token), emergency contact
   - Preserves: all clinical data (BP, gestation, FHR, weights, scores, visit dates, notes with identifiers scrubbed)
   - Scans free-text notes for embedded identifiers using regex patterns (NHI format: 3 letters + 4 digits, NZ phone patterns, common name patterns adjacent to clinical terms)
4. Sends de-identified payload to AWS Bedrock Sydney (Claude Sonnet)
5. Receives response with pseudonymous tokens
6. Re-identification Edge Function (`reid-proxy`) maps tokens back to real identities
7. Returns fully identified response to the client

### Edge Function: deid-proxy

```typescript
// supabase/functions/deid-proxy/index.ts
// Key logic (implement fully):

interface DeIdRequest {
  agent_type: string;
  clinical_context: {
    client?: any;        // Will be de-identified
    registration?: any;
    visits?: any[];
    maternal_history?: any;
    labour_birth?: any;
  };
  prompt: string;
  practitioner_id: string;
}

// Fields to strip from client records
const CLIENT_PII_FIELDS = [
  'nhi', 'first_name', 'last_name', 'preferred_name',
  'date_of_birth', 'address_line_1', 'address_line_2',
  'city', 'postcode', 'phone', 'email',
  'gp_name', 'gp_practice', 'gp_phone',
  'emergency_contact_name', 'emergency_contact_phone',
  'emergency_contact_relationship'
];

// NHI pattern: 3 alpha + 4 numeric (e.g., ABC1234)
const NHI_REGEX = /\b[A-Z]{3}\d{4}\b/g;
// NZ phone patterns
const PHONE_REGEX = /\b(?:0[2-9]\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,4}|\+64[\s-]?\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,4})\b/g;

function scrubFreeText(text: string, tokenMap: Map<string, string>): string {
  let scrubbed = text;
  // Replace NHIs
  scrubbed = scrubbed.replace(NHI_REGEX, '[NHI_REDACTED]');
  // Replace phone numbers
  scrubbed = scrubbed.replace(PHONE_REGEX, '[PHONE_REDACTED]');
  // Replace known names from token map
  for (const [realName, token] of tokenMap) {
    const nameRegex = new RegExp(`\\b${escapeRegex(realName)}\\b`, 'gi');
    scrubbed = scrubbed.replace(nameRegex, token);
  }
  return scrubbed;
}
```

### Bedrock integration

```typescript
// src/lib/ai/bedrock.ts
// Call from Supabase Edge Function only, never from client

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: 'ap-southeast-2',  // Sydney
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
  },
});

export async function invokeAgent(
  systemPrompt: string,
  userMessage: string,
  model: string = 'anthropic.claude-sonnet-4-20250514-v1:0'
) {
  const command = new InvokeModelCommand({
    modelId: model,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.content[0].text;
}
```

## AI agent system prompts

Each agent has a focused system prompt. The orchestrator (Tautoko) routes user queries to the appropriate specialist agent.

### Orchestrator (Tautoko)

```
You are Tautoko, an AI practice assistant for a Lead Maternity Carer (LMC) midwife in New Zealand. You help with clinical record management, Section 94 claiming, scheduling, and practice administration.

You operate on de-identified data. Client names appear as tokens (Client_1, Client_2). Location names appear as tokens (Location_1). GP names appear as tokens (GP_1). Never attempt to guess or infer real identities from these tokens.

You have access to specialist agents:
- Clinical: visit note structuring, risk screening, care summaries
- Claims: Section 94 module calculation, RPaTS, ACS eligibility
- Schedule: appointment planning, route optimisation, visit reminders
- Safety: Edinburgh PND scoring, clinical red flags, overdue visit detection
- Correspondence: referral letters, transfer summaries, client communications
- Analytics: MSR reporting, outcome benchmarking, income forecasting

Route each query to the most appropriate agent. For multi-domain queries, synthesise responses from multiple agents.

Always respond in a warm, professional tone appropriate for a healthcare context. Use NZ English spelling. When discussing clinical matters, be precise and evidence-based. When you are uncertain, say so explicitly.
```

### Clinical notes agent

```
You are the clinical notes agent for an NZ LMC midwife practice management system. You help structure clinical observations into standardised visit records.

When given dictated or free-form clinical notes, extract and structure:
- Vital signs: BP (systolic/diastolic), pulse, temperature
- Obstetric observations: fundal height (cm), presentation, engagement, FHR
- Urinalysis: protein and glucose levels
- Fetal movements assessment
- Oedema assessment
- Weight
- Topics discussed, plan, referrals made

Flag any clinically significant findings:
- BP >= 140/90 (possible pre-eclampsia)
- Proteinuria with elevated BP
- Reduced fetal movements
- Fundal height discrepancy > 3cm from gestation
- FHR < 110 or > 160

Respond with structured JSON matching the antenatal_visit or postnatal_visit schema fields. All identifiers in the input are pseudonymous tokens. Do not attempt to identify individuals.
```

### Claims agent

```
You are the claims agent for an NZ LMC midwife practice. You calculate Section 94 (formerly Section 88) claiming entitlements under the Primary Maternity Services Notice 2021 (as amended 2022, 2023, and July 2024).

Given a registration's clinical data, calculate eligible claim modules:

FIRST & SECOND TRIMESTER MODULE:
- Full fee: LMC registered client before 17+0 weeks AND still LMC at 28+6 weeks
- First partial: Registered before 17+0 but transferred out before 28+6
- Last partial: Became LMC at 17+0 weeks or later

THIRD TRIMESTER MODULE:
- Full fee: LMC from 29+0 weeks through to birth
- First partial: LMC from 29+0 but transferred before birth
- Last partial: Became LMC after 29+0 weeks

LABOUR & BIRTH MODULE:
- Full fee for attendance at labour and/or birth
- Reduced fee for backup LMC attendance

POSTNATAL MODULE:
- Full fee: care from birth to discharge (4-6 weeks)
- Partial if transferred during postnatal period

ADDITIONAL CARE SUPPLEMENTS (ACS):
- Complex social needs
- Complex clinical needs
- Additional care requirements
- Criteria last updated July 2024

RURAL PRACTICE AND TRAVEL SUPPLEMENT (RPaTS):
- Based on distance between practice address and client address
- Calculate one-way travel distance in km
- Apply the gazetted distance bands and fee schedule

Always show your working. List each eligible module, the fee amount, and the clinical data that triggers eligibility. Flag any modules that may be partially claimable due to transfers.

All identifiers are pseudonymous. Distance calculations use abstract km values provided in the context.
```

## Offline-first sync engine

### IndexedDB schema (Dexie.js)

```typescript
// src/lib/db/schema.ts
import Dexie, { Table } from 'dexie';

export interface SyncableRecord {
  id: string;
  sync_version: number;
  updated_at: string;
  deleted_at?: string;
  _pending_sync?: boolean;
  _sync_action?: 'create' | 'update' | 'delete';
}

export class MauriDB extends Dexie {
  clients!: Table<Client & SyncableRecord>;
  registrations!: Table<Registration & SyncableRecord>;
  maternalHistories!: Table<MaternalHistory & SyncableRecord>;
  antenatalVisits!: Table<AntenatalVisit & SyncableRecord>;
  postnatalVisits!: Table<PostnatalVisit & SyncableRecord>;
  labourBirths!: Table<LabourBirth & SyncableRecord>;
  appointments!: Table<Appointment & SyncableRecord>;
  claims!: Table<Claim & SyncableRecord>;
  syncQueue!: Table<SyncQueueEntry>;
  syncState!: Table<SyncState>;

  constructor() {
    super('mauri');
    this.version(1).stores({
      clients: 'id, nhi, last_name, updated_at, _pending_sync',
      registrations: 'id, client_id, status, updated_at, _pending_sync',
      maternalHistories: 'id, client_id, updated_at',
      antenatalVisits: 'id, registration_id, visit_date, updated_at, _pending_sync',
      postnatalVisits: 'id, registration_id, visit_date, updated_at, _pending_sync',
      labourBirths: 'id, registration_id, updated_at',
      appointments: 'id, appointment_datetime, client_id, status, _pending_sync',
      claims: 'id, registration_id, status, updated_at, _pending_sync',
      syncQueue: '++seq, table, record_id, action, created_at',
      syncState: 'table',
    });
  }
}

export const db = new MauriDB();
```

### Sync engine logic

```typescript
// src/lib/db/sync.ts
// Key principles:
// 1. All writes go to IndexedDB first, then queue for Supabase sync
// 2. Reads always come from IndexedDB (offline-first)
// 3. Sync queue drains in order when online
// 4. Conflicts resolved at field level using updated_at timestamps
// 5. Soft deletes (deleted_at) propagate in both directions
// 6. Full pull sync on reconnection using sync_version watermarks

// On write:
// 1. Generate UUID client-side
// 2. Write to IndexedDB with _pending_sync = true
// 3. Add entry to syncQueue
// 4. If online, trigger immediate sync attempt

// On sync:
// 1. Read oldest entry from syncQueue
// 2. Attempt upsert to Supabase
// 3. If conflict (sync_version mismatch), do field-level merge
// 4. On success, update IndexedDB record (clear _pending_sync, update sync_version)
// 5. Remove syncQueue entry
// 6. Continue to next entry

// On reconnect:
// 1. Get last known sync_version per table from syncState
// 2. Pull all records from Supabase where sync_version > last_known
// 3. Merge into IndexedDB (field-level, server wins for non-pending records)
// 4. Update syncState watermarks
// 5. Drain syncQueue for any pending local changes
```

## Clinical utility functions

### Gestation calculator

```typescript
// src/lib/clinical/gestation.ts

export function calculateGestation(edd: Date, referenceDate: Date = new Date()): {
  weeks: number;
  days: number;
  totalDays: number;
  trimester: 1 | 2 | 3;
  display: string;  // "32+4"
} {
  const PREGNANCY_DURATION_DAYS = 280; // 40 weeks
  const eddTime = edd.getTime();
  const refTime = referenceDate.getTime();
  const daysToEdd = Math.floor((eddTime - refTime) / (1000 * 60 * 60 * 24));
  const totalDays = PREGNANCY_DURATION_DAYS - daysToEdd;

  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const trimester = weeks < 14 ? 1 : weeks < 28 ? 2 : 3;

  return {
    weeks,
    days,
    totalDays,
    trimester,
    display: `${weeks}+${days}`,
  };
}

export function eddFromLmp(lmp: Date): Date {
  const edd = new Date(lmp);
  edd.setDate(edd.getDate() + 280);
  return edd;
}

export function isTermRange(weeks: number, days: number): boolean {
  const total = weeks * 7 + days;
  return total >= 259 && total <= 293; // 37+0 to 41+6
}
```

## PWA configuration

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
      },
    },
  ],
});

module.exports = withPWA({
  // Next.js config
});
```

```json
// public/manifest.json
{
  "name": "Mauri - Maternity Practice",
  "short_name": "Mauri",
  "description": "Maternity practice management for NZ midwives",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#faf8f5",
  "theme_color": "#4a7040",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Build milestones (do them in order)

### Milestone 1: Project scaffold and auth
1. Initialize Next.js project with TypeScript, Tailwind, pnpm
2. Configure Tailwind with the custom color palette and fonts
3. Set up Supabase client (browser + server)
4. Implement login page with Supabase Auth (email/password)
5. Add MFA setup flow (TOTP)
6. Create auth middleware that redirects unauthenticated users
7. Build the app shell layout with sidebar navigation
8. Add online/offline status indicator using navigator.onLine + Supabase Realtime connection state

### Milestone 2: Database and offline layer
1. Run all three Supabase migrations
2. Generate TypeScript types from Supabase schema
3. Set up Dexie.js with the IndexedDB schema
4. Build the sync engine (write-to-local-first, queue, drain)
5. Build the pull sync (reconnection watermark-based)
6. Add the useOnlineStatus hook
7. Add the useSync hook (exposes sync state, last synced timestamp, pending count)

### Milestone 3: Client management
1. Build the client list page with search, filter by status
2. Build the new client form (demographics, contact, GP details, emergency contact)
3. Build the client detail page with tabbed layout
4. Build the registration form (EDD, method, gravida, parity)
5. Build the maternal history form
6. Implement the gestation calculator and display badge
7. Wire all forms to IndexedDB with sync queue

### Milestone 4: Clinical records
1. Build the antenatal visit form with all clinical fields
2. Build the postnatal visit form with maternal and baby observations
3. Build the labour and birth form
4. Build the visit timeline component (chronological list of all visits)
5. Build the clinical summary card (key stats extracted from latest visit data)
6. Add clinical alert rules (BP thresholds, overdue visits, reduced movements)
7. Add the risk indicator badge component

### Milestone 5: Calendar and appointments
1. Build the calendar page with day/week/month views
2. Build appointment creation and editing
3. Wire appointments to client registrations
4. Build the mini calendar component for the dashboard
5. Build the "today's visits" card for the dashboard
6. Add next visit date tracking to visit forms

### Milestone 6: Dashboard
1. Assemble the dashboard with all components:
   - Greeting with practitioner name and date
   - 4 metric cards (active clients, this week's visits, pending claims amount, RPaTS this month)
   - AI insights section (placeholder cards, will be wired to agents later)
   - Mini calendar
   - Today's visits
   - Client list (sorted by next visit due)
2. Compute metrics from IndexedDB data

### Milestone 7: AI agent layer
1. Build the de-identification Edge Function (deid-proxy)
2. Build the re-identification Edge Function (reid-proxy)
3. Build the Bedrock client wrapper
4. Implement the Tautoko panel UI (slide-over chat)
5. Wire the orchestrator agent with routing logic
6. Implement the clinical notes agent (dictation to structured data)
7. Implement the claims agent (auto-calculate Section 94 modules from registration data)
8. Implement the safety screening agent (Edinburgh PND auto-score, clinical red flags, overdue visit detection)
9. Build the AI insight cards on the dashboard (proactive alerts from safety + claims agents)
10. Add the ai_consent tracking per client

### Milestone 8: Claims engine
1. Build the Section 94 claiming calculation engine (pure TypeScript, no AI needed for this)
2. Implement each module's eligibility rules from the clinical data
3. Build the claims list page showing all registrations with their claimable modules
4. Build claim status tracking (draft, ready, submitted, paid)
5. Build RPaTS calculation using practice/client location distance
6. Build the claims summary dashboard card

## Important constraints

- Never use em dashes (--) in any output, comments, or UI text. Use a single hyphen or rephrase.
- Use NZ English spelling throughout (colour, organise, practise as verb, licence as noun)
- All dates should display as "DD Mon YYYY" (e.g., "17 Mar 2026") in the UI
- Gestation displays as "32+4" (weeks+days)
- Currency displays as NZD with $ symbol, no cents for whole dollars
- The app must work fully offline after initial install. Every read comes from IndexedDB. Every write goes to IndexedDB first.
- Do not use any em-dash character (U+2014) or en-dash (U+2013) anywhere in the codebase
- Supabase project ref: create a new project in AU region for this. Do not reuse existing projects.
- The de-identification pipeline is not optional. No identifiable health information may be sent to AWS Bedrock or any AI API.
- Google Fonts: load Instrument Sans (400, 500, 600, 700) via next/font/google
