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
