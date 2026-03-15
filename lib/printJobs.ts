export type PrintJobStatus = "Pending" | "Printing" | "Completed" | "Cancelled";

export type SavedPrintJob = {
  id: string;
  jobName: string;
  modelName: string;
  material: string;
  filamentUsed: number;
  estimatedPrintTime: number;
  priceQuote: number;
  printer: string;
  status: PrintJobStatus;
  dateCreated: string;
};

const STORAGE_KEY = "layerledger-print-jobs";

const isBrowser = () => typeof window !== "undefined";

export const getSavedPrintJobs = (): SavedPrintJob[] => {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPrintJob[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

export const savePrintJobs = (jobs: SavedPrintJob[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
};

export const addSavedPrintJob = (job: SavedPrintJob) => {
  const existing = getSavedPrintJobs();
  savePrintJobs([job, ...existing]);
};

export const updateSavedPrintJobStatus = (
  jobId: string,
  status: PrintJobStatus
): SavedPrintJob[] => {
  const next = getSavedPrintJobs().map((job) =>
    job.id === jobId ? { ...job, status } : job
  );
  savePrintJobs(next);
  return next;
};
