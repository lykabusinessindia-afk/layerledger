import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = new URL(request.url);
  const callbackUrlParam = url.searchParams.get("callbackUrl") ?? "/calculator";

  const safeCallbackUrl =
    callbackUrlParam.startsWith("/") && !callbackUrlParam.startsWith("//")
      ? callbackUrlParam
      : "/calculator";

  const loginUrl = new URL("/login", baseUrl);
  loginUrl.searchParams.set("oauth", "google");
  loginUrl.searchParams.set("callbackUrl", safeCallbackUrl);

  return NextResponse.redirect(loginUrl);
}
