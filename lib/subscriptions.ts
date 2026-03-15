import type { SubscriptionPlan } from "@/lib/db/models";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanConfig = {
  plan: SubscriptionPlan;
  label: string;
  monthlyPriceInr: number;
  jobLimit: number | null;
  features: string[];
};

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanConfig> = {
  starter: {
    plan: "starter",
    label: "Starter",
    monthlyPriceInr: 999,
    jobLimit: 10,
    features: ["10 jobs / month"],
  },
  pro: {
    plan: "pro",
    label: "Pro",
    monthlyPriceInr: 2999,
    jobLimit: null,
    features: ["Unlimited jobs"],
  },
  studio: {
    plan: "studio",
    label: "Studio",
    monthlyPriceInr: 5999,
    jobLimit: null,
    features: ["Unlimited jobs", "Team access", "Automation"],
  },
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  job_limit: number | null;
  used_jobs_current_period: number;
  active: boolean;
  renewal_date: string;
};

export const checkAndConsumeJobQuota = async (
  supabaseAdmin: SupabaseClient,
  userId: string
) => {
  const nowIso = new Date().toISOString();

  const { data: subscription, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id,user_id,plan,job_limit,used_jobs_current_period,active,renewal_date")
    .eq("user_id", userId)
    .eq("active", true)
    .single<SubscriptionRow>();

  if (error || !subscription) {
    return { ok: false as const, reason: "No active subscription" };
  }

  const renewalDate = new Date(subscription.renewal_date);
  const now = new Date(nowIso);

  let usedJobsCurrentPeriod = subscription.used_jobs_current_period;

  if (renewalDate <= now) {
    usedJobsCurrentPeriod = 0;
  }

  if (
    typeof subscription.job_limit === "number" &&
    usedJobsCurrentPeriod >= subscription.job_limit
  ) {
    return { ok: false as const, reason: "Job limit exceeded for current plan" };
  }

  const nextRenewalDate = new Date(now);
  nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);

  const { error: updateError } = await supabaseAdmin
    .from("subscriptions")
    .update({
      used_jobs_current_period: usedJobsCurrentPeriod + 1,
      renewal_date:
        renewalDate <= now
          ? nextRenewalDate.toISOString()
          : subscription.renewal_date,
      updated_at: nowIso,
    })
    .eq("id", subscription.id);

  if (updateError) {
    return { ok: false as const, reason: "Failed to update subscription usage" };
  }

  return { ok: true as const };
};
