import { NewClientForm } from "@/features/clients/new-client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-900">New client</h1>
      <NewClientForm />
    </div>
  );
}
