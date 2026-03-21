import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { shopifyFetch } from "@/lib/shopify";

type RemainingPaymentRequest = {
  orderRef: string;
};

const normalizeStoreUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return withProtocol.replace(/\/$/, "");
  }
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RemainingPaymentRequest>;
    const orderRef = body.orderRef?.trim();

    if (!orderRef) {
      return NextResponse.json({ error: "Missing orderRef" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("order_payments")
      .select("estimated_price,token_paid,remaining_amount,status")
      .eq("order_ref", orderRef)
      .maybeSingle<{
        estimated_price: number;
        token_paid: number;
        remaining_amount: number;
        status: string;
      }>();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Order payment record not found" }, { status: 404 });
    }

    const remainingAmount = Math.max(0, Number(existing.remaining_amount ?? 0));
    if (remainingAmount <= 0) {
      return NextResponse.json({ error: "No remaining balance to collect" }, { status: 400 });
    }

    const shopifyResponse = (await shopifyFetch("/products.json", {
      method: "POST",
      body: {
        product: {
          title: `Remaining Payment - ${orderRef}`,
          body_html: `<p>Remaining payment for LayerLedger order ${orderRef}</p>`,
          vendor: "LayerLedger",
          product_type: "3D Print Remaining Payment",
          variants: [{ price: remainingAmount.toFixed(2) }],
        },
      },
    })) as {
      product?: { variants?: Array<{ id: number }> };
    };

    const variantId = shopifyResponse.product?.variants?.[0]?.id;
    if (!variantId) {
      return NextResponse.json({ error: "Missing variant ID for remaining payment" }, { status: 502 });
    }

    const storeUrl = normalizeStoreUrl(process.env.SHOPIFY_STORE_URL ?? "");
    if (!storeUrl) {
      return NextResponse.json({ error: "Missing SHOPIFY_STORE_URL" }, { status: 500 });
    }

    const cartUrl = `${storeUrl}/cart/${variantId}:1`;

    const { error: updateError } = await supabaseAdmin
      .from("order_payments")
      .update({
        status: "Remaining Payment Pending",
        remaining_checkout_url: cartUrl,
      })
      .eq("order_ref", orderRef);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      cartUrl,
      remainingAmount,
      status: "Remaining Payment Pending",
    });
  } catch (error) {
    console.error("Remaining payment route error", error);
    return NextResponse.json({ error: "Failed to initialize remaining payment" }, { status: 500 });
  }
}
