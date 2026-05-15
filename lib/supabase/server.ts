type SupabaseQuery = Record<string, string | number | boolean | undefined>;

type SupabaseRequestOptions = {
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  prefer?: string;
  query?: SupabaseQuery;
};

export class SupabaseServerError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "SupabaseServerError";
    this.status = status;
  }
}

function getSupabaseServerConfig() {
  if (typeof window !== "undefined") {
    throw new SupabaseServerError(
      "Supabase service role client cannot run in the browser.",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !anonKey || !serviceRoleKey) {
    throw new SupabaseServerError(
      "Supabase server storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
      503,
    );
  }

  return {
    anonKey,
    serviceRoleKey,
    url: url.replace(/\/$/, ""),
  };
}

function getRequestUrl(path: string, query: SupabaseQuery = {}) {
  const { url } = getSupabaseServerConfig();
  const requestUrl = new URL(`/rest/v1/${path.replace(/^\//, "")}`, url);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      requestUrl.searchParams.set(key, String(value));
    }
  });

  return requestUrl;
}

async function getErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as {
      details?: string;
      hint?: string;
      message?: string;
    };

    return data.message ?? data.details ?? data.hint ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function supabaseRequest<T>(
  path: string,
  options: SupabaseRequestOptions = {},
) {
  const { serviceRoleKey } = getSupabaseServerConfig();
  const response = await fetch(getRequestUrl(path, options.query), {
    method: options.method ?? "GET",
    cache: "no-store",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new SupabaseServerError(
      await getErrorMessage(response),
      response.status,
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
