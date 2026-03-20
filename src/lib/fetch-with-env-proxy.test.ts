import { fetchWithEnvProxy } from "./fetch-with-env-proxy";

describe("fetchWithEnvProxy", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("adds a dispatcher when HTTP_PROXY is configured", async () => {
    process.env = {
      ...originalEnv,
      HTTP_PROXY: "http://proxy.example:8080",
      HTTPS_PROXY: "",
      NO_PROXY: ""
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

    await fetchWithEnvProxy("http://example.test/feed");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://example.test/feed",
      expect.objectContaining({
        dispatcher: expect.anything()
      })
    );
  });

  it("adds a dispatcher when HTTPS_PROXY is configured", async () => {
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
      expect.objectContaining({
        next: { revalidate: 0 },
        dispatcher: expect.anything()
      })
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
});
