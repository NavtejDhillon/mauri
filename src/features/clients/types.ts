export type ClientSummary = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  nhi: string | null;
  date_of_birth: string | null;
  owner_practitioner_id: string;
};
