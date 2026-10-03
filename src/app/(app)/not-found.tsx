import Link from "next/link";

// Shown inside the app shell when a page calls notFound(), for example a client who does not
// exist or whom she cannot see. The two cases look the same on purpose.
export default function AppNotFound() {
  return (
    <div className="space-y-4 md:max-w-lg">
      <h1 className="text-2xl font-semibold text-sage-900">Not found</h1>
      <p className="text-sm text-warm-700">We could not find that page or record, or you do not have access to it. Check the link, or find it from your client list.</p>
      <div className="flex flex-col gap-3 md:flex-row">
        <Link href="/clients" className="inline-flex items-center justify-center min-h-11 px-4 py-2.5 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700">
          Go to clients
        </Link>
        <Link href="/dashboard" className="inline-flex items-center justify-center min-h-11 px-4 py-2.5 text-sm font-medium text-sage-700 bg-white border border-warm-200 rounded-[10px] hover:bg-warm-50">
          Go to the dashboard
        </Link>
      </div>
    </div>
  );
}
