export async function GET() {
  const storeUrl = process.env.SHOPIFY_STORE_URL ?? "https://lyka3dstudio.com";

  try {
    const response = await fetch(new URL("/products.json", storeUrl), {
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { error: "Shopify request failed", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Unable to reach Shopify store" },
      { status: 500 }
    );
  }
}