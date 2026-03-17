export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-sage-900">Good morning</h1>
        <p className="text-sm text-warm-400 mt-0.5">{today}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active clients", value: "0" },
          { label: "This week's visits", value: "0" },
          { label: "Pending claims", value: "$0" },
          { label: "RPaTS this month", value: "$0" },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-warm-50 rounded-[14px] p-4"
          >
            <p className="text-xs font-medium text-warm-400 uppercase tracking-[0.05em]">
              {metric.label}
            </p>
            <p className="text-2xl font-semibold text-sage-900 mt-1">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[14px] border border-warm-200 p-6">
        <p className="text-sm text-warm-400">
          Welcome to Mauri. Start by adding your first client.
        </p>
      </div>
    </div>
  );
}
