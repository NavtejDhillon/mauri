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
