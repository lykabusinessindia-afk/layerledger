import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
    console.log("save-order request body:", body);
    console.log("BODY FILE URL:", body.file_url);
  } catch {
    console.error("save-order: failed to parse request body");
    return Response.json({ success: false, error: "Malformed request body" }, { status: 400 });
  }

  const { customization } = body;

  const email =
    typeof body.email === "string" && body.email.trim().length > 0
      ? body.email.trim().toLowerCase()
      : typeof body.customer_email === "string" && body.customer_email.trim().length > 0
        ? body.customer_email.trim().toLowerCase()
        : "guest";

  const amountFromBody =
    typeof body.amount === "number"
      ? body.amount
      : typeof body.token_paid === "number"
        ? body.token_paid
        : Number(body.amount ?? body.token_paid ?? 0);

  const amount = Number.isFinite(amountFromBody) ? amountFromBody : 0;
  const status =
    typeof body.status === "string" && body.status.trim().length > 0
      ? body.status.trim()
      : "paid";

  const razorpayPaymentId =
    typeof body.razorpay_payment_id === "string"
      ? body.razorpay_payment_id
      : typeof body.payment_id === "string"
        ? body.payment_id
        : "";

  if (!razorpayPaymentId) {
    return Response.json({ success: false, error: "Missing payment ID" }, { status: 400 });
  }

  const razorpayOrderId =
    typeof body.razorpay_order_id === "string"
      ? body.razorpay_order_id
      : typeof body.order_id === "string"
        ? body.order_id
        : "";

  const insertPayload = {
    email,
    customer_email: email,
    razorpay_payment_id: razorpayPaymentId || null,
    razorpay_order_id: razorpayOrderId || null,
    file_url: body.file_url ?? null,
    amount,
    status,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = getSupabaseAdmin();
    console.log("Saving order with email:", email);
    console.log("Saving order to DB:", insertPayload);
    let error: { message: string } | null = null;

    if (typeof customization !== "undefined") {
      const payloadWithCustomization = {
        ...insertPayload,
        customization,
      };

      const withCustomizationResult = await supabase
        .from("orders")
        .insert([payloadWithCustomization]);
      error = withCustomizationResult.error;

      if (error) {
        console.error("Customization save skipped");
        const fallbackResult = await supabase.from("orders").insert([insertPayload]);
        error = fallbackResult.error;
      }
    } else {
      const baseResult = await supabase.from("orders").insert([insertPayload]);
      error = baseResult.error;
    }

    if (error) {
      console.error("Supabase insert error:", error);
      console.error("Order save failed", error);
      // Payment is already successful. Do not block user success flow on DB failure.
      return Response.json({ success: true, warning: error.message });
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Order save failed", message);
    // Payment is already successful. Do not block user success flow on DB failure.
    return Response.json({ success: true, warning: message });
  }
}
