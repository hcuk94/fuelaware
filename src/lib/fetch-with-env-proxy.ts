import { EnvHttpProxyAgent, type Dispatcher } from "undici";

type ProxyAwareRequestInit = RequestInit & {
  next?: {
    revalidate?: number | false;
  };
  dispatcher?: Dispatcher;
};

let cachedDispatcher: Dispatcher | undefined;
let cachedProxyConfig = "";

function getProxyConfigKey() {
  return [
    process.env.HTTP_PROXY ?? "",
    process.env.HTTPS_PROXY ?? "",
    process.env.NO_PROXY ?? "",
    process.env.http_proxy ?? "",
    process.env.https_proxy ?? "",
    process.env.no_proxy ?? ""
  ].join("|");
}

function getProxyDispatcher() {
  const proxyConfig = getProxyConfigKey();
  if (!proxyConfig.replaceAll("|", "")) {
    cachedDispatcher = undefined;
    cachedProxyConfig = "";
    return undefined;
  }

  if (cachedDispatcher && cachedProxyConfig === proxyConfig) {
    return cachedDispatcher;
  }

  cachedProxyConfig = proxyConfig;
  cachedDispatcher = new EnvHttpProxyAgent();
  return cachedDispatcher;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return [error.message, getErrorMessage((error as Error & { cause?: unknown }).cause)].filter(Boolean).join(" ");
  }

  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "";
}

function isLikelyProxyTunnelFailure(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("proxy response") ||
    message.includes("http tunneling") ||
    message.includes("tunnel") ||
    message.includes("und_err_aborted")
  );
}

export async function fetchWithEnvProxy(input: string | URL | Request, init: ProxyAwareRequestInit = {}) {
  const dispatcher = getProxyDispatcher();
  const requestInit = dispatcher ? { ...init, dispatcher } : init;

  try {
    return await fetch(input, requestInit as RequestInit);
  } catch (error) {
    if (!dispatcher || !isLikelyProxyTunnelFailure(error)) {
      throw error;
    }

    return fetch(input, init as RequestInit);
  }
}
