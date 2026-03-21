import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type OrderPaymentStatus =
  | "Token Paid"
  | "Price Confirmed"
  | "Remaining Payment Pending"
  | "Completed";

type UpdateOrderStatusRequest = {
  orderRef: string;
  status: OrderPaymentStatus;
};

const ORDER_STATUSES: OrderPaymentStatus[] = [
  "Token Paid",
  "Price Confirmed",
  "Remaining Payment Pending",
  "Completed",
];

const isValidStatus = (value: string): value is OrderPaymentStatus => {
  return ORDER_STATUSES.includes(value as OrderPaymentStatus);
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<UpdateOrderStatusRequest>;

    if (!body.orderRef) {
      return NextResponse.json({ error: "Missing orderRef" }, { status: 400 });
    }

    if (!body.status || !isValidStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("order_payments")
      .update({ status: body.status })
      .eq("order_ref", body.orderRef);

    if (error) {
      console.error("Failed to update order payment status", error);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: body.status });
  } catch (error) {
    console.error("Order payment status route error", error);
    return NextResponse.json({ error: "Status route failed" }, { status: 500 });
  }
}
