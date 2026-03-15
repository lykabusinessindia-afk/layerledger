import type { SupabaseClient } from "@supabase/supabase-js";

type CreateJobInput = {
  userId: string | null;
  orderId: string;
  customerName: string | null;
  fileUrl: string;
  printer: string;
  material: string;
  filamentUsage: number;
  printTime: number;
};

export const createLayerLedgerJob = async (
  supabaseAdmin: SupabaseClient,
  payload: CreateJobInput
) => {
  return supabaseAdmin.from("jobs").insert({
    order_id: payload.orderId,
    user_id: payload.userId,
    customer_name: payload.customerName,
    file_url: payload.fileUrl,
    printer: payload.printer,
    material: payload.material,
    filament_usage: payload.filamentUsage,
    print_time: payload.printTime,
    status: "pending",
  });
};
