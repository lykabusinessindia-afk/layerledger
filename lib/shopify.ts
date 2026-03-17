type ShopifyFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  apiVersion?: string;
  cache?: RequestCache;
};

const DEFAULT_API_VERSION = "2025-01";

const normalizeStoreUrl = (storeUrl: string) => {
  const trimmed = storeUrl.trim();
  if (!trimmed) {
    throw new Error("Missing SHOPIFY_STORE_URL environment variable");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
};

export async function shopifyFetch(path: string, options: ShopifyFetchOptions = {}) {
  const storeUrl = normalizeStoreUrl(process.env.SHOPIFY_STORE_URL ?? "");
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    throw new Error("Missing SHOPIFY_ACCESS_TOKEN environment variable");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiVersion = options.apiVersion ?? DEFAULT_API_VERSION;
  const endpoint = new URL(`/admin/api/${apiVersion}${normalizedPath}`, storeUrl);

  const headers = new Headers(options.headers);
  headers.set("X-Shopify-Access-Token", accessToken);
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(endpoint, {
    method: options.method ?? "GET",
    headers,
    body,
    cache: options.cache ?? "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorMessage =
      typeof responseBody === "string"
        ? responseBody
        : JSON.stringify(responseBody);
    throw new Error(`Shopify API request failed (${response.status}): ${errorMessage}`);
  }

  return responseBody;
}