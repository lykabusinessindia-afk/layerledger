"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type JobStatus = "pending" | "printing" | "completed";

type DashboardJob = {
  id: string;
  order_id: string;
  customer_name: string | null;
  printer: string;
  material: string;
  status: JobStatus;
  created_at: string;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("jobs")
      .select("id,order_id,customer_name,printer,material,status,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load jobs", error);
      setJobs([]);
      setLoading(false);
      return;
    }

    setJobs((data ?? []) as DashboardJob[]);
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const statusOptions: JobStatus[] = useMemo(
    () => ["pending", "printing", "completed"],
    []
  );

  const handleStatusChange = async (jobId: string, status: JobStatus) => {
    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", jobId);

    if (error) {
      console.error("Failed to update job status", error);
      return;
    }

    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status } : job)));
  };

  const statusClass = (status: JobStatus) => {
    if (status === "completed") return "text-green-300 border-green-400/25 bg-green-500/10";
    if (status === "printing") return "text-cyan-300 border-cyan-400/25 bg-cyan-500/10";
    return "text-amber-300 border-amber-400/25 bg-amber-500/10";
  };

  return (
    <div className="layerledger-content space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-green-300">Jobs</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Print Job Manager</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">
          Review saved jobs, track production status, and manage your print queue in one place.
        </p>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl md:p-6">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-300">
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-300">
            No jobs yet. New Shopify orders will appear here after webhook processing.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Job ID</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Printer</th>
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created Date</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t border-white/10 bg-slate-950/55 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{job.id.slice(0, 8)}</p>
                      <p className="text-xs text-slate-400 mt-1">Order #{job.order_id}</p>
                    </td>
                    <td className="px-4 py-3">{job.customer_name ?? "Guest"}</td>
                    <td className="px-4 py-3">{job.printer}</td>
                    <td className="px-4 py-3">{job.material}</td>
                    <td className="px-4 py-3">
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusChange(job.id, e.target.value as JobStatus)}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${statusClass(job.status)}`}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status[0].toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
