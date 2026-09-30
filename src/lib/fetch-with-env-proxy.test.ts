import { fetchWithEnvProxy } from "./fetch-with-env-proxy";

describe("fetchWithEnvProxy", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("leaves HTTP_PROXY handling to Node's native fetch", async () => {
    process.env = {
      ...originalEnv,
      HTTP_PROXY: "http://proxy.example:8080",
      HTTPS_PROXY: "",
      NO_PROXY: ""
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

    await fetchWithEnvProxy("http://example.test/feed");

    expect(global.fetch).toHaveBeenCalledWith("http://example.test/feed", {});
  });

  it("preserves Next fetch options when HTTPS_PROXY is configured", async () => {
    process.env = {
      ...originalEnv,
      HTTP_PROXY: "",
      HTTPS_PROXY: "http://proxy.example:8443",
      NO_PROXY: ""
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

    await fetchWithEnvProxy("https://example.test/feed", { next: { revalidate: 0 } });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/feed",
      { next: { revalidate: 0 } }
    );
  });

  it("uses plain fetch options when no proxy env vars are configured", async () => {
    process.env = {
      ...originalEnv,
      HTTP_PROXY: "",
      HTTPS_PROXY: "",
      NO_PROXY: "",
      http_proxy: "",
      https_proxy: "",
      no_proxy: ""
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

    await fetchWithEnvProxy("https://example.test/feed", { next: { revalidate: 0 } });

    expect(global.fetch).toHaveBeenCalledWith("https://example.test/feed", {
      next: { revalidate: 0 }
    });
  });

  it("does not add retry logic around native fetch failures", async () => {
    process.env = {
      ...originalEnv,
      HTTP_PROXY: "http://proxy.example:8080",
      HTTPS_PROXY: "",
      NO_PROXY: ""
    };
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as typeof fetch;

    await expect(fetchWithEnvProxy("https://example.test/feed", { next: { revalidate: 0 } })).rejects.toThrow(
      "fetch failed"
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("https://example.test/feed", {
      next: { revalidate: 0 }
    });
  });
});
