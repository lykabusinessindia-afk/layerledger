import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type OrderPaymentStatus =
  | "Token Paid"
  | "Price Confirmed"
  | "Remaining Payment Pending"
  | "Completed";

type OrderPaymentPayload = {
  orderRef: string;
  estimatedPrice: number;
  tokenPaid: number;
  remainingAmount: number;
  status: OrderPaymentStatus;
  statusFlow: OrderPaymentStatus[];
  checkoutUrl?: string;
  remainingCheckoutUrl?: string;
  shopifyVariantId?: number;
  stlFileName?: string;
  selectedMaterial?: string;
  selectedColor?: string;
  selectedQuality?: string;
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
    const body = (await request.json()) as Partial<OrderPaymentPayload>;

    if (!body.orderRef) {
      return NextResponse.json({ error: "Missing orderRef" }, { status: 400 });
    }

    const estimatedPrice = Number(body.estimatedPrice ?? 0);
    const tokenPaid = Number(body.tokenPaid ?? 0);
    const remainingAmount = Number(body.remainingAmount ?? 0);

    if (!Number.isFinite(estimatedPrice) || estimatedPrice < 0) {
      return NextResponse.json({ error: "Invalid estimatedPrice" }, { status: 400 });
    }

    if (!Number.isFinite(tokenPaid) || tokenPaid < 0) {
      return NextResponse.json({ error: "Invalid tokenPaid" }, { status: 400 });
    }

    if (!Number.isFinite(remainingAmount) || remainingAmount < 0) {
      return NextResponse.json({ error: "Invalid remainingAmount" }, { status: 400 });
    }

    if (!body.status || !isValidStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const statusFlow = Array.isArray(body.statusFlow)
      ? body.statusFlow.filter((status): status is OrderPaymentStatus =>
          typeof status === "string" && isValidStatus(status)
        )
      : ORDER_STATUSES;

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin.from("order_payments").upsert(
      {
        order_ref: body.orderRef,
        estimated_price: estimatedPrice,
        token_paid: tokenPaid,
        remaining_amount: remainingAmount,
        status: body.status,
        status_flow: statusFlow,
        checkout_url: body.checkoutUrl ?? null,
        remaining_checkout_url: body.remainingCheckoutUrl ?? null,
        payment_metadata: {
          shopifyVariantId: body.shopifyVariantId ?? null,
          stlFileName: body.stlFileName ?? null,
          selectedMaterial: body.selectedMaterial ?? null,
          selectedColor: body.selectedColor ?? null,
          selectedQuality: body.selectedQuality ?? null,
        },
      },
      { onConflict: "order_ref" }
    );

    if (error) {
      console.error("Failed to save token payment", error);
      return NextResponse.json({ error: "Failed to save token payment" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Order payment route error", error);
    return NextResponse.json({ error: "Order payment route failed" }, { status: 500 });
  }
}
