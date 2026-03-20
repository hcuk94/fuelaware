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

export async function fetchWithEnvProxy(input: string | URL | Request, init: ProxyAwareRequestInit = {}) {
  const dispatcher = getProxyDispatcher();
  const requestInit = dispatcher ? { ...init, dispatcher } : init;
  return fetch(input, requestInit as RequestInit);
}
