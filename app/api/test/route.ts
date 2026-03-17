import { shopifyFetch } from "@/lib/shopify";

export async function GET() {
  try {
    const data = await shopifyFetch("/products.json");
    return Response.json(data);
  } catch (error) {
    console.error("Shopify test route error", error);
    return Response.json(
      { error: "Unable to reach Shopify Admin API" },
      { status: 500 }
    );
  }
}