import type { AntenatalVisit, PostnatalVisit, Registration } from "@/lib/supabase/types";

export interface ClinicalAlert {
  level: "warning" | "urgent";
  category: string;
  message: string;
}

export function checkAntenatalAlerts(visit: AntenatalVisit): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];

  if (visit.bp_systolic && visit.bp_diastolic) {
    if (visit.bp_systolic >= 160 || visit.bp_diastolic >= 110) {
      alerts.push({ level: "urgent", category: "BP", message: `Severe hypertension: ${visit.bp_systolic}/${visit.bp_diastolic}` });
    } else if (visit.bp_systolic >= 140 || visit.bp_diastolic >= 90) {
      alerts.push({ level: "warning", category: "BP", message: `Elevated BP: ${visit.bp_systolic}/${visit.bp_diastolic}` });
    }

    if ((visit.bp_systolic >= 140 || visit.bp_diastolic >= 90) && visit.urine_protein && visit.urine_protein !== "nil" && visit.urine_protein !== "not_tested") {
      alerts.push({ level: "urgent", category: "Pre-eclampsia", message: `Elevated BP with proteinuria (${visit.urine_protein})` });
    }
  }

  if (visit.fetal_movements === "reduced") {
    alerts.push({ level: "warning", category: "Fetal movements", message: "Reduced fetal movements reported" });
  }

  if (visit.fetal_heart_rate != null) {
    if (visit.fetal_heart_rate < 110) {
      alerts.push({ level: "urgent", category: "FHR", message: `Fetal bradycardia: ${visit.fetal_heart_rate} bpm` });
    } else if (visit.fetal_heart_rate > 160) {
      alerts.push({ level: "warning", category: "FHR", message: `Fetal tachycardia: ${visit.fetal_heart_rate} bpm` });
    }
  }

  if (visit.fundal_height_cm != null && visit.gestation_weeks != null) {
    const diff = Math.abs(visit.fundal_height_cm - visit.gestation_weeks);
    if (diff > 3) {
      alerts.push({ level: "warning", category: "Fundal height", message: `Discrepancy of ${diff}cm from expected` });
    }
  }

  return alerts;
}

export function checkPostnatalAlerts(visit: PostnatalVisit): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];

  if (visit.maternal_bp_systolic && visit.maternal_bp_diastolic) {
    if (visit.maternal_bp_systolic >= 160 || visit.maternal_bp_diastolic >= 110) {
      alerts.push({ level: "urgent", category: "BP", message: `Severe hypertension: ${visit.maternal_bp_systolic}/${visit.maternal_bp_diastolic}` });
    } else if (visit.maternal_bp_systolic >= 140 || visit.maternal_bp_diastolic >= 90) {
      alerts.push({ level: "warning", category: "BP", message: `Elevated BP: ${visit.maternal_bp_systolic}/${visit.maternal_bp_diastolic}` });
    }
  }

  if (visit.edinburgh_pnd_score != null && visit.edinburgh_pnd_score >= 13) {
    alerts.push({ level: "urgent", category: "EPDS", message: `Edinburgh PND score ${visit.edinburgh_pnd_score} - requires follow-up` });
  } else if (visit.edinburgh_pnd_score != null && visit.edinburgh_pnd_score >= 10) {
    alerts.push({ level: "warning", category: "EPDS", message: `Edinburgh PND score ${visit.edinburgh_pnd_score} - monitor closely` });
  }

  if (visit.lochia === "offensive" || visit.lochia === "heavy") {
    alerts.push({ level: "warning", category: "Lochia", message: `Abnormal lochia: ${visit.lochia}` });
  }

  if (visit.jaundice_assessment === "moderate" || visit.jaundice_assessment === "severe") {
    alerts.push({ level: visit.jaundice_assessment === "severe" ? "urgent" : "warning", category: "Jaundice", message: `Baby jaundice: ${visit.jaundice_assessment}` });
  }

  return alerts;
}

export function checkOverdueVisit(
  registration: Registration,
  lastVisitDate: string | null
): ClinicalAlert | null {
  if (registration.status !== "active" && registration.status !== "postnatal") return null;

  if (!lastVisitDate) {
    const regDate = new Date(registration.registration_date);
    const daysSince = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 14) {
      return { level: "warning", category: "Overdue", message: `No visits recorded since registration (${daysSince} days)` };
    }
    return null;
  }

  const last = new Date(lastVisitDate);
  const daysSince = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (registration.status === "postnatal" && daysSince > 7) {
    return { level: "warning", category: "Overdue", message: `Last postnatal visit was ${daysSince} days ago` };
  }

  if (registration.status === "active" && daysSince > 28) {
    return { level: "warning", category: "Overdue", message: `Last antenatal visit was ${daysSince} days ago` };
  }

  return null;
}
