import { NextResponse } from "next/server";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return NextResponse.json(
      { success: false, error: "Missing NEXT_PUBLIC_SITE_URL" },
      { status: 500 }
    );
  }

  const target = `${siteUrl.replace(/\/$/, "")}/login?oauth=google`;
  return NextResponse.redirect(target);
}
