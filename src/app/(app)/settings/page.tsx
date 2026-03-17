"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import { useSync } from "@/hooks/use-sync";
import { seedDemoData } from "@/lib/db/seed";

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

  return (
    <div className="max-w-2xl">
      <h1 className="text-[26px] font-semibold text-sage-900 mb-6">Settings</h1>

      <div className="space-y-4">
        {/* Sync status */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-3">Sync</h2>
          <dl className="space-y-2 text-sm mb-4">
            <InfoRow label="Status" value={isOnline ? "Online" : "Offline"} />
            <InfoRow label="Pending changes" value={pendingCount.toString()} />
            <InfoRow label="Last synced" value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleString("en-NZ") : "Never"} />
          </dl>
          <button
            onClick={sync}
            disabled={isSyncing || !isOnline}
            className="px-4 py-2 text-sm font-medium text-sage-600 bg-sage-50 border border-sage-100 rounded-[10px] hover:bg-sage-100 disabled:opacity-50 transition-colors duration-150"
          >
            {isSyncing ? "Syncing..." : "Sync now"}
          </button>
        </section>

        {/* Local data */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-3">Local data</h2>
          {dbStats && (
            <dl className="space-y-2 text-sm mb-4">
              <InfoRow label="Clients" value={dbStats.clients.toString()} />
              <InfoRow label="Visits" value={dbStats.visits.toString()} />
              <InfoRow label="Claims" value={dbStats.claims.toString()} />
            </dl>
          )}
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setSeeding(true);
                await seedDemoData();
                window.location.reload();
              }}
              disabled={seeding}
              className="px-4 py-2 text-sm font-medium text-sage-600 bg-sage-50 border border-sage-100 rounded-[10px] hover:bg-sage-100 disabled:opacity-50 transition-colors duration-150"
            >
              {seeding ? "Loading..." : "Load demo data"}
            </button>
            <button
              onClick={handleClearLocal}
              className="px-4 py-2 text-sm font-medium text-coral-600 bg-coral-50 border border-coral-100 rounded-[10px] hover:bg-coral-100 transition-colors duration-150"
            >
              Clear local data
            </button>
          </div>
        </section>

        {/* Account */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-3">Account</h2>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium text-coral-600 bg-coral-50 border border-coral-100 rounded-[10px] hover:bg-coral-100 transition-colors duration-150"
          >
            Sign out
          </button>
        </section>

        {/* App info */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-3">About</h2>
          <dl className="space-y-2 text-sm">
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
    <div className="flex justify-between">
      <dt className="text-warm-400">{label}</dt>
      <dd className="text-warm-800 font-medium">{value || "-"}</dd>
    </div>
  );
}
