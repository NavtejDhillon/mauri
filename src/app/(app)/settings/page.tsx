"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import { useSync } from "@/hooks/use-sync";
import { seedDemoData } from "@/lib/db/seed";
import { MobileHeader } from "@/components/ui/mobile-header";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { isSyncing, lastSyncedAt, pendingCount, isOnline, sync } = useSync();
  const [dbStats, setDbStats] = useState<{ clients: number; visits: number; claims: number } | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    async function load() {
      const clients = await db.clients.filter((c) => !c.deleted_at).count();
      const an = await db.antenatalVisits.filter((v) => !v.deleted_at).count();
      const pn = await db.postnatalVisits.filter((v) => !v.deleted_at).count();
      const claims = await db.claims.count();
      setDbStats({ clients, visits: an + pn, claims });
    }
    load();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleClearLocal() {
    if (!confirm("This will clear all local data. Data synced to the server will not be affected. Continue?")) return;
    await db.delete();
    window.location.reload();
  }

  const btnClass = "w-full md:w-auto px-4 py-3 md:py-2 text-sm font-medium rounded-[10px] transition-colors duration-150 active:scale-[0.98]";

  return (
    <div className="md:max-w-2xl">
      <MobileHeader title="Settings" />

      <div className="space-y-4">
        {/* Sync status */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-3">Sync</h2>
          <dl className="space-y-2.5 text-sm mb-4">
            <InfoRow label="Status" value={isOnline ? "Online" : "Offline"} />
            <InfoRow label="Pending changes" value={pendingCount.toString()} />
            <InfoRow label="Last synced" value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleString("en-NZ") : "Never"} />
          </dl>
          <button
            onClick={sync}
            disabled={isSyncing || !isOnline}
            className={`${btnClass} text-sage-600 bg-sage-50 border border-sage-100 active:bg-sage-100 disabled:opacity-50`}
          >
            {isSyncing ? "Syncing..." : "Sync now"}
          </button>
        </section>

        {/* Local data */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-3">Local data</h2>
          {dbStats && (
            <dl className="space-y-2.5 text-sm mb-4">
              <InfoRow label="Clients" value={dbStats.clients.toString()} />
              <InfoRow label="Visits" value={dbStats.visits.toString()} />
              <InfoRow label="Claims" value={dbStats.claims.toString()} />
            </dl>
          )}
          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={async () => {
                setSeeding(true);
                await seedDemoData();
                window.location.reload();
              }}
              disabled={seeding}
              className={`${btnClass} text-sage-600 bg-sage-50 border border-sage-100 active:bg-sage-100 disabled:opacity-50`}
            >
              {seeding ? "Loading..." : "Load demo data"}
            </button>
            <button
              onClick={handleClearLocal}
              className={`${btnClass} text-coral-600 bg-coral-50 border border-coral-100 active:bg-coral-100`}
            >
              Clear local data
            </button>
          </div>
        </section>

        {/* Account */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-3">Account</h2>
          <button
            onClick={handleSignOut}
            className={`${btnClass} text-coral-600 bg-coral-50 border border-coral-100 active:bg-coral-100`}
          >
            Sign out
          </button>
        </section>

        {/* App info */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-3">About</h2>
          <dl className="space-y-2.5 text-sm">
            <InfoRow label="App" value="Mauri" />
            <InfoRow label="Version" value="0.1.0" />
            <InfoRow label="Framework" value="Next.js 16" />
          </dl>
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-warm-400">{label}</dt>
      <dd className="text-warm-800 font-medium">{value || "-"}</dd>
    </div>
  );
}
