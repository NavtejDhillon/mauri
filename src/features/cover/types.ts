export type GrantRow = {
  id: string;
  grantor_practitioner_id: string;
  grantee_type: "practitioner" | "practice" | "operator";
  grantee_id: string | null;
  client_id: string | null;
  level: "view" | "cover";
  kind: "standard" | "historical";
  starts_at: string;
  ends_at: string | null;
  revoked_at: string | null;
  reason: string | null;
};

export type Colleague = { id: string; full_name: string };
