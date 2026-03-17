import { NextResponse } from "next/server";

type CreateProductRequest = {
  title: string;
  price: string;
  weight: string;
  time: string;
  material: string;
  stlUrl: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildProductBodyHtml = (payload: CreateProductRequest) => {
  const title = escapeHtml(payload.title);
  const weight = escapeHtml(payload.weight);
  const time = escapeHtml(payload.time);
  const material = escapeHtml(payload.material);
  const stlUrl = escapeHtml(payload.stlUrl);

  return `
    <h2>${title}</h2>
    <p>Custom 3D print order created through LayerLedger.</p>
    <ul>
      <li><strong>Estimated weight:</strong> ${weight}</li>
      <li><strong>Estimated print time:</strong> ${time}</li>
      <li><strong>Material:</strong> ${material}</li>
      <li><strong>STL file:</strong> <a href="${stlUrl}" target="_blank" rel="noopener noreferrer">View uploaded model</a></li>
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
    console.log("Shopify create-product request body", body);

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

    if (!body.title || !body.price || !body.weight || !body.time || !body.material || !body.stlUrl) {
      return NextResponse.json(
        { error: "Missing required fields: title, price, weight, time, material, stlUrl" },
        { status: 400 }
      );
    }

    const payload = {
      product: {
        title: body.title,
        body_html: buildProductBodyHtml(body as CreateProductRequest),
        vendor: "LYKA 3D Studio",
        product_type: "3D Print",
        variants: [
          {
            price: body.price,
            inventory_management: "shopify",
            inventory_quantity: 1,
          },
        ],
      },
    };

    const endpoint = new URL("/admin/api/2024-01/products.json", storeUrl);
    console.log("Shopify create-product before API call", {
      endpoint: endpoint.toString(),
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

      console.log("Shopify create-product after API call", {
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

      try {
        const responseJson = responseText ? JSON.parse(responseText) : {};
        return NextResponse.json(responseJson);
      } catch {
        return NextResponse.json({ raw: responseText });
      }
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