"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db/schema";
import { MODULE_AMOUNTS, getModuleLabel, getStatusColor } from "@/hooks/use-claims";
import { MobileHeader } from "@/components/ui/mobile-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import type { Claim, Client, Registration } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

type ReportPeriod = "month" | "quarter" | "year" | "all";

interface ReportData {
  totalClaims: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  byModule: { module: string; count: number; amount: number }[];
  byStatus: { status: string; count: number; amount: number }[];
  byClient: { clientName: string; clientId: string; count: number; amount: number }[];
  monthlyTrend: { month: string; amount: number; count: number }[];
  activeClients: number;
  totalVisits: number;
}

function getPeriodStart(period: ReportPeriod): string | null {
  if (period === "all") return null;
  const now = new Date();
  switch (period) {
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    case "quarter":
      return new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split("T")[0];
    case "year":
      return new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
  }
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>("quarter");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const periodStart = getPeriodStart(period);

    const allClaims = await db.claims.toArray();
    const allRegs = await db.registrations.filter((r) => !r.deleted_at).toArray();
    const allClients = await db.clients.filter((c) => !c.deleted_at).toArray();
    const clientMap = new Map(allClients.map((c) => [c.id, c]));
    const regMap = new Map(allRegs.map((r) => [r.id, r]));

    // Filter claims by period
    const claims = allClaims.filter((c) => {
      if (!periodStart) return true;
      return (c.claim_date || c.created_at) >= periodStart;
    });

    const totalAmount = claims.reduce((s, c) => s + c.amount, 0);
    const paidAmount = claims.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0);
    const pendingAmount = claims.filter((c) => c.status !== "paid" && c.status !== "rejected").reduce((s, c) => s + c.amount, 0);

    // By module
    const moduleMap = new Map<string, { count: number; amount: number }>();
    for (const claim of claims) {
      const key = claim.module_type;
      const existing = moduleMap.get(key) || { count: 0, amount: 0 };
      moduleMap.set(key, { count: existing.count + 1, amount: existing.amount + claim.amount });
    }
    const byModule = Array.from(moduleMap.entries())
      .map(([module, data]) => ({ module, ...data }))
      .sort((a, b) => b.amount - a.amount);

    // By status
    const statusMap = new Map<string, { count: number; amount: number }>();
    for (const claim of claims) {
      const key = claim.status;
      const existing = statusMap.get(key) || { count: 0, amount: 0 };
      statusMap.set(key, { count: existing.count + 1, amount: existing.amount + claim.amount });
    }
    const byStatus = Array.from(statusMap.entries())
      .map(([status, data]) => ({ status, ...data }))
      .sort((a, b) => b.amount - a.amount);

    // By client
    const clientClaimMap = new Map<string, { clientName: string; clientId: string; count: number; amount: number }>();
    for (const claim of claims) {
      const reg = regMap.get(claim.registration_id);
      if (!reg) continue;
      const client = clientMap.get(reg.client_id);
      if (!client) continue;
      const key = client.id;
      const existing = clientClaimMap.get(key) || {
        clientName: `${client.preferred_name || client.first_name} ${client.last_name}`,
        clientId: client.id,
        count: 0,
        amount: 0,
      };
      clientClaimMap.set(key, { ...existing, count: existing.count + 1, amount: existing.amount + claim.amount });
    }
    const byClient = Array.from(clientClaimMap.values()).sort((a, b) => b.amount - a.amount);

    // Monthly trend (last 6 months)
    const monthlyMap = new Map<string, { amount: number; count: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { amount: 0, count: 0 });
    }
    for (const claim of allClaims) {
      const date = claim.claim_date || claim.created_at;
      const key = date.substring(0, 7);
      if (monthlyMap.has(key)) {
        const existing = monthlyMap.get(key)!;
        monthlyMap.set(key, { amount: existing.amount + claim.amount, count: existing.count + 1 });
      }
    }
    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));

    // Active clients and visits
    const activeClients = new Set(allRegs.filter((r) => r.status === "active" || r.status === "postnatal").map((r) => r.client_id)).size;
    const anCount = await db.antenatalVisits.filter((v) => !v.deleted_at).count();
    const pnCount = await db.postnatalVisits.filter((v) => !v.deleted_at).count();

    setData({
      totalClaims: claims.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      byModule,
      byStatus,
      byClient,
      monthlyTrend,
      activeClients,
      totalVisits: anCount + pnCount,
    });
    setLoading(false);
  }, [period]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Module", "Claims", "Amount"],
      ...data.byModule.map((m) => [getModuleLabel(m.module), m.count.toString(), `$${m.amount.toFixed(2)}`]),
      [],
      ["Status", "Claims", "Amount"],
      ...data.byStatus.map((s) => [s.status, s.count.toString(), `$${s.amount.toFixed(2)}`]),
      [],
      ["Client", "Claims", "Amount"],
      ...data.byClient.map((c) => [c.clientName, c.count.toString(), `$${c.amount.toFixed(2)}`]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mauri-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodOptions: { value: ReportPeriod; label: string }[] = [
    { value: "month", label: "This month" },
    { value: "quarter", label: "This quarter" },
    { value: "year", label: "This year" },
    { value: "all", label: "All time" },
  ];

  return (
    <div className="md:max-w-4xl">
      <MobileHeader
        title="Reports"
        showBack
        rightAction={
          <button
            onClick={exportCSV}
            disabled={!data}
            className="hidden md:inline-flex px-4 py-2 text-sm font-medium text-sage-600 bg-sage-50 border border-sage-100 rounded-[10px] hover:bg-sage-100 disabled:opacity-50 transition-colors duration-150"
          >
            Export CSV
          </button>
        }
      />

      {/* Period filter */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto scroll-pills pb-1">
        {periodOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`flex-shrink-0 px-3.5 py-2 md:py-1.5 text-xs font-medium rounded-full border transition-colors duration-150 active:scale-95 ${
              period === opt.value
                ? "bg-sage-600 text-white border-sage-600"
                : "bg-white text-warm-600 border-warm-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <>
          {/* Summary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
            <MetricCard label="Total claims" value={data.totalClaims.toString()} />
            <MetricCard label="Total value" value={`$${data.totalAmount.toFixed(0)}`} />
            <MetricCard label="Paid" value={`$${data.paidAmount.toFixed(0)}`} accent="sage" />
            <MetricCard label="Pending" value={`$${data.pendingAmount.toFixed(0)}`} accent={data.pendingAmount > 0 ? "amber" : undefined} />
          </div>

          {/* Practice overview */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6">
            <MetricCard label="Active clients" value={data.activeClients.toString()} />
            <MetricCard label="Total visits" value={data.totalVisits.toString()} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 md:mb-6">
            {/* Claims by module */}
            <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
              <h3 className="text-[15px] font-medium text-sage-900 mb-3">By module</h3>
              {data.byModule.length === 0 ? (
                <p className="text-sm text-warm-400">No claims in this period.</p>
              ) : (
                <div className="space-y-3">
                  {data.byModule.map((m) => (
                    <div key={m.module}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-warm-600 truncate flex-1">{getModuleLabel(m.module)}</span>
                        <span className="text-sm font-mono font-medium text-sage-900 ml-2">${m.amount.toFixed(0)}</span>
                      </div>
                      <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sage-400 rounded-full transition-all duration-500"
                          style={{ width: `${data.totalAmount > 0 ? (m.amount / data.totalAmount) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-warm-400 mt-0.5">{m.count} claim{m.count !== 1 ? "s" : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Claims by status */}
            <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
              <h3 className="text-[15px] font-medium text-sage-900 mb-3">By status</h3>
              {data.byStatus.length === 0 ? (
                <p className="text-sm text-warm-400">No claims in this period.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.byStatus.map((s) => (
                    <div key={s.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${getStatusColor(s.status)}`}>
                          {s.status}
                        </span>
                        <span className="text-xs text-warm-400">{s.count} claim{s.count !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-sm font-mono font-medium text-warm-800">${s.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monthly trend */}
          <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6 mb-5 md:mb-6">
            <h3 className="text-[15px] font-medium text-sage-900 mb-4">6-month trend</h3>
            <div className="flex items-end gap-2 h-32">
              {data.monthlyTrend.map((m) => {
                const maxAmount = Math.max(...data.monthlyTrend.map((t) => t.amount), 1);
                const height = (m.amount / maxAmount) * 100;
                const monthLabel = new Date(m.month + "-01").toLocaleDateString("en-NZ", { month: "short" });
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono text-warm-400">
                      {m.amount > 0 ? `$${(m.amount / 1000).toFixed(1)}k` : ""}
                    </span>
                    <div className="w-full flex justify-center">
                      <div
                        className="w-full max-w-[40px] bg-sage-200 rounded-t-md transition-all duration-500"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-warm-400">{monthLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Claims by client */}
          <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6 mb-5">
            <h3 className="text-[15px] font-medium text-sage-900 mb-3">By client</h3>
            {data.byClient.length === 0 ? (
              <p className="text-sm text-warm-400">No claims in this period.</p>
            ) : (
              <div className="space-y-1">
                {data.byClient.map((c) => (
                  <div key={c.clientId} className="flex items-center justify-between py-2.5 border-b border-warm-100 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-sage-900 truncate">{c.clientName}</p>
                      <p className="text-xs text-warm-400">{c.count} claim{c.count !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm font-mono font-medium text-warm-800 flex-shrink-0 ml-3">${c.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile export button */}
          <div className="md:hidden sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] bg-warm-50 py-3 -mx-4 px-4 border-t border-warm-200">
            <button
              onClick={exportCSV}
              className="w-full px-4 py-3 text-sm font-medium text-sage-600 bg-white border border-sage-200 rounded-[10px] active:bg-sage-50 transition-colors duration-150"
            >
              Export as CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: "sage" | "amber" }) {
  const bgClass = accent === "sage" ? "bg-sage-50" : accent === "amber" ? "bg-amber-50" : "bg-warm-50";
  const valueClass = accent === "sage" ? "text-sage-600" : accent === "amber" ? "text-amber-700" : "text-sage-900";
  return (
    <div className={`rounded-[14px] p-4 ${bgClass}`}>
      <p className="text-[11px] md:text-xs font-medium text-warm-400 uppercase tracking-[0.05em]">{label}</p>
      <p className={`text-xl md:text-2xl font-semibold font-mono mt-1 ${valueClass}`}>{value}</p>
    </div>
  );
}
