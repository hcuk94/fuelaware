type ProxyAwareRequestInit = RequestInit & {
  next?: {
    revalidate?: number | false;
  };
};

export async function fetchWithEnvProxy(input: string | URL | Request, init: ProxyAwareRequestInit = {}) {
  return fetch(input, init);
}
