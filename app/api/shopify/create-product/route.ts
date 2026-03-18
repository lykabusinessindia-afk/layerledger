import { NextResponse } from "next/server";

type CreateProductRequest = {
  title?: string;
  price: string;
  weight?: string;
  time?: string;
  material?: string;
  stlUrl?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildProductBodyHtml = (payload: CreateProductRequest) => {
  const title = escapeHtml(payload.title ?? "3D Print Order");
  const weight = escapeHtml(payload.weight ?? "Not provided");
  const time = escapeHtml(payload.time ?? "Not provided");
  const material = escapeHtml(payload.material ?? "Not provided");
  const stlUrl = escapeHtml(payload.stlUrl ?? "");

  return `
    <h2>${title}</h2>
    <p>Custom 3D print order created through LayerLedger.</p>
    <ul>
      <li><strong>Estimated weight:</strong> ${weight}</li>
      <li><strong>Estimated print time:</strong> ${time}</li>
      <li><strong>Material:</strong> ${material}</li>
      ${stlUrl ? `<li><strong>STL file:</strong> <a href="${stlUrl}" target="_blank" rel="noopener noreferrer">View uploaded model</a></li>` : ""}
    </ul>
  `.trim();
};

const normalizeStoreUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreateProductRequest>;
    console.log("[create-product] incoming request", body);

    const storeUrl = normalizeStoreUrl(process.env.SHOPIFY_STORE_URL ?? "");
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim() ?? "";

    if (!storeUrl) {
      return NextResponse.json(
        { error: "Missing SHOPIFY_STORE_URL environment variable" },
        { status: 500 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing SHOPIFY_ACCESS_TOKEN environment variable" },
        { status: 500 }
      );
    }

    if (!body.price) {
      return NextResponse.json(
        { error: "Missing required field: price" },
        { status: 400 }
      );
    }

    const payload = {
      product: {
        title: body.title ?? "3D Print Order",
        body_html: body.stlUrl || body.material || body.time || body.weight
          ? buildProductBodyHtml(body as CreateProductRequest)
          : "Custom STL print",
        vendor: "LayerLedger",
        product_type: "3D Print",
        variants: [
          {
            price: body.price,
          },
        ],
      },
    };

    const endpoint = `${storeUrl}/admin/api/2024-01/products.json`;
    console.log("[create-product] Shopify API request", {
      endpoint,
      payload,
    });

    try {
      const shopifyResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const responseText = await shopifyResponse.text();

      console.log("[create-product] Shopify API response", {
        status: shopifyResponse.status,
        body: responseText,
      });

      if (!shopifyResponse.ok) {
        console.error("Shopify create-product API error", {
          status: shopifyResponse.status,
          details: responseText,
        });

        return NextResponse.json(
          {
            error: "Shopify API failed",
            status: shopifyResponse.status,
            details: responseText,
          },
          { status: shopifyResponse.status }
        );
      }

      const responseJson = responseText ? (JSON.parse(responseText) as { product?: { id?: number; handle?: string } }) : {};
      const product = responseJson.product;

      if (!product?.id || !product.handle) {
        return NextResponse.json(
          {
            error: "Shopify product created but response missing id/handle",
            details: responseJson,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        product: {
          id: product.id,
          handle: product.handle,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Shopify fetch error";
      console.error("Shopify create-product fetch error", message);
      return NextResponse.json(
        {
          error: "Shopify API failed",
          status: 500,
          details: message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Shopify create-product route error", error);
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { error: "Route failed", status: 500, details: message },
      { status: 500 }
    );
  }
}