export interface Practitioner {
  id: string;
  auth_user_id: string;
  nzmc_id: string;
  hpi_cpn: string | null;
  name: string;
  email: string;
  phone: string | null;
  practice_name: string | null;
  practice_address: string | null;
  practice_lat: number | null;
  practice_lng: number | null;
  bank_account: string | null;
  claiming_authority_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  practitioner_id: string;
  nhi: string | null;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  ethnicity: string[] | null;
  iwi_affiliation: string | null;
  language: string;
  interpreter_required: boolean;
  gp_name: string | null;
  gp_practice: string | null;
  gp_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

export type EddMethod = "lmp" | "ultrasound" | "clinical";
export type RegistrationStatus = "active" | "postnatal" | "discharged" | "transferred";

export interface Registration {
  id: string;
  client_id: string;
  practitioner_id: string;
  registration_date: string;
  agreed_edd: string;
  edd_method: EddMethod | null;
  registration_gestation_weeks: number | null;
  registration_gestation_days: number | null;
  gravida: number | null;
  parity: number | null;
  transfer_in_from: string | null;
  transfer_in_date: string | null;
  transfer_out_to: string | null;
  transfer_out_date: string | null;
  status: RegistrationStatus;
  discharge_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type SmokingStatus = "never" | "former" | "current";
export type AlcoholUse = "none" | "occasional" | "regular";
export type GbsStatus = "positive" | "negative" | "not_tested";

export interface MaternalHistory {
  id: string;
  client_id: string;
  previous_pregnancies: unknown[];
  medical_conditions: string[] | null;
  surgical_history: string[] | null;
  current_medications: string[] | null;
  allergies: string[] | null;
  blood_group: BloodGroup | null;
  rhesus: "positive" | "negative" | "unknown" | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  smoking_status: SmokingStatus | null;
  cigarettes_per_day: number | null;
  alcohol_use: AlcoholUse | null;
  substance_use: string | null;
  mental_health_history: string | null;
  family_history: string | null;
  gbs_status: GbsStatus | null;
  rubella_immune: boolean | null;
  hep_b_status: string | null;
  hiv_status: string | null;
  blood_count_results: unknown | null;
  created_at: string;
  updated_at: string;
  sync_version: number;
}

export type VisitType = "routine" | "follow_up" | "urgent" | "phone" | "video";
export type Presentation = "cephalic" | "breech" | "transverse" | "oblique" | "unstable" | "not_assessed";
export type FetalMovements = "normal" | "reduced" | "not_assessed";
export type UrineResult = "nil" | "trace" | "+" | "++" | "+++" | "not_tested";
export type Oedema = "nil" | "mild" | "moderate" | "severe" | "not_assessed";

export interface AntenatalVisit {
  id: string;
  registration_id: string;
  practitioner_id: string;
  visit_date: string;
  visit_time: string | null;
  gestation_weeks: number | null;
  gestation_days: number | null;
  location: string | null;
  visit_type: VisitType;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  temperature: number | null;
  weight_kg: number | null;
  fundal_height_cm: number | null;
  presentation: Presentation | null;
  position: string | null;
  engagement: string | null;
  fetal_heart_rate: number | null;
  fetal_movements: FetalMovements | null;
  urine_protein: UrineResult | null;
  urine_glucose: UrineResult | null;
  oedema: Oedema | null;
  hb_result: number | null;
  blood_tests_ordered: string[] | null;
  ultrasound_ordered: boolean;
  referrals_made: string[] | null;
  topics_discussed: string[] | null;
  plan: string | null;
  notes: string | null;
  after_hours: boolean;
  duration_minutes: number | null;
  interpreter_present: boolean;
  next_visit_date: string | null;
  next_visit_gestation: string | null;
  midwife_signature: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

export type Lochia = "normal" | "heavy" | "offensive" | "absent";
export type PerineumWound = "intact" | "healing" | "infected" | "dehisced";
export type FeedingType = "exclusive_breast" | "predominantly_breast" | "mixed" | "artificial";
export type JaundiceAssessment = "none" | "mild" | "moderate" | "severe" | "not_assessed";
export type CordStatus = "intact" | "separating" | "separated" | "infected";
export type HearingTest = "pass" | "refer" | "not_done";
export type MetabolicScreen = "done" | "not_done" | "declined";
export type RedEyeTest = "normal" | "abnormal" | "not_done";

export interface PostnatalVisit {
  id: string;
  registration_id: string;
  practitioner_id: string;
  visit_date: string;
  visit_time: string | null;
  baby_age_days: number | null;
  location: string | null;
  visit_type: VisitType;
  maternal_bp_systolic: number | null;
  maternal_bp_diastolic: number | null;
  maternal_pulse: number | null;
  maternal_temperature: number | null;
  lochia: Lochia | null;
  uterus: string | null;
  perineum: string | null;
  perineum_wound: PerineumWound | null;
  breasts: string | null;
  breastfeeding_assessment: string | null;
  maternal_mood: string | null;
  edinburgh_pnd_score: number | null;
  maternal_concerns: string | null;
  baby_weight_g: number | null;
  baby_weight_change: string | null;
  feeding_type: FeedingType | null;
  feeding_frequency: string | null;
  feeding_concerns: string | null;
  baby_skin_colour: string | null;
  jaundice_assessment: JaundiceAssessment | null;
  cord: CordStatus | null;
  baby_bowels: string | null;
  baby_urine: string | null;
  hearing_test: HearingTest | null;
  hearing_test_date: string | null;
  newborn_metabolic_screen: MetabolicScreen | null;
  newborn_metabolic_screen_date: string | null;
  baby_hips: string | null;
  red_eye_test: RedEyeTest | null;
  immunisations_discussed: boolean;
  safe_sleep_discussed: boolean;
  car_seat_discussed: boolean;
  well_child_referral: boolean;
  well_child_provider: string | null;
  notes: string | null;
  plan: string | null;
  after_hours: boolean;
  duration_minutes: number | null;
  interpreter_present: boolean;
  next_visit_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

export type LabourOnsetType = "spontaneous" | "induced" | "no_labour";
export type MembranesRuptureType = "spontaneous" | "artificial";
export type LiquorColour = "clear" | "meconium_light" | "meconium_heavy" | "blood_stained";
export type BirthType = "normal_vaginal" | "assisted_vacuum" | "assisted_forceps" | "elective_caesarean" | "emergency_caesarean" | "breech_vaginal";
export type BirthLocationType = "home" | "primary_unit" | "secondary_hospital" | "tertiary_hospital";
export type PerineumOutcome = "intact" | "first_degree" | "second_degree" | "third_degree" | "fourth_degree" | "episiotomy" | "graze";
export type PlacentaDelivery = "physiological" | "active_management" | "manual_removal";
export type BloodLossType = "normal" | "pph_minor" | "pph_major";
export type BabyGender = "male" | "female" | "indeterminate";
export type VitaminK = "oral" | "im" | "declined";
export type CordClamping = "delayed" | "immediate";

export interface LabourBirth {
  id: string;
  registration_id: string;
  practitioner_id: string;
  labour_onset_type: LabourOnsetType | null;
  labour_onset_datetime: string | null;
  induction_method: string | null;
  induction_indication: string | null;
  membranes_ruptured_datetime: string | null;
  membranes_rupture_type: MembranesRuptureType | null;
  liquor_colour: LiquorColour | null;
  pain_relief: string[] | null;
  augmentation: boolean;
  augmentation_method: string | null;
  complications_labour: string[] | null;
  birth_datetime: string;
  birth_gestation_weeks: number | null;
  birth_gestation_days: number | null;
  birth_type: BirthType;
  birth_position: string | null;
  birth_location: string;
  birth_location_type: BirthLocationType | null;
  perineum_outcome: PerineumOutcome | null;
  episiotomy_type: string | null;
  suturing: string | null;
  placenta_delivery: PlacentaDelivery | null;
  placenta_delivery_datetime: string | null;
  placenta_complete: boolean | null;
  blood_loss_ml: number | null;
  blood_loss_type: BloodLossType | null;
  baby_gender: BabyGender | null;
  baby_weight_g: number;
  baby_length_cm: number | null;
  baby_head_circumference_cm: number | null;
  apgar_1: number | null;
  apgar_5: number | null;
  apgar_10: number | null;
  resuscitation: string[] | null;
  baby_nhi: string | null;
  skin_to_skin: boolean | null;
  skin_to_skin_duration_minutes: number | null;
  breastfeeding_initiated: boolean | null;
  first_breastfeed_minutes: number | null;
  vitamin_k: VitaminK | null;
  cord_clamping: CordClamping | null;
  cord_blood_collected: boolean;
  abnormalities_noted: string | null;
  baby_admitted_nicu: boolean;
  nicu_reason: string | null;
  backup_lmc: string | null;
  other_practitioners: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_version: number;
}

export type AppointmentType = "antenatal" | "postnatal" | "initial" | "follow_up" | "scan" | "bloods" | "admin" | "other";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: string;
  registration_id: string | null;
  practitioner_id: string;
  client_id: string | null;
  appointment_datetime: string;
  duration_minutes: number;
  location: string | null;
  appointment_type: AppointmentType | null;
  status: AppointmentStatus;
  notes: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

export type ClaimModuleType =
  | "first_second_trimester"
  | "third_trimester"
  | "labour_birth"
  | "postnatal"
  | "acs_complex_social"
  | "acs_complex_clinical"
  | "acs_additional_care"
  | "rpats";
export type ClaimPartialType = "full" | "first" | "last";
export type ClaimStatus = "draft" | "ready" | "submitted" | "paid" | "rejected" | "queried";

export interface Claim {
  id: string;
  registration_id: string;
  practitioner_id: string;
  module_type: ClaimModuleType;
  partial_type: ClaimPartialType;
  amount: number;
  claim_date: string | null;
  status: ClaimStatus;
  submission_date: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  rejection_reason: string | null;
  auto_calculated: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_version: number;
}

export type AttachmentType = "lab_result" | "ultrasound" | "referral" | "letter" | "photo" | "consent_form" | "other";

export interface Attachment {
  id: string;
  registration_id: string | null;
  client_id: string | null;
  attachment_type: AttachmentType | null;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  deleted_at: string | null;
  sync_version: number;
}
