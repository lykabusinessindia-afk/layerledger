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

    const contentType = shopifyResponse.headers.get("content-type") ?? "";
    const responseBody = contentType.includes("application/json")
      ? await shopifyResponse.json()
      : await shopifyResponse.text();

    console.log("Shopify create-product response", {
      status: shopifyResponse.status,
      body: responseBody,
    });

    if (!shopifyResponse.ok) {
      const errorMessage =
        typeof responseBody === "string"
          ? responseBody
          : responseBody?.errors
            ? JSON.stringify(responseBody.errors)
            : JSON.stringify(responseBody);

      console.error("Shopify create-product API error", {
        status: shopifyResponse.status,
        error: errorMessage,
      });

      return NextResponse.json(
        {
          error: "Failed to create Shopify product",
          details: errorMessage,
          status: shopifyResponse.status,
        },
        { status: shopifyResponse.status }
      );
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Shopify create-product route error", error);
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { error: "Failed to create Shopify product", details: message },
      { status: 500 }
    );
  }
}