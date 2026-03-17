import { NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreateProductRequest>;

    if (!body.title || !body.price || !body.weight || !body.time || !body.material || !body.stlUrl) {
      return NextResponse.json(
        { error: "Missing required fields: title, price, weight, time, material, stlUrl" },
        { status: 400 }
      );
    }

    const createdProduct = await shopifyFetch("/products.json", {
      method: "POST",
      body: {
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
      },
    });

    return NextResponse.json(createdProduct);
  } catch (error) {
    console.error("Shopify create-product route error", error);
    return NextResponse.json(
      { error: "Failed to create Shopify product" },
      { status: 500 }
    );
  }
}