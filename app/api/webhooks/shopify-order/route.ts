import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAndConsumeJobQuota } from "@/lib/subscriptions";
import { createLayerLedgerJob } from "@/lib/jobs";

type ShopifyProperty = { name: string; value: string };

type ShopifyLineItem = {
  id: number;
  title: string;
  properties?: ShopifyProperty[];
};

type ShopifyOrderPayload = {
  id: number;
  order_number: number;
  customer?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  line_items: ShopifyLineItem[];
};

const toPropertyMap = (properties: ShopifyProperty[] | undefined) => {
  const map: Record<string, string> = {};
  for (const property of properties ?? []) {
    map[property.name] = property.value;
  }
  return map;
};

const verifyShopifyWebhook = (rawBody: string, hmacHeader: string | null) => {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!hmacHeader) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: ShopifyOrderPayload;
  try {
    payload = JSON.parse(rawBody) as ShopifyOrderPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const orderId = String(payload.id || payload.order_number);
    const customerEmail = payload.customer?.email ?? "";
    const customerName = [payload.customer?.first_name, payload.customer?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

    let resolvedUserId: string | null = null;
    if (customerEmail) {
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", customerEmail)
        .maybeSingle<{ id: string }>();

      resolvedUserId = userRow?.id ?? null;
    }

    for (const lineItem of payload.line_items ?? []) {
      const refMatch = lineItem.title.match(/\[Ref:([^\]]+)\]/);
      const orderRef = refMatch?.[1]?.trim();

      if (orderRef) {
        const { error: paymentUpdateError } = await supabaseAdmin
          .from("order_payments")
          .update({ status: "Token Paid" })
          .eq("order_ref", orderRef);

        if (paymentUpdateError) {
          console.error("Failed to mark token as paid", paymentUpdateError);
        }
      }

      const properties = toPropertyMap(lineItem.properties);
      const fileUrl = properties.STL_File || properties.modelFile || "";
      const printer = properties.Printer || "Unknown";
      const material = properties.Material || "PLA";
      const filamentUsage = Number(properties.Filament || 0);
      const printTime = Number(properties.PrintTime || 0);
      const userId = properties.LayerLedgerUserId || resolvedUserId || null;

      if (!fileUrl) continue;

      if (userId) {
        const quotaResult = await checkAndConsumeJobQuota(supabaseAdmin, userId);
        if (!quotaResult.ok) {
          return NextResponse.json(
            { error: quotaResult.reason, orderId, lineItemId: lineItem.id },
            { status: 402 }
          );
        }
      }

      const { error } = await createLayerLedgerJob(supabaseAdmin, {
        orderId,
        userId,
        customerName,
        fileUrl,
        printer,
        material,
        filamentUsage: Number.isFinite(filamentUsage) ? filamentUsage : 0,
        printTime: Number.isFinite(printTime) ? printTime : 0,
      });

      if (error) {
        console.error("Failed to create job from webhook", error);
        return NextResponse.json({ error: "Failed to create LayerLedger job" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Shopify webhook error", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
