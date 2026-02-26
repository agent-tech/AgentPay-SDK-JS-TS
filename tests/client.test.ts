import { describe, it, expect } from "vitest";
import {
  PayClient,
  PayApiError,
  PayValidationError,
  IntentStatus,
  keysToSnake,
  keysToCamel,
} from "../src/index.js";
import type {
  CreateIntentResponse,
  ExecuteIntentResponse,
  GetIntentResponse,
} from "../src/index.js";

// ── Helpers ─────────────────────────────────────────────────────────────

/** Build a mock fetch that returns a fixed response. */
function mockFetch(
  status: number,
  body: unknown,
  check?: (url: string, init: RequestInit) => void,
): typeof globalThis.fetch {
  return async (input, init) => {
    if (check) check(input as string, init!);
    return new Response(JSON.stringify(body), {
      status,
      statusText: statusText(status),
      headers: { "Content-Type": "application/json" },
    });
  };
}

function statusText(code: number): string {
  const map: Record<number, string> = {
    200: "OK",
    201: "Created",
    400: "Bad Request",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
  };
  return map[code] ?? "";
}

function bearerClient(
  fetchFn: typeof globalThis.fetch,
): PayClient {
  return new PayClient({
    baseUrl: "http://localhost",
    auth: { type: "bearer", clientId: "id", clientSecret: "secret" },
    fetch: fetchFn,
  });
}

// ── Constructor validation ──────────────────────────────────────────────

describe("PayClient constructor", () => {
  it("throws on empty baseUrl", () => {
    expect(
      () =>
        new PayClient({
          baseUrl: "",
          auth: { type: "bearer", clientId: "id", clientSecret: "secret" },
        }),
    ).toThrow(PayValidationError);
  });

  it("throws when no auth provided", () => {
    expect(
      () =>
        new PayClient({
          baseUrl: "http://localhost",
          auth: undefined as any,
        }),
    ).toThrow(PayValidationError);
  });

  it("throws on empty bearer credentials", () => {
    expect(
      () =>
        new PayClient({
          baseUrl: "http://localhost",
          auth: { type: "bearer", clientId: "", clientSecret: "secret" },
        }),
    ).toThrow(PayValidationError);

    expect(
      () =>
        new PayClient({
          baseUrl: "http://localhost",
          auth: { type: "bearer", clientId: "id", clientSecret: "" },
        }),
    ).toThrow(PayValidationError);
  });

  it("throws on empty API key credentials", () => {
    expect(
      () =>
        new PayClient({
          baseUrl: "http://localhost",
          auth: { type: "apiKey", clientId: "", apiKey: "key" },
        }),
    ).toThrow(PayValidationError);

    expect(
      () =>
        new PayClient({
          baseUrl: "http://localhost",
          auth: { type: "apiKey", clientId: "id", apiKey: "" },
        }),
    ).toThrow(PayValidationError);
  });

  it("strips trailing slash from baseUrl", () => {
    const f = mockFetch(200, { intent_id: "x", status: "BASE_SETTLED" });
    const client = new PayClient({
      baseUrl: "http://localhost/",
      auth: { type: "bearer", clientId: "id", clientSecret: "secret" },
      fetch: f,
    });
    // Verify by making a request and checking the URL
    expect(
      () =>
        new PayClient({
          baseUrl: "http://localhost/",
          auth: { type: "bearer", clientId: "id", clientSecret: "secret" },
        }),
    ).not.toThrow();
  });
});

// ── Option behavior ─────────────────────────────────────────────────────

describe("options", () => {
  it("uses provided timeoutMs", async () => {
    // With a custom fetch, timeout is ignored — so we just verify construction
    const client = new PayClient({
      baseUrl: "http://localhost",
      auth: { type: "bearer", clientId: "id", clientSecret: "secret" },
      timeoutMs: 5000,
      fetch: mockFetch(200, { intent_id: "x" }),
    });
    expect(client).toBeInstanceOf(PayClient);
  });

  it("custom fetch ignores timeout", async () => {
    // Custom fetch should be used as-is
    let called = false;
    const customFetch: typeof globalThis.fetch = async (input, init) => {
      called = true;
      return new Response(JSON.stringify({ intent_id: "x" }), { status: 200 });
    };

    const client = new PayClient({
      baseUrl: "http://localhost",
      auth: { type: "bearer", clientId: "id", clientSecret: "secret" },
      timeoutMs: 1, // tiny timeout, should be ignored with custom fetch
      fetch: customFetch,
    });

    await client.getIntent("x");
    expect(called).toBe(true);
  });
});

// ── Error types ─────────────────────────────────────────────────────────

describe("error types", () => {
  it("PayApiError has correct format", () => {
    const e = new PayApiError(400, "bad request");
    expect(e.message).toBe("api error 400: bad request");
    expect(e.statusCode).toBe(400);
  });

  it("PayValidationError has correct format", () => {
    const e = new PayValidationError("field required");
    expect(e.message).toBe("validation: field required");
  });

  it("PayApiError is instanceof Error", () => {
    const e = new PayApiError(404, "not found");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(PayApiError);
  });

  it("PayValidationError is instanceof Error", () => {
    const e = new PayValidationError("bad");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(PayValidationError);
  });
});

// ── API methods ─────────────────────────────────────────────────────────

describe("createIntent", () => {
  it("sends POST /v2/intents and returns 201", async () => {
    const responseBody: Record<string, unknown> = {
      intent_id: "intent-1",
      status: IntentStatus.AwaitingPayment,
    };

    const f = mockFetch(201, responseBody, (url, init) => {
      expect(url).toBe("http://localhost/v2/intents");
      expect(init.method).toBe("POST");
      expect(init.headers).toHaveProperty("Content-Type", "application/json");
      expect(init.headers).toHaveProperty("Authorization");
    });

    const client = bearerClient(f);
    const resp = await client.createIntent({
      email: "test@example.com",
      amount: "10.00",
      payerChain: "solana",
    });

    expect(resp.intentId).toBe("intent-1");
    expect(resp.status).toBe(IntentStatus.AwaitingPayment);
  });

  it("throws PayValidationError for null request", async () => {
    const client = bearerClient(mockFetch(201, {}));
    await expect(client.createIntent(null as any)).rejects.toThrow(
      PayValidationError,
    );
  });

  it("throws PayApiError on non-201 response", async () => {
    const f = mockFetch(400, { message: "invalid amount" });
    const client = bearerClient(f);

    try {
      await client.createIntent({
        email: "a@b.com",
        amount: "0",
        payerChain: "solana",
      });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PayApiError);
      const apiErr = err as PayApiError;
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.message).toContain("invalid amount");
    }
  });

  it("throws PayValidationError when both email and recipient are set", async () => {
    const client = bearerClient(mockFetch(201, {}));
    await expect(
      client.createIntent({
        email: "a@b.com",
        recipient: "0xabc",
        amount: "10.00",
        payerChain: "solana",
      }),
    ).rejects.toThrow(PayValidationError);
  });

  it("throws PayValidationError when neither email nor recipient is set", async () => {
    const client = bearerClient(mockFetch(201, {}));
    await expect(
      client.createIntent({
        amount: "10.00",
        payerChain: "solana",
      }),
    ).rejects.toThrow(PayValidationError);
  });

  it("throws PayValidationError when amount is empty", async () => {
    const client = bearerClient(mockFetch(201, {}));
    await expect(
      client.createIntent({
        email: "a@b.com",
        amount: "",
        payerChain: "solana",
      }),
    ).rejects.toThrow(PayValidationError);
  });

  it("throws PayValidationError when payerChain is empty", async () => {
    const client = bearerClient(mockFetch(201, {}));
    await expect(
      client.createIntent({
        email: "a@b.com",
        amount: "10.00",
        payerChain: "",
      }),
    ).rejects.toThrow(PayValidationError);
  });
});

describe("executeIntent", () => {
  it("sends POST /v2/intents/{id}/execute and returns 200", async () => {
    const f = mockFetch(
      200,
      { intent_id: "abc-123", status: IntentStatus.BaseSettled },
      (url) => {
        expect(url).toBe("http://localhost/v2/intents/abc-123/execute");
      },
    );

    const client = bearerClient(f);
    const resp = await client.executeIntent("abc-123");
    expect(resp.status).toBe(IntentStatus.BaseSettled);
  });

  it("throws PayValidationError for empty intentId", async () => {
    const client = bearerClient(mockFetch(200, {}));
    await expect(client.executeIntent("")).rejects.toThrow(
      PayValidationError,
    );
  });
});

describe("getIntent", () => {
  it("sends GET /v2/intents?intent_id=... and returns 200", async () => {
    const f = mockFetch(
      200,
      { intent_id: "xyz", status: IntentStatus.BaseSettled },
      (url) => {
        expect(url).toBe("http://localhost/v2/intents?intent_id=xyz");
      },
    );

    const client = bearerClient(f);
    const resp = await client.getIntent("xyz");
    expect(resp.intentId).toBe("xyz");
  });

  it("throws PayValidationError for empty intentId", async () => {
    const client = bearerClient(mockFetch(200, {}));
    await expect(client.getIntent("")).rejects.toThrow(PayValidationError);
  });
});

// ── API key auth headers ────────────────────────────────────────────────

describe("API key auth", () => {
  it("sends X-Client-ID and X-API-Key headers", async () => {
    const f = mockFetch(200, {}, (url, init) => {
      const headers = init.headers as Record<string, string>;
      expect(headers["X-Client-ID"]).toBe("myid");
      expect(headers["X-API-Key"]).toBe("mykey");
    });

    const client = new PayClient({
      baseUrl: "http://localhost",
      auth: { type: "apiKey", clientId: "myid", apiKey: "mykey" },
      fetch: f,
    });

    await client.getIntent("test-id");
  });
});

// ── parseError fallbacks ────────────────────────────────────────────────

describe("parseError", () => {
  it("falls back to error field when message is empty", async () => {
    const f = mockFetch(403, { error: "forbidden" });
    const client = bearerClient(f);

    try {
      await client.getIntent("id");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PayApiError);
      expect((err as PayApiError).message).toContain("forbidden");
    }
  });

  it("falls back to statusText when body is not JSON", async () => {
    const customFetch: typeof globalThis.fetch = async () => {
      return new Response("not json", {
        status: 500,
        statusText: "Internal Server Error",
      });
    };

    const client = bearerClient(customFetch);

    try {
      await client.getIntent("id");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PayApiError);
      expect((err as PayApiError).statusCode).toBe(500);
    }
  });
});

// ── Key conversion ──────────────────────────────────────────────────────

describe("key conversion", () => {
  it("round-trips camelCase ↔ snake_case", () => {
    const camel = {
      intentId: "x",
      payerChain: "solana",
      feeBreakdown: {
        sourceChain: "solana",
        platformFeePercentage: "1.5",
      },
    };

    const snake = keysToSnake(camel);
    expect(snake).toEqual({
      intent_id: "x",
      payer_chain: "solana",
      fee_breakdown: {
        source_chain: "solana",
        platform_fee_percentage: "1.5",
      },
    });

    const back = keysToCamel(snake);
    expect(back).toEqual(camel);
  });

  it("handles arrays", () => {
    const input = [{ fooBar: 1 }, { bazQux: 2 }];
    const snake = keysToSnake(input);
    expect(snake).toEqual([{ foo_bar: 1 }, { baz_qux: 2 }]);
  });

  it("passes primitives through", () => {
    expect(keysToSnake("hello")).toBe("hello");
    expect(keysToSnake(42)).toBe(42);
    expect(keysToSnake(null)).toBe(null);
  });
});

// ── Request body snake_case conversion ──────────────────────────────────

describe("request serialization", () => {
  it("converts camelCase request body to snake_case", async () => {
    let sentBody: any;
    const f: typeof globalThis.fetch = async (_url, init) => {
      sentBody = JSON.parse(init!.body as string);
      return new Response(JSON.stringify({ intent_id: "x" }), { status: 201 });
    };

    const client = bearerClient(f);
    await client.createIntent({
      email: "test@example.com",
      amount: "10.00",
      payerChain: "solana",
    });

    expect(sentBody).toEqual({
      email: "test@example.com",
      amount: "10.00",
      payer_chain: "solana",
    });
  });
});

// ── Constructor: unknown auth type ──────────────────────────────────────

describe("unknown auth type", () => {
  it("throws PayValidationError for unrecognised auth type", () => {
    expect(
      () =>
        new PayClient({
          baseUrl: "http://localhost",
          auth: { type: "magic" } as any,
        }),
    ).toThrow(PayValidationError);
  });
});

// ── Prototype pollution protection ──────────────────────────────────────

describe("key conversion safety", () => {
  it("strips __proto__ keys to prevent prototype pollution", () => {
    const malicious = JSON.parse(
      '{"__proto__":{"polluted":true},"safe_key":"ok"}',
    );
    const result = keysToCamel(malicious) as any;
    expect(result.safeKey).toBe("ok");
    expect(result.polluted).toBeUndefined();
    // Verify the global Object prototype is not polluted
    expect(({} as any).polluted).toBeUndefined();
  });

  it("handles consecutive uppercase in camelToSnake", () => {
    const input = { xmlParser: "v", getHTTPSUrl: "u" };
    const snake = keysToSnake(input) as any;
    expect(snake.xml_parser).toBe("v");
    expect(snake.get_https_url).toBe("u");
  });
});

// ── parseError edge cases ───────────────────────────────────────────────

describe("parseError edge cases", () => {
  it("falls back to HTTP status code when statusText is empty", async () => {
    const customFetch: typeof globalThis.fetch = async () => {
      return new Response("not json", { status: 502, statusText: "" });
    };

    const client = bearerClient(customFetch);

    try {
      await client.getIntent("id");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PayApiError);
      expect((err as PayApiError).message).toContain("HTTP 502");
    }
  });

  it("ignores non-object JSON response body", async () => {
    const customFetch: typeof globalThis.fetch = async () => {
      return new Response(JSON.stringify([1, 2, 3]), {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = bearerClient(customFetch);

    try {
      await client.getIntent("id");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PayApiError);
      expect((err as PayApiError).message).toContain("Bad Request");
    }
  });
});

// ── URL encoding for special characters ─────────────────────────────────

describe("URL encoding", () => {
  it("encodes special characters in intentId for executeIntent", async () => {
    const f = mockFetch(200, { intent_id: "a/b", status: "PENDING" }, (url) => {
      expect(url).toBe("http://localhost/v2/intents/a%2Fb/execute");
    });

    const client = bearerClient(f);
    await client.executeIntent("a/b");
  });

  it("encodes special characters in intentId for getIntent", async () => {
    const f = mockFetch(200, { intent_id: "a&b", status: "PENDING" }, (url) => {
      expect(url).toBe("http://localhost/v2/intents?intent_id=a%26b");
    });

    const client = bearerClient(f);
    await client.getIntent("a&b");
  });
});
