"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSavedPrintJobs,
  updateSavedPrintJobStatus,
  type PrintJobStatus,
  type SavedPrintJob,
} from "@/lib/printJobs";

export default function JobsPage() {
  const [jobs, setJobs] = useState<SavedPrintJob[]>([]);

  useEffect(() => {
    setJobs(getSavedPrintJobs());
  }, []);

  const statusOptions: PrintJobStatus[] = useMemo(
    () => ["Pending", "Printing", "Completed", "Cancelled"],
    []
  );

  const handleStatusChange = (jobId: string, status: PrintJobStatus) => {
    const updated = updateSavedPrintJobStatus(jobId, status);
    setJobs(updated);
  };

  const statusClass = (status: PrintJobStatus) => {
    if (status === "Completed") return "text-green-300 border-green-400/25 bg-green-500/10";
    if (status === "Printing") return "text-cyan-300 border-cyan-400/25 bg-cyan-500/10";
    if (status === "Cancelled") return "text-red-300 border-red-400/25 bg-red-500/10";
    return "text-amber-300 border-amber-400/25 bg-amber-500/10";
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-green-300">Jobs</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Print Job Manager</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">
          Review saved jobs, track production status, and manage your print queue in one place.
        </p>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl md:p-6">
        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-300">
            No saved print jobs yet. Save a job from the calculator to populate this table.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Job Name</th>
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 font-medium">Filament Used</th>
                  <th className="px-4 py-3 font-medium">Estimated Print Time</th>
                  <th className="px-4 py-3 font-medium">Price Quote</th>
                  <th className="px-4 py-3 font-medium">Printer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t border-white/10 bg-slate-950/55 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{job.jobName}</p>
                      <p className="text-xs text-slate-400 mt-1">{job.modelName}</p>
                    </td>
                    <td className="px-4 py-3">{job.material}</td>
                    <td className="px-4 py-3">{job.filamentUsed.toFixed(2)} g</td>
                    <td className="px-4 py-3">{job.estimatedPrintTime.toFixed(2)} hrs</td>
                    <td className="px-4 py-3 text-green-300 font-semibold">₹ {job.priceQuote.toFixed(2)}</td>
                    <td className="px-4 py-3">{job.printer}</td>
                    <td className="px-4 py-3">
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusChange(job.id, e.target.value as PrintJobStatus)}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${statusClass(job.status)}`}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {new Date(job.dateCreated).toLocaleString()}
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
