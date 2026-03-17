"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db/schema";
import { createAppointment, updateAppointment, deleteAppointment } from "@/hooks/use-appointments";
import type { Appointment, AppointmentType, AppointmentStatus, Client } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

type ViewMode = "month" | "day";

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<(Appointment & SyncableRecord)[]>([]);
  const [clients, setClients] = useState<Map<string, Client & SyncableRecord>>(new Map());
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<(Appointment & SyncableRecord) | null>(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadData = useCallback(async () => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const all = await db.appointments
      .filter((a) => !a.deleted_at && a.appointment_datetime.startsWith(prefix))
      .toArray();
    setAppointments(all.sort((a, b) => a.appointment_datetime.localeCompare(b.appointment_datetime)));

    const allClients = await db.clients.filter((c) => !c.deleted_at).toArray();
    const map = new Map<string, Client & SyncableRecord>();
    for (const c of allClients) map.set(c.id, c);
    setClients(map);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { loadData(); }, [loadData]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon=0

  const monthName = currentDate.toLocaleDateString("en-NZ", { month: "long", year: "numeric" });

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }
  function goToday() {
    setCurrentDate(new Date());
  }

  function getAppointmentsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return appointments.filter((a) => a.appointment_datetime.startsWith(dateStr));
  }

  function handleDayClick(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setViewMode("day");
  }

  const todayStr = new Date().toISOString().split("T")[0];

  async function handleDeleteAppointment(id: string) {
    await deleteAppointment(id);
    await loadData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-semibold text-sage-900">Calendar</h1>
        <button
          onClick={() => { setShowForm(true); setEditingAppointment(null); }}
          className="px-4 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700 transition-colors duration-150"
        >
          New appointment
        </button>
      </div>

      {/* View toggle and navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 text-warm-400 hover:text-warm-600 transition-colors duration-150">&larr;</button>
          <h2 className="text-lg font-medium text-sage-900 min-w-[200px] text-center">{monthName}</h2>
          <button onClick={nextMonth} className="p-2 text-warm-400 hover:text-warm-600 transition-colors duration-150">&rarr;</button>
          <button onClick={goToday} className="ml-2 px-3 py-1 text-xs font-medium text-sage-600 border border-sage-200 rounded-full hover:bg-sage-50 transition-colors duration-150">
            Today
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-150 ${
              viewMode === "month" ? "bg-sage-600 text-white border-sage-600" : "bg-white text-warm-600 border-warm-200"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => { setViewMode("day"); if (!selectedDate) setSelectedDate(todayStr); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-150 ${
              viewMode === "day" ? "bg-sage-600 text-white border-sage-600" : "bg-white text-warm-600 border-warm-200"
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {viewMode === "month" ? (
        <div className="bg-white rounded-[14px] border border-warm-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-warm-200">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2 py-2 text-xs font-medium text-warm-400 text-center">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-warm-100" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayAppts = getAppointmentsForDay(day);
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className="min-h-[80px] border-b border-r border-warm-100 p-1 text-left hover:bg-warm-50 transition-colors duration-150"
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full ${
                    isToday ? "bg-sage-600 text-white" : "text-warm-600"
                  }`}>
                    {day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayAppts.slice(0, 3).map((apt) => {
                      const client = apt.client_id ? clients.get(apt.client_id) : null;
                      return (
                        <div
                          key={apt.id}
                          className={`px-1 py-0.5 text-[10px] rounded truncate ${
                            apt.status === "cancelled" ? "bg-warm-100 text-warm-400 line-through" :
                            apt.status === "no_show" ? "bg-coral-50 text-coral-700" :
                            "bg-sage-50 text-sage-700"
                          }`}
                        >
                          {new Date(apt.appointment_datetime).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", hour12: false })}
                          {client ? ` ${client.first_name[0]}. ${client.last_name}` : ""}
                        </div>
                      );
                    })}
                    {dayAppts.length > 3 && (
                      <div className="text-[10px] text-warm-400 px-1">+{dayAppts.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <DayView
          date={selectedDate || todayStr}
          appointments={appointments.filter((a) => a.appointment_datetime.startsWith(selectedDate || todayStr))}
          clients={clients}
          onEdit={(apt) => { setEditingAppointment(apt); setShowForm(true); }}
          onDelete={handleDeleteAppointment}
          onDateChange={(d) => {
            setSelectedDate(d);
            const dt = new Date(d);
            if (dt.getMonth() !== month || dt.getFullYear() !== year) {
              setCurrentDate(dt);
            }
          }}
        />
      )}

      {showForm && (
        <AppointmentForm
          appointment={editingAppointment}
          defaultDate={selectedDate || todayStr}
          clients={clients}
          onClose={() => { setShowForm(false); setEditingAppointment(null); }}
          onSaved={() => { setShowForm(false); setEditingAppointment(null); loadData(); }}
        />
      )}
    </div>
  );
}

function DayView({
  date,
  appointments,
  clients,
  onEdit,
  onDelete,
  onDateChange,
}: {
  date: string;
  appointments: (Appointment & SyncableRecord)[];
  clients: Map<string, Client & SyncableRecord>;
  onEdit: (apt: Appointment & SyncableRecord) => void;
  onDelete: (id: string) => void;
  onDateChange: (date: string) => void;
}) {
  const dt = new Date(date);
  const dayLabel = dt.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function prevDay() {
    const prev = new Date(dt);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev.toISOString().split("T")[0]);
  }
  function nextDay() {
    const next = new Date(dt);
    next.setDate(next.getDate() + 1);
    onDateChange(next.toISOString().split("T")[0]);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={prevDay} className="p-2 text-warm-400 hover:text-warm-600">&larr;</button>
        <h3 className="text-[15px] font-medium text-sage-900">{dayLabel}</h3>
        <button onClick={nextDay} className="p-2 text-warm-400 hover:text-warm-600">&rarr;</button>
      </div>

      <div className="bg-white rounded-[14px] border border-warm-200 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="p-6 text-sm text-warm-400">No appointments for this day.</div>
        ) : (
          appointments.map((apt) => {
            const client = apt.client_id ? clients.get(apt.client_id) : null;
            const time = new Date(apt.appointment_datetime).toLocaleTimeString("en-NZ", {
              hour: "2-digit", minute: "2-digit", hour12: false,
            });
            return (
              <div key={apt.id} className="flex items-center justify-between px-4 py-3 border-b border-warm-200 last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-warm-600 w-12">{time}</span>
                  <div>
                    <p className="text-sm font-medium text-sage-900">
                      {client ? `${client.preferred_name || client.first_name} ${client.last_name}` : "No client"}
                    </p>
                    <p className="text-xs text-warm-400">
                      {apt.appointment_type?.replace(/_/g, " ")} · {apt.duration_minutes}min
                      {apt.location && ` · ${apt.location}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${
                    apt.status === "completed" ? "bg-sage-50 text-sage-800 border-sage-100" :
                    apt.status === "cancelled" ? "bg-warm-50 text-warm-400 border-warm-200" :
                    apt.status === "confirmed" ? "bg-sky-50 text-sky-800 border-sky-100" :
                    "bg-warm-50 text-warm-600 border-warm-200"
                  }`}>
                    {apt.status}
                  </span>
                  <button onClick={() => onEdit(apt)} className="text-xs text-sage-600 hover:text-sage-800">Edit</button>
                  <button onClick={() => onDelete(apt.id)} className="text-xs text-coral-600 hover:text-coral-800">Delete</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AppointmentForm({
  appointment,
  defaultDate,
  clients,
  onClose,
  onSaved,
}: {
  appointment: (Appointment & SyncableRecord) | null;
  defaultDate: string;
  clients: Map<string, Client & SyncableRecord>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const clientList = Array.from(clients.values()).sort((a, b) => a.last_name.localeCompare(b.last_name));

  const defaultDatetime = appointment
    ? appointment.appointment_datetime.slice(0, 16)
    : `${defaultDate}T09:00`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const str = (k: string) => (fd.get(k) as string) || null;
    const num = (k: string) => { const v = fd.get(k) as string; return v ? parseInt(v) : 30; };

    const data = {
      practitioner_id: "pending",
      client_id: str("client_id"),
      registration_id: null,
      appointment_datetime: str("appointment_datetime") || new Date().toISOString(),
      duration_minutes: num("duration_minutes"),
      location: str("location"),
      appointment_type: (str("appointment_type") as AppointmentType) || null,
      status: (str("status") as AppointmentStatus) || "scheduled",
      notes: str("notes"),
      reminder_sent: false,
    };

    if (appointment) {
      await updateAppointment(appointment.id, data);
    } else {
      await createAppointment(data);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-[14px] border border-warm-200 p-6 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[15px] font-medium text-sage-900 mb-4">
          {appointment ? "Edit appointment" : "New appointment"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Client</label>
            <select
              name="client_id"
              defaultValue={appointment?.client_id || ""}
              className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            >
              <option value="">No client</option>
              {clientList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                  {c.nhi ? ` (${c.nhi})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Date and time</label>
            <input
              name="appointment_datetime"
              type="datetime-local"
              defaultValue={defaultDatetime}
              required
              className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Duration (min)</label>
              <input
                name="duration_minutes"
                type="number"
                defaultValue={appointment?.duration_minutes || 30}
                className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Type</label>
              <select
                name="appointment_type"
                defaultValue={appointment?.appointment_type || "antenatal"}
                className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
              >
                <option value="antenatal">Antenatal</option>
                <option value="postnatal">Postnatal</option>
                <option value="initial">Initial</option>
                <option value="follow_up">Follow-up</option>
                <option value="scan">Scan</option>
                <option value="bloods">Bloods</option>
                <option value="admin">Admin</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Location</label>
            <input
              name="location"
              defaultValue={appointment?.location || ""}
              placeholder="Home, clinic, hospital..."
              className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Status</label>
            <select
              name="status"
              defaultValue={appointment?.status || "scheduled"}
              className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            >
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No show</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Notes</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={appointment?.notes || ""}
              className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-warm-600 bg-white border border-warm-200 rounded-[10px] hover:bg-warm-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700 disabled:opacity-50 transition-colors duration-150"
            >
              {saving ? "Saving..." : appointment ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
