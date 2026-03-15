import Link from "next/link";

export default function PrintJobsPage() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.24em] text-green-300">Print Jobs</p>
      <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-white">Route Moved</h1>
      <p className="mt-4 max-w-2xl text-slate-300 leading-relaxed">
        This page moved to Jobs.
      </p>
      <Link
        href="/jobs"
        className="mt-6 inline-flex rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-300"
      >
        Open Jobs
      </Link>
    </section>
  );
}
