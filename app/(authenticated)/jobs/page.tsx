type PrintJob = {
  modelName: string;
  filamentUsed: string;
  printTime: string;
  priceQuote: string;
};

const JOBS: PrintJob[] = [
  {
    modelName: "Gear Housing v2.stl",
    filamentUsed: "126.40 g",
    printTime: "5.8 hrs",
    priceQuote: "₹ 1,245.00",
  },
  {
    modelName: "Drone Frame.obj",
    filamentUsed: "84.90 g",
    printTime: "3.6 hrs",
    priceQuote: "₹ 892.00",
  },
  {
    modelName: "Desk Organizer.3mf",
    filamentUsed: "142.70 g",
    printTime: "6.2 hrs",
    priceQuote: "₹ 1,378.00",
  },
  {
    modelName: "Camera Mount.stl",
    filamentUsed: "61.20 g",
    printTime: "2.7 hrs",
    priceQuote: "₹ 645.00",
  },
  {
    modelName: "Enclosure Bracket.stl",
    filamentUsed: "48.50 g",
    printTime: "2.1 hrs",
    priceQuote: "₹ 512.00",
  },
];

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-green-300">Jobs</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Previous Print Jobs</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">
          Review historical print estimates and compare material usage, time, and quote values.
        </p>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl md:p-6">
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Model Name</th>
                <th className="px-4 py-3 font-medium">Filament Used</th>
                <th className="px-4 py-3 font-medium">Print Time</th>
                <th className="px-4 py-3 font-medium">Price Quote</th>
              </tr>
            </thead>
            <tbody>
              {JOBS.map((job) => (
                <tr key={job.modelName} className="border-t border-white/10 bg-slate-950/55 hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{job.modelName}</td>
                  <td className="px-4 py-3">{job.filamentUsed}</td>
                  <td className="px-4 py-3">{job.printTime}</td>
                  <td className="px-4 py-3 text-green-300 font-semibold">{job.priceQuote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
