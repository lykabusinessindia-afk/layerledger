import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type InsertOrderRecordPayload = {
  email?: string;
  order_id?: number;
  amount?: number;
  status?: string;
};

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[Insert Order Record] Supabase environment variables are missing");
      return NextResponse.json(
        { success: false, error: "Supabase env missing" },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log("RECEIVED BODY:", body);

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase.from("orders").insert({
      customer_email: body.email,
      phone: body.phone,
      address: body.address,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      amount: body.amount,
      status: body.status,
      payment_id: `shopify-${body.order_id || body.id || null}`,
    });

    if (error) {
      console.error("[Insert Order Record] Error:", error);
      // Don't return error to client since this is non-blocking
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.log("[Insert Order Record] Order record inserted successfully", {
      email: body?.email,
      order_id: body?.order_id || body?.id || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Insert Order Record] Route error:", error);
    // Don't block client - this is fire-and-forget
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
