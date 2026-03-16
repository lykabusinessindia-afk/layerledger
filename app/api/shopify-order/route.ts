import { NextResponse } from "next/server";

type ShopifyOrderRequest = {
  modelName: string;
  filamentUsage: string;
  printTime: string;
  printer: string;
  material: string;
  modelDimensions: string;
  stlFileUrl: string;
  estimatedPrice: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ShopifyOrderRequest>;

    const variantIdRaw = process.env.SHOPIFY_VARIANT_ID || process.env.NEXT_PUBLIC_SHOPIFY_VARIANT_ID;
    if (!variantIdRaw) {
      return NextResponse.json({ error: "Missing Shopify variant configuration" }, { status: 500 });
    }

    const variantId = Number(variantIdRaw);
    if (!Number.isFinite(variantId) || variantId <= 0) {
      return NextResponse.json({ error: "Invalid Shopify variant configuration" }, { status: 500 });
    }

    if (!body.modelName || !body.stlFileUrl) {
      return NextResponse.json({ error: "Model name and uploaded file URL are required" }, { status: 400 });
    }

    const storefrontBase = (process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL || "").trim();
    const cartAddUrl = storefrontBase ? `${storefrontBase}/cart/add.js` : "/cart/add.js";
    const checkoutUrl = storefrontBase ? `${storefrontBase}/checkout` : "/checkout";

    const payload = {
      id: variantId,
      quantity: 1,
      properties: {
        model_name: body.modelName,
        filament_usage: body.filamentUsage || "0.00 g",
        print_time: body.printTime || "0.00 hrs",
        printer: body.printer || "Unknown Printer",
        material: body.material || "Unknown Material",
        model_dimensions: body.modelDimensions || "0 x 0 x 0 mm",
        stl_file_url: body.stlFileUrl,
        product_name: "3D Print Job",
        estimated_price: body.estimatedPrice || "0.00",
      },
    };

    return NextResponse.json({ cartAddUrl, checkoutUrl, payload });
  } catch (error) {
    console.error("Shopify order route error", error);
    return NextResponse.json({ error: "Failed to prepare Shopify order" }, { status: 500 });
  }
}
