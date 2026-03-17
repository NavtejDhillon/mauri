"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/db/schema";
import { checkAntenatalAlerts, checkPostnatalAlerts, checkOverdueVisit, type ClinicalAlert } from "@/lib/clinical/alerts";
import { GestationBadge } from "@/components/clinical/gestation-badge";
import { MobileHeader } from "@/components/ui/mobile-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import { IconAlertTriangle, IconCalendar, IconClock } from "@/components/ui/icons";
import type { Client, Registration, Appointment, AntenatalVisit, PostnatalVisit } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface DashboardData {
  activeClients: number;
  weekVisits: number;
  upcomingAppointments: (Appointment & SyncableRecord & { client?: Client })[];
  alertClients: { client: Client; registration: Registration; alerts: ClinicalAlert[] }[];
  recentVisits: { type: string; clientName: string; date: string; clientId: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  const today = new Date().toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    async function load() {
      const clients = await db.clients.filter((c) => !c.deleted_at).toArray();
      const regs = await db.registrations.filter((r) => !r.deleted_at).toArray();
      const clientMap = new Map(clients.map((c) => [c.id, c]));

      const activeRegs = regs.filter((r) => r.status === "active" || r.status === "postnatal");
      const activeClients = new Set(activeRegs.map((r) => r.client_id)).size;

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split("T")[0];

      const anVisits = await db.antenatalVisits.filter((v) => !v.deleted_at && v.visit_date >= weekStartStr).toArray();
      const pnVisits = await db.postnatalVisits.filter((v) => !v.deleted_at && v.visit_date >= weekStartStr).toArray();
      const weekVisits = anVisits.length + pnVisits.length;

      const nowStr = new Date().toISOString();
      const allAppts = await db.appointments
        .filter((a) => !a.deleted_at && a.appointment_datetime >= nowStr && a.status !== "cancelled")
        .toArray();
      const upcomingAppointments = allAppts
        .sort((a, b) => a.appointment_datetime.localeCompare(b.appointment_datetime))
        .slice(0, 5)
        .map((apt) => ({ ...apt, client: apt.client_id ? clientMap.get(apt.client_id) ?? undefined : undefined }));

      const alertClients: DashboardData["alertClients"] = [];
      for (const reg of activeRegs) {
        const client = clientMap.get(reg.client_id);
        if (!client) continue;

        const alerts: ClinicalAlert[] = [];

        const latestAN = await db.antenatalVisits
          .where("registration_id").equals(reg.id)
          .filter((v) => !v.deleted_at)
          .toArray();
        latestAN.sort((a, b) => b.visit_date.localeCompare(a.visit_date));
        if (latestAN[0]) alerts.push(...checkAntenatalAlerts(latestAN[0]));

        const latestPN = await db.postnatalVisits
          .where("registration_id").equals(reg.id)
          .filter((v) => !v.deleted_at)
          .toArray();
        latestPN.sort((a, b) => b.visit_date.localeCompare(a.visit_date));
        if (latestPN[0]) alerts.push(...checkPostnatalAlerts(latestPN[0]));

        const lastDate = latestPN[0]?.visit_date ?? latestAN[0]?.visit_date ?? null;
        const overdueAlert = checkOverdueVisit(reg, lastDate);
        if (overdueAlert) alerts.push(overdueAlert);

        if (alerts.length > 0) {
          alertClients.push({ client, registration: reg, alerts });
        }
      }

      const allAN = await db.antenatalVisits.filter((v) => !v.deleted_at).toArray();
      const allPN = await db.postnatalVisits.filter((v) => !v.deleted_at).toArray();

      const regMap = new Map(regs.map((r) => [r.id, r]));
      const recentVisits = [
        ...allAN.map((v) => {
          const reg = regMap.get(v.registration_id);
          const c = reg ? clientMap.get(reg.client_id) : undefined;
          return {
            type: "Antenatal",
            clientName: c ? `${c.preferred_name || c.first_name} ${c.last_name}` : "Unknown",
            date: v.visit_date,
            clientId: reg?.client_id || "",
          };
        }),
        ...allPN.map((v) => {
          const reg = regMap.get(v.registration_id);
          const c = reg ? clientMap.get(reg.client_id) : undefined;
          return {
            type: "Postnatal",
            clientName: c ? `${c.preferred_name || c.first_name} ${c.last_name}` : "Unknown",
            date: v.visit_date,
            clientId: reg?.client_id || "",
          };
        }),
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

      setData({ activeClients, weekVisits, upcomingAppointments, alertClients, recentVisits });
    }
    load();
  }, []);

  return (
    <div>
      <MobileHeader title={getGreeting()} />
      <p className="text-sm text-warm-400 -mt-3 mb-5 md:-mt-4 md:mb-6">{today}</p>

      {/* Metric cards */}
      {!data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
          <MetricCard label="Active clients" value={data.activeClients.toString()} />
          <MetricCard label="Week's visits" value={data.weekVisits.toString()} />
          <MetricCard label="Upcoming" value={data.upcomingAppointments.length.toString()} />
          <MetricCard label="Alerts" value={data.alertClients.length.toString()} accent={data.alertClients.length > 0} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming appointments */}
        <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconCalendar size={16} className="text-sage-500" />
              <h3 className="text-[15px] font-medium text-sage-900">Upcoming</h3>
            </div>
            <Link href="/calendar" className="text-xs text-sage-600 active:text-sage-800 py-1 px-2">View all</Link>
          </div>
          {!data || data.upcomingAppointments.length === 0 ? (
            <p className="text-sm text-warm-400">No upcoming appointments.</p>
          ) : (
            <div className="space-y-1">
              {data.upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between py-2.5 border-b border-warm-100 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-sage-900 truncate">
                      {apt.client ? `${apt.client.preferred_name || apt.client.first_name} ${apt.client.last_name}` : "No client"}
                    </p>
                    <p className="text-xs text-warm-400 truncate">
                      {apt.appointment_type?.replace(/_/g, " ")}
                      {apt.location && ` · ${apt.location}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-xs font-mono text-warm-600">
                      {new Date(apt.appointment_datetime).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-xs font-mono text-warm-400">
                      {new Date(apt.appointment_datetime).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clients needing attention */}
        <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <IconAlertTriangle size={16} className="text-coral-600" />
            <h3 className="text-[15px] font-medium text-sage-900">Needs attention</h3>
          </div>
          {!data || data.alertClients.length === 0 ? (
            <p className="text-sm text-warm-400">No alerts. All clients are doing well.</p>
          ) : (
            <div className="space-y-1">
              {data.alertClients.slice(0, 5).map(({ client, registration, alerts }) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block py-2.5 border-b border-warm-100 last:border-b-0 active:bg-warm-50 -mx-2 px-2 rounded-lg transition-colors duration-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium text-sage-900 truncate">
                        {client.preferred_name || client.first_name} {client.last_name}
                      </p>
                      {registration.agreed_edd && registration.status === "active" && (
                        <GestationBadge edd={registration.agreed_edd} />
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {alerts.map((alert, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          alert.level === "urgent"
                            ? "bg-coral-50 text-coral-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {alert.category}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent visits */}
        <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconClock size={16} className="text-warm-400" />
              <h3 className="text-[15px] font-medium text-sage-900">Recent visits</h3>
            </div>
            <Link href="/clients" className="text-xs text-sage-600 active:text-sage-800 py-1 px-2">All clients</Link>
          </div>
          {!data || data.recentVisits.length === 0 ? (
            <p className="text-sm text-warm-400">No visits recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {data.recentVisits.map((visit, i) => (
                <Link
                  key={i}
                  href={`/clients/${visit.clientId}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg active:bg-warm-50 transition-colors duration-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-sage-900 truncate">{visit.clientName}</p>
                    <p className="text-xs text-warm-400">{visit.type} visit</p>
                  </div>
                  <p className="text-xs font-mono text-warm-400 flex-shrink-0 ml-3">
                    {new Date(visit.date).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-[14px] p-4 ${accent && value !== "0" ? "bg-coral-50" : "bg-warm-50"}`}>
      <p className="text-[11px] md:text-xs font-medium text-warm-400 uppercase tracking-[0.05em]">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent && value !== "0" ? "text-coral-600" : "text-sage-900"}`}>{value}</p>
    </div>
  );
}
