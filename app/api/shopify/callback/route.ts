import { NextResponse } from "next/server";

const SHOP_DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

const isValidShopDomain = (shop: string) => {
  const normalized = shop.trim().toLowerCase();
  return SHOP_DOMAIN_REGEX.test(normalized) && normalized.endsWith(".myshopify.com");
};

type ShopifyAccessTokenResponse = {
  access_token: string;
  scope?: string;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const shopParam = url.searchParams.get("shop");
    const code = url.searchParams.get("code");

    // Reject callback requests without required query parameters.
    if (!shopParam) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: shop" },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: code" },
        { status: 400 }
      );
    }

    const shop = shopParam.trim().toLowerCase();

    // Ensure callback is only processed for a valid Shopify store domain.
    if (!isValidShopDomain(shop)) {
      return NextResponse.json(
        { success: false, error: "Invalid shop domain. Expected *.myshopify.com" },
        { status: 400 }
      );
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: "Missing Shopify OAuth credentials" },
        { status: 500 }
      );
    }

    // Exchange the temporary authorization code for a permanent access token.
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("Shopify token exchange failed", errorBody);
      return NextResponse.json(
        { success: false, error: "Failed to exchange authorization code for access token" },
        { status: 502 }
      );
    }

    const tokenPayload = (await tokenResponse.json()) as ShopifyAccessTokenResponse;

    if (!tokenPayload.access_token) {
      return NextResponse.json(
        { success: false, error: "Shopify did not return an access token" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      shop,
      access_token: tokenPayload.access_token,
      success: true,
    });
  } catch (error) {
    console.error("Shopify callback route error", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete Shopify OAuth callback" },
      { status: 500 }
    );
  }
}
