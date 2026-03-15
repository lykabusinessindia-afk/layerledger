export type SubscriptionPlan = "starter" | "pro" | "studio";

export type JobStatus = "pending" | "printing" | "completed";

export type DbUser = {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string;
};

export type DbSubscription = {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  jobLimit: number | null;
  usedJobsCurrentPeriod: number;
  active: boolean;
  renewalDate: string;
  createdAt: string;
  updatedAt: string;
};

export type DbUploadedModel = {
  id: string;
  userId: string | null;
  orderId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
};

export type DbJob = {
  id: string;
  userId: string | null;
  orderId: string;
  customerName: string | null;
  fileUrl: string;
  printer: string;
  material: string;
  filamentUsage: number;
  printTime: number;
  status: JobStatus;
  createdAt: string;
};

export type DbPrinterProfile = {
  id: string;
  name: string;
  power: number;
  speed: number;
  machineCostPerHour: number;
  createdAt: string;
};

export type DbMaterial = {
  id: string;
  name: string;
  density: number;
  createdAt: string;
};
