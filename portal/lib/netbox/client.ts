import type { NetBoxList } from "./types.js";

export class NetBoxError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    message: string,
  ) {
    super(`NetBox ${path} → ${status}: ${message}`);
    this.name = "NetBoxError";
  }
}

export class NetBoxClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  private headers() {
    return {
      Authorization: `Token ${this.token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}/api/${path.replace(/^\//, "")}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new NetBoxError(res.status, path, body.slice(0, 200));
    }
    return res.json() as Promise<T>;
  }

  // Fetch all pages for a list endpoint, following next-page links.
  async fetchAll<T>(path: string, params?: Record<string, string>): Promise<T[]> {
    const query = params
      ? "?" + new URLSearchParams({ limit: "200", ...params }).toString()
      : "?limit=200";

    let url: string | null = `${this.baseUrl}/api/${path.replace(/^\//, "")}${query}`;
    const results: T[] = [];

    while (url) {
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new NetBoxError(res.status, path, body.slice(0, 200));
      }
      const page = (await res.json()) as NetBoxList<T>;
      results.push(...page.results);
      url = page.next;
    }

    return results;
  }

  // Convenience: build a client from environment variables.
  // Throws if either var is missing, so misconfiguration is loud.
  static fromEnv(): NetBoxClient {
    const url = process.env.NETBOX_URL;
    const token = process.env.NETBOX_TOKEN;
    if (!url || !token) {
      throw new Error(
        "NetBoxClient.fromEnv: NETBOX_URL and NETBOX_TOKEN must be set",
      );
    }
    return new NetBoxClient(url, token);
  }
}
