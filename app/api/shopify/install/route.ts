import { NextResponse } from "next/server";

const SHOP_DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

const isValidShopDomain = (shop: string) => {
  const normalized = shop.trim().toLowerCase();
  return SHOP_DOMAIN_REGEX.test(normalized) && normalized.endsWith(".myshopify.com");
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const shopParam = url.searchParams.get("shop");

    // Reject install requests that do not include a shop domain.
    if (!shopParam) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: shop" },
        { status: 400 }
      );
    }

    const shop = shopParam.trim().toLowerCase();

    // Enforce Shopify shop domain format for security.
    if (!isValidShopDomain(shop)) {
      return NextResponse.json(
        { success: false, error: "Invalid shop domain. Expected *.myshopify.com" },
        { status: 400 }
      );
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const scopes = process.env.SHOPIFY_SCOPES;
    const appUrl = process.env.SHOPIFY_APP_URL;

    if (!clientId || !scopes || !appUrl) {
      return NextResponse.json(
        { success: false, error: "Missing Shopify OAuth environment configuration" },
        { status: 500 }
      );
    }

    const redirectUri = `${appUrl.replace(/\/$/, "")}/api/shopify/callback`;

    // Build the Shopify authorization URL and send the user to install/authorize.
    const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("scope", scopes);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);

    return NextResponse.redirect(authorizeUrl.toString());
  } catch (error) {
    console.error("Shopify install route error", error);
    return NextResponse.json(
      { success: false, error: "Failed to start Shopify OAuth install flow" },
      { status: 500 }
    );
  }
}
