export default function DashboardPage() {
  const quickStats = [
    {
      label: "Total Prints Analyzed",
      value: "1,248",
      trend: "+12.4% this month",
    },
    {
      label: "Total Revenue Estimated",
      value: "₹ 18,42,560",
      trend: "+8.9% this month",
    },
    {
      label: "Average Print Cost",
      value: "₹ 742.30",
      trend: "-3.1% this month",
    },
  ];

  return (
    <div className="layerledger-content space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-green-300">Dashboard</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">LayerLedger Overview</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">
          Track your 3D printing business at a glance with key performance metrics and recent operations.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl"
          >
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-white">{stat.value}</p>
            <p className="mt-3 inline-flex rounded-full border border-green-400/20 bg-green-500/10 px-3 py-1 text-xs text-green-300">
              {stat.trend}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
