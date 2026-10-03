export function FormMessage({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <div role="alert" className="text-sm text-coral-600 bg-coral-50 border border-coral-100 rounded-[10px] px-3 py-2">
      {error}
    </div>
  );
}
