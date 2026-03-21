import { NextResponse } from "next/server";

type CreateShopifyOrderBody = {
  token_amount?: number;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_pincode?: string;
};

const normalizeStoreUrl = (storeUrl: string) => {
  const trimmed = storeUrl.trim();
  if (!trimmed) {
    throw new Error("Missing SHOPIFY_STORE_URL");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateShopifyOrderBody;
    const customerEmail = body.customer_email?.trim() || undefined;

    // Validate customer email is provided before creating order
    if (!customerEmail) {
      console.error("[Shopify] Cannot create order without customer email");
      return NextResponse.json(
        { success: false, error: "Customer email is required" },
        { status: 400 }
      );
    }

    const tokenAmount = Number(body.token_amount);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const storeUrl = normalizeStoreUrl(process.env.SHOPIFY_STORE_URL ?? "");
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const endpoint = `${storeUrl}/admin/api/2025-01/orders.json`;
    const customerSearchEndpoint = `${storeUrl}/admin/api/2025-01/customers/search.json?query=${encodeURIComponent(`email:${customerEmail}`)}`;
    const customerCreateEndpoint = `${storeUrl}/admin/api/2025-01/customers.json`;

    console.log("[Shopify] Creating order with email:", customerEmail);

    const customerSearchResponse = await fetch(customerSearchEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      cache: "no-store",
    });

    const customerSearchJson = (await customerSearchResponse.json()) as {
      customers?: Array<{ id?: number; email?: string }>;
    };

    if (!customerSearchResponse.ok) {
      console.error("Shopify customer lookup failed", {
        status: customerSearchResponse.status,
        response: customerSearchJson,
      });
      return NextResponse.json({ success: false }, { status: 500 });
    }

    let customerId =
      customerSearchJson.customers?.find(
        (customer) => (customer.email ?? "").toLowerCase() === customerEmail.toLowerCase()
      )?.id ?? customerSearchJson.customers?.[0]?.id;

    if (!customerId) {
      const customerCreateResponse = await fetch(customerCreateEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          customer: {
            email: customerEmail,
            first_name: "Customer",
            last_name: "LYKA",
          },
        }),
        cache: "no-store",
      });

      const customerCreateJson = (await customerCreateResponse.json()) as {
        customer?: { id?: number };
      };

      if (!customerCreateResponse.ok) {
        console.error("Shopify customer creation failed", {
          status: customerCreateResponse.status,
          response: customerCreateJson,
        });
        return NextResponse.json({ success: false }, { status: 500 });
      }

      customerId = customerCreateJson.customer?.id;
    }

    if (!customerId) {
      console.error("Shopify customer id missing after lookup/create", { customerEmail });
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const payload = {
      order: {
        email: customerEmail,
        customer: { id: customerId },
        financial_status: "paid",
        transactions: [
          {
            kind: "sale",
            status: "success",
            amount: tokenAmount,
          },
        ],
        phone: body.customer_phone?.trim() || undefined,
        billing_address: {
          address1: body.customer_address?.trim() || undefined,
          city: body.customer_city?.trim() || undefined,
          province: body.customer_state?.trim() || undefined,
          zip: body.customer_pincode?.trim() || undefined,
          country: "IN",
        },
        line_items: [
          {
            title: "Custom 3D Print Order",
            price: tokenAmount,
            quantity: 1,
          },
        ],
        note: "This is an advance payment. Final price will be confirmed after model slicing.",
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const responseJson = (await response.json()) as { order?: { id?: number } };

    if (!response.ok || !responseJson.order?.id) {
      console.error("Create Shopify order failed", {
        status: response.status,
        response: responseJson,
      });
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      shopify_order_id: responseJson.order.id,
    });
  } catch (error) {
    console.error("Create Shopify order route error", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
