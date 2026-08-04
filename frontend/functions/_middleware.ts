interface ProxyEnvironment {
  API_ORIGIN: string;
  INTERNAL_PROXY_SECRET: string;
}

interface PagesContext {
  request: Request;
  env: ProxyEnvironment;
}

type UpstreamFetch = (request: Request) => Promise<Response>;

const PROXY_PATH = /^\/(?:api|t|r|qr)(?:\/|$)/;
const QR_PATH = /^\/(?:t|r|qr)(?:\/|$)/;
const QR_FALLBACK_STATUSES = new Set([429, 500, 502, 503, 504]);

function unavailableApiResponse(): Response {
  return Response.json(
    { detail: "API temporarily unavailable" },
    {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function qrFallbackResponse(requestUrl: URL): Response {
  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control": "no-store, private, max-age=0",
      Location: `${requestUrl.origin}/enlaces?qr=1`,
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function upstreamUrl(requestUrl: URL, configuredOrigin: string): URL {
  const origin = new URL(configuredOrigin);
  const isLocalDevelopment =
    origin.hostname === "localhost" || origin.hostname === "127.0.0.1";

  if (origin.protocol !== "https:" && !isLocalDevelopment) {
    throw new Error("API_ORIGIN must use HTTPS");
  }

  return new URL(`${requestUrl.pathname}${requestUrl.search}`, origin);
}

export async function proxyRequest(
  request: Request,
  env: ProxyEnvironment,
  upstreamFetch: UpstreamFetch = (upstreamRequest) => fetch(upstreamRequest),
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const isQrRequest = QR_PATH.test(requestUrl.pathname);

  if (!PROXY_PATH.test(requestUrl.pathname)) {
    return new Response("Not Found", { status: 404 });
  }

  if (!env.API_ORIGIN || !env.INTERNAL_PROXY_SECRET) {
    return isQrRequest
      ? qrFallbackResponse(requestUrl)
      : unavailableApiResponse();
  }

  try {
    const headers = new Headers(request.headers);
    const clientIp = headers.get("CF-Connecting-IP");
    headers.delete("host");
    headers.delete("X-QRHub-Client-IP");
    headers.set("X-QRHub-Proxy-Secret", env.INTERNAL_PROXY_SECRET);
    headers.set("X-Forwarded-Host", requestUrl.host);
    headers.set("X-Forwarded-Proto", requestUrl.protocol.slice(0, -1));
    if (clientIp) {
      headers.set("X-QRHub-Client-IP", clientIp);
      headers.set("X-Real-IP", clientIp);
      headers.set("X-Forwarded-For", clientIp);
    }

    const timeout = isQrRequest ? 3_000 : 15_000;
    const forwardedRequest = new Request(
      upstreamUrl(requestUrl, env.API_ORIGIN),
      new Request(request, {
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(timeout),
      }),
    );
    const upstreamResponse = await upstreamFetch(forwardedRequest);

    if (
      isQrRequest &&
      QR_FALLBACK_STATUSES.has(upstreamResponse.status)
    ) {
      return qrFallbackResponse(requestUrl);
    }

    const responseHeaders = new Headers(upstreamResponse.headers);
    const bridgedCookie = responseHeaders.get("X-QRHub-Set-Cookie");
    responseHeaders.delete("X-QRHub-Set-Cookie");
    if (bridgedCookie) {
      responseHeaders.delete("Set-Cookie");
      responseHeaders.append("Set-Cookie", bridgedCookie);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch {
    return isQrRequest
      ? qrFallbackResponse(requestUrl)
      : unavailableApiResponse();
  }
}

export function onRequest(context: PagesContext): Promise<Response> {
  return proxyRequest(context.request, context.env);
}
