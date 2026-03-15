import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

const AUTH_COOKIE_REGEX = /^sb-.*-auth-token(?:\.\d+)?$/;

type AuthCookie = {
  name: string;
  value: string;
};

const getSupabaseAuthCookieValue = async () => {
  const cookieStore = await cookies();
  const authCookies = cookieStore
    .getAll()
    .filter((cookie: AuthCookie) => AUTH_COOKIE_REGEX.test(cookie.name));

  if (authCookies.length === 0) return null;

  // Supabase may split large auth cookies into chunks like .0, .1, etc.
  const combined = authCookies
    .sort((a: AuthCookie, b: AuthCookie) => a.name.localeCompare(b.name))
    .map((cookie: AuthCookie) => cookie.value)
    .join("");

  try {
    return decodeURIComponent(combined);
  } catch {
    return combined;
  }
};

const hasSupabaseSession = async () => {
  const rawValue = await getSupabaseAuthCookieValue();
  if (!rawValue || rawValue === "deleted") return false;

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (Array.isArray(parsed)) {
      return Boolean(parsed[0]);
    }

    if (parsed && typeof parsed === "object") {
      const maybeSession = parsed as { access_token?: string; currentSession?: { access_token?: string } };
      return Boolean(maybeSession.access_token || maybeSession.currentSession?.access_token);
    }
  } catch {
    // If parsing fails but token-like value exists, treat as authenticated.
    return rawValue.length > 20;
  }

  return false;
};

const buildQueryString = (searchParams: SearchParams) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};

export default async function Home({
  searchParams = {},
}: {
  searchParams?: SearchParams;
}) {
  const query = buildQueryString(searchParams);

  if (await hasSupabaseSession()) {
    redirect(`/dashboard${query}`);
  }

  redirect(`/login${query}`);
}
