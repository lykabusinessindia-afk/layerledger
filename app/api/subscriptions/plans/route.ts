import { NextResponse } from "next/server";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptions";

export async function GET() {
  return NextResponse.json({ plans: Object.values(SUBSCRIPTION_PLANS) });
}
