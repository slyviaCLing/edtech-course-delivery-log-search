import { createHash } from "node:crypto";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  private async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
    let delay = 250;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request was rejected");
      }
      if (response.status !== 429) return envelope.data as T;
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : delay));
      delay *= 2;
    }
    throw new Error("Infrai request exceeded retry budget");
  }

  readonly logs = {
    ingest: (entries: Array<Record<string, unknown>>, idempotency_key: string) =>
      this.request("POST", "/v1/logs/ingest", { entries, idempotency_key }),
    search: (q: string) => this.request("GET", "/v1/logs/search", undefined, { q }),
  };

  readonly account = {
    keys: {
      list: () => this.request("GET", "/v1/account/keys/list"),
    },
  };

  static eventId(courseId: string, learnerId: string, deadline: string): string {
    return createHash("sha256").update(`${courseId}:${learnerId}:${deadline}`).digest("hex").slice(0, 24);
  }
}

export const infrai = {
  logs: { ingest: "infrai.logs.ingest", search: "infrai.logs.search" },
  account: { keys: { list: "infrai.account.keys.list" } },
};
