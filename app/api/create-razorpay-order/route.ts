import { NextResponse } from "next/server";
import Razorpay from "razorpay";

type CreateRazorpayOrderBody = {
  token_amount?: number;
};

export async function POST(request: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("[Razorpay API] Missing credentials");
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay keys missing",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as CreateRazorpayOrderBody;
    const tokenAmount = Number(body.token_amount);

    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
      console.error("[Razorpay API] Invalid token_amount:", body.token_amount);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token_amount",
        },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const amountInPaisa = Math.round(tokenAmount * 100);
    console.log("[Razorpay API] Creating order with amount:", amountInPaisa);

    const order = await razorpay.orders.create({
      amount: amountInPaisa,
      currency: "INR",
      receipt: "order_" + Date.now(),
    });

    console.log("[Razorpay API] Order created successfully:", order.id);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: tokenAmount,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Razorpay API] Error:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
