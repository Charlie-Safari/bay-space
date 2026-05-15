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

function hasPlaceholderValue(value: string) {
  return /your-|your_|project-ref|project-id|example/i.test(value);
}

function getSupabaseServerConfig() {
  if (typeof window !== "undefined") {
    throw new SupabaseServerError(
      "Supabase server client cannot run in the browser.",
    );
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serverKey = (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ""
  ).trim();

  if (!url || !serverKey) {
    throw new SupabaseServerError(
      "Supabase server storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.",
      503,
    );
  }

  if (hasPlaceholderValue(url) || hasPlaceholderValue(serverKey)) {
    throw new SupabaseServerError(
      "Supabase server storage is using placeholder values. Replace NEXT_PUBLIC_SUPABASE_URL and the server key in .env.local with real Supabase project values.",
      503,
    );
  }

  return {
    serverKey,
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

function getAuthHeaders(serverKey: string) {
  const headers: Record<string, string> = {
    apikey: serverKey,
  };

  if (!serverKey.startsWith("sb_secret_")) {
    headers.authorization = `Bearer ${serverKey}`;
  }

  return headers;
}

export async function supabaseRequest<T>(
  path: string,
  options: SupabaseRequestOptions = {},
) {
  const { serverKey } = getSupabaseServerConfig();
  let response: Response;

  try {
    response = await fetch(getRequestUrl(path, options.query), {
      method: options.method ?? "GET",
      cache: "no-store",
      headers: {
        ...getAuthHeaders(serverKey),
        "content-type": "application/json",
        ...(options.prefer ? { prefer: options.prefer } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new SupabaseServerError(
      "Unable to reach Supabase REST API. Check NEXT_PUBLIC_SUPABASE_URL and local network access.",
      503,
    );
  }

  if (!response.ok) {
    throw new SupabaseServerError(
      await getErrorMessage(response),
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text.trim()) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
