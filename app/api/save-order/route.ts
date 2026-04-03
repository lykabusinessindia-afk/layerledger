import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const toNonEmptyString = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const coalesce = <T>(
      nextValue: T | null | undefined,
      existingValue: T | null | undefined
    ): T | null | undefined => nextValue ?? existingValue;

    let body: Record<string, any> = {};
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const razorpay_order_id = toNonEmptyString(body.razorpay_order_id);
    const razorpay_payment_id = toNonEmptyString(body.razorpay_payment_id);

    if (!razorpay_order_id) {
      return Response.json(
        { success: false, error: "Missing razorpay_order_id" },
        { status: 400 }
      );
    }

    // 🔥 IMPORTANT: Normalize fields
    const email =
      toNonEmptyString(body.email) ??
      toNonEmptyString(body.customer_email);

    const phone =
      toNonEmptyString(body.phone) ??
      toNonEmptyString(body.customer_phone);

    const address =
      toNonEmptyString(body.address) ??
      toNonEmptyString(body.customer_address);

    const city =
      toNonEmptyString(body.city) ??
      toNonEmptyString(body.customer_city);

    const state =
      toNonEmptyString(body.state) ??
      toNonEmptyString(body.customer_state);

    const pincode =
      toNonEmptyString(body.pincode) ??
      toNonEmptyString(body.customer_pincode);

    const file_url = toNonEmptyString(body.file_url);

    const customization =
      typeof body.customization === "object" ? body.customization : null;

    const amount = Number(body.amount ?? 0);
    const status = toNonEmptyString(body.status) ?? "paid";

    // ✅ ALWAYS find by razorpay_order_id (single source of truth)
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    // ==============================
    // ✅ IF EXISTS → UPDATE ONLY
    // ==============================
    if (existingOrder) {
      const updatePayload = {
        email: coalesce(email, existingOrder.email),
        phone: coalesce(phone, existingOrder.phone),
        address: coalesce(address, existingOrder.address),
        city: coalesce(city, existingOrder.city),
        state: coalesce(state, existingOrder.state),
        pincode: coalesce(pincode, existingOrder.pincode),

        file_url: coalesce(file_url, existingOrder.file_url),
        customization: coalesce(
          customization,
          existingOrder.customization
        ),

        razorpay_payment_id: coalesce(
          razorpay_payment_id,
          existingOrder.razorpay_payment_id
        ),

        amount: coalesce(amount, existingOrder.amount),
        status: coalesce(status, existingOrder.status),
      };

      const { error } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", existingOrder.id);

      if (error) {
        console.error("Update error:", error);
        return Response.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      // 🚨 VERY IMPORTANT: STOP HERE (NO INSERT)
      return Response.json({ success: true, updated: true });
    }

    // ==============================
    // ✅ INSERT ONLY ONCE
    // ==============================
    const insertPayload = {
      razorpay_order_id,
      razorpay_payment_id,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      file_url,
      customization,
      amount,
      status,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("orders")
      .insert([insertPayload]);

    if (error) {
      console.error("Insert error:", error);
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, inserted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Order save failed:", message);

    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}