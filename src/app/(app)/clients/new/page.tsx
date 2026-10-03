import { requireReady } from "@/features/auth/require-ready";
import { NewClientForm } from "@/features/clients/new-client-form";

export default async function NewClientPage() {
  await requireReady();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-900">New client</h1>
      <NewClientForm />
    </div>
  );
}
