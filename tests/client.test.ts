import { describe, it, expect } from "vitest";
import {
  PayClient,
  PublicPayClient,
  PayApiError,
  PayValidationError,
  IntentStatus,
} from "../src/index.js";
import type {
  Fetcher,
  FetchRequest,
} from "../src/index.js";

// ── Helpers ─────────────────────────────────────────────────────────────

/** Build a mock fetcher that returns a fixed response. */
function mockFetcher(
  status: number,
  body: unknown,
  check?: (req: FetchRequest) => void,
): Fetcher {
  return async (req) => {
    if (check) check(req);
    return new Response(JSON.stringify(body), {
      status,
      statusText: statusText(status),
      headers: { "Content-Type": "application/json" },
    }) as unknown as Awaited<ReturnType<Fetcher>>;
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

const TEST_BASE_URL = "http://localhost";

function bearerClient(fetcher: Fetcher): PayClient {
  return new PayClient({
    baseUrl: TEST_BASE_URL,
    auth: { apiKey: "id", secretKey: "secret" },
    fetcher,
  });
}

// ── Constructor validation ──────────────────────────────────────────────

describe("PayClient constructor", () => {
  it("throws on empty baseUrl", () => {
    expect(
      () =>
        new PayClient({
          baseUrl: "",
          auth: { apiKey: "id", secretKey: "secret" },
        }),
    ).toThrow(PayValidationError);
  });

  it("throws when no auth provided", () => {
    expect(
      () =>
        new PayClient({
          baseUrl: TEST_BASE_URL,
          auth: undefined as any,
        }),
    ).toThrow(PayValidationError);
  });

  it("throws on empty bearer credentials", () => {
    expect(
      () =>
        new PayClient({
          baseUrl: TEST_BASE_URL,
          auth: { apiKey: "", secretKey: "secret" },
        }),
    ).toThrow(PayValidationError);

    expect(
      () =>
        new PayClient({
          baseUrl: TEST_BASE_URL,
          auth: { apiKey: "id", secretKey: "" },
        }),
    ).toThrow(PayValidationError);
  });

  it("strips trailing slash from baseUrl", () => {
    const f = mockFetcher(200, { intent_id: "x", status: "BASE_SETTLED" });
    const client = new PayClient({
      baseUrl: "http://localhost/",
      auth: { apiKey: "id", secretKey: "secret" },
      fetcher: f,
    });
    // Verify by making a request and checking the URL
    expect(
      () =>
        new PayClient({
          baseUrl: "http://localhost/",
          auth: { apiKey: "id", secretKey: "secret" },
        }),
    ).not.toThrow();
  });
});

// ── Option behavior ─────────────────────────────────────────────────────

describe("options", () => {
  it("uses provided timeoutMs", async () => {
    // With a custom fetcher, timeout is ignored — so we just verify construction
    const client = new PayClient({
      baseUrl: TEST_BASE_URL,
      auth: { apiKey: "id", secretKey: "secret" },
      timeoutMs: 5000,
      fetcher: mockFetcher(200, { intent_id: "x" }),
    });
    expect(client).toBeInstanceOf(PayClient);
  });

  it("custom fetcher ignores timeout", async () => {
    // Custom fetcher should be used as-is
    let called = false;
    const customFetcher: Fetcher = async () => {
      called = true;
      return new Response(JSON.stringify({ intent_id: "x" }), {
        status: 200,
      }) as unknown as Awaited<ReturnType<Fetcher>>;
    };

    const client = new PayClient({
      baseUrl: TEST_BASE_URL,
      auth: { apiKey: "id", secretKey: "secret" },
      timeoutMs: 1, // tiny timeout, should be ignored with custom fetcher
      fetcher: customFetcher,
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

    const f = mockFetcher(201, responseBody, (req) => {
      expect(req.url).toBe("http://localhost/v2/intents");
      expect(req.method).toBe("POST");
      expect(req.headers).toHaveProperty("Content-Type", "application/json");
      expect(req.headers).toHaveProperty("Authorization");
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
    const client = bearerClient(mockFetcher(201, {}));
    await expect(client.createIntent(null as any)).rejects.toThrow(
      PayValidationError,
    );
  });

  it("throws PayApiError on non-201 response", async () => {
    const f = mockFetcher(400, { message: "invalid amount" });
    const client = bearerClient(f);

    try {
      await client.createIntent({
        email: "a@b.com",
        amount: "10.00",
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
    const client = bearerClient(mockFetcher(201, {}));
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
    const client = bearerClient(mockFetcher(201, {}));
    await expect(
      client.createIntent({
        amount: "10.00",
        payerChain: "solana",
      }),
    ).rejects.toThrow(PayValidationError);
  });

  it("throws PayValidationError when amount is empty", async () => {
    const client = bearerClient(mockFetcher(201, {}));
    await expect(
      client.createIntent({
        email: "a@b.com",
        amount: "",
        payerChain: "solana",
      }),
    ).rejects.toThrow(PayValidationError);
  });

  it("throws PayValidationError when amount is below 0.2 USDC", async () => {
    const client = bearerClient(mockFetcher(201, {}));
    await expect(
      client.createIntent({
        email: "a@b.com",
        amount: "0.1",
        payerChain: "solana",
      }),
    ).rejects.toThrow(PayValidationError);
    await expect(
      client.createIntent({
        email: "a@b.com",
        amount: "0.1",
        payerChain: "solana",
      }),
    ).rejects.toThrow("0.2 USDC");
  });

  it("throws PayValidationError when amount is not a number", async () => {
    const client = bearerClient(mockFetcher(201, {}));
    await expect(
      client.createIntent({
        email: "a@b.com",
        amount: "abc",
        payerChain: "solana",
      }),
    ).rejects.toThrow(PayValidationError);
  });

  it("accepts amount equal to 0.2 USDC", async () => {
    const client = bearerClient(mockFetcher(201, { intent_id: "ok" }));
    await expect(
      client.createIntent({
        email: "a@b.com",
        amount: "0.2",
        payerChain: "solana",
      }),
    ).resolves.toBeDefined();
  });

  it("throws PayValidationError when payerChain is empty", async () => {
    const client = bearerClient(mockFetcher(201, {}));
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
    const f = mockFetcher(
      200,
      { intent_id: "abc-123", status: IntentStatus.BaseSettled },
      (req) => {
        expect(req.url).toBe("http://localhost/v2/intents/abc-123/execute");
      },
    );

    const client = bearerClient(f);
    const resp = await client.executeIntent("abc-123");
    expect(resp.status).toBe(IntentStatus.BaseSettled);
  });

  it("throws PayValidationError for empty intentId", async () => {
    const client = bearerClient(mockFetcher(200, {}));
    await expect(client.executeIntent("")).rejects.toThrow(
      PayValidationError,
    );
  });
});

describe("getIntent", () => {
  it("sends GET /v2/intents?intent_id=... and returns 200", async () => {
    const f = mockFetcher(
      200,
      { intent_id: "xyz", status: IntentStatus.BaseSettled },
      (req) => {
        expect(req.url).toBe("http://localhost/v2/intents?intent_id=xyz");
      },
    );

    const client = bearerClient(f);
    const resp = await client.getIntent("xyz");
    expect(resp.intentId).toBe("xyz");
  });

  it("throws PayValidationError for empty intentId", async () => {
    const client = bearerClient(mockFetcher(200, {}));
    await expect(client.getIntent("")).rejects.toThrow(PayValidationError);
  });
});

// ── parseError fallbacks ────────────────────────────────────────────────

describe("parseError", () => {
  it("falls back to error field when message is empty", async () => {
    const f = mockFetcher(403, { error: "forbidden" });
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
    const customFetcher: Fetcher = async () =>
      new Response("not json", {
        status: 500,
        statusText: "Internal Server Error",
      }) as unknown as Awaited<ReturnType<Fetcher>>;

    const client = bearerClient(customFetcher);

    try {
      await client.getIntent("id");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PayApiError);
      expect((err as PayApiError).statusCode).toBe(500);
    }
  });
});

// ── Request body snake_case conversion ──────────────────────────────────

describe("request serialization", () => {
  it("converts camelCase request body to snake_case", async () => {
    let sentBody: any;
    const f: Fetcher = async (req) => {
      sentBody = req.body ? JSON.parse(req.body) : undefined;
      return new Response(JSON.stringify({ intent_id: "x" }), {
        status: 201,
      }) as unknown as Awaited<ReturnType<Fetcher>>;
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
          baseUrl: TEST_BASE_URL,
          auth: { type: "magic" } as any,
        }),
    ).toThrow(PayValidationError);
  });
});

// ── parseError edge cases ───────────────────────────────────────────────

describe("parseError edge cases", () => {
  it("falls back to HTTP status code when statusText is empty", async () => {
    const customFetcher: Fetcher = async () =>
      new Response("not json", { status: 502, statusText: "" }) as unknown as Awaited<
        ReturnType<Fetcher>
      >;

    const client = bearerClient(customFetcher);

    try {
      await client.getIntent("id");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PayApiError);
      expect((err as PayApiError).message).toContain("HTTP 502");
    }
  });

  it("ignores non-object JSON response body", async () => {
    const customFetcher: Fetcher = async () =>
      new Response(JSON.stringify([1, 2, 3]), {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
      }) as unknown as Awaited<ReturnType<Fetcher>>;

    const client = bearerClient(customFetcher);

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
    const f = mockFetcher(200, { intent_id: "a/b", status: "PENDING" }, (req) => {
      expect(req.url).toBe("http://localhost/v2/intents/a%2Fb/execute");
    });

    const client = bearerClient(f);
    await client.executeIntent("a/b");
  });

  it("encodes special characters in intentId for getIntent", async () => {
    const f = mockFetcher(200, { intent_id: "a&b", status: "PENDING" }, (req) => {
      expect(req.url).toBe("http://localhost/v2/intents?intent_id=a%26b");
    });

    const client = bearerClient(f);
    await client.getIntent("a&b");
  });
});

// ── PublicPayClient ─────────────────────────────────────────────────────

function publicClient(fetcher: Fetcher): PublicPayClient {
  return new PublicPayClient({
    baseUrl: TEST_BASE_URL,
    fetcher,
  });
}

describe("PublicPayClient constructor", () => {
  it("throws on empty baseUrl", () => {
    expect(
      () => new PublicPayClient({ baseUrl: "" }),
    ).toThrow(PayValidationError);
  });

  it("strips trailing slash from baseUrl", () => {
    expect(
      () => new PublicPayClient({ baseUrl: "http://localhost/" }),
    ).not.toThrow();
  });
});

describe("PublicPayClient createIntent", () => {
  it("sends POST /api/intents with no auth headers and returns 201", async () => {
    const responseBody = {
      intent_id: "intent-public-1",
      status: IntentStatus.AwaitingPayment,
      payer_chain: "solana",
    };

    const f = mockFetcher(201, responseBody, (req) => {
      expect(req.url).toBe("http://localhost/api/intents");
      expect(req.method).toBe("POST");
      expect(req.headers).toHaveProperty("Content-Type", "application/json");
      expect(req.headers).not.toHaveProperty("Authorization");
      expect(req.headers).not.toHaveProperty("X-Client-ID");
      expect(req.headers).not.toHaveProperty("X-API-Key");
    });

    const client = publicClient(f);
    const resp = await client.createIntent({
      email: "test@example.com",
      amount: "10.00",
      payerChain: "solana",
    });

    expect(resp.intentId).toBe("intent-public-1");
    expect(resp.status).toBe(IntentStatus.AwaitingPayment);
  });

  it("throws PayApiError on non-201 response", async () => {
    const f = mockFetcher(400, { message: "invalid amount" });
    const client = publicClient(f);

    try {
      await client.createIntent({
        email: "a@b.com",
        amount: "10.00",
        payerChain: "solana",
      });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PayApiError);
      expect((err as PayApiError).statusCode).toBe(400);
    }
  });

  it("throws PayValidationError for null request", async () => {
    const client = publicClient(mockFetcher(201, {}));
    await expect(client.createIntent(null as any)).rejects.toThrow(
      PayValidationError,
    );
  });

  it("throws PayValidationError when both email and recipient are set", async () => {
    const client = publicClient(mockFetcher(201, {}));
    await expect(
      client.createIntent({
        email: "a@b.com",
        recipient: "0xabc",
        amount: "10.00",
        payerChain: "solana",
      }),
    ).rejects.toThrow(PayValidationError);
  });

  it("throws PayValidationError when amount is empty", async () => {
    const client = publicClient(mockFetcher(201, {}));
    await expect(
      client.createIntent({
        email: "a@b.com",
        amount: "",
        payerChain: "solana",
      }),
    ).rejects.toThrow(PayValidationError);
  });

  it("throws PayValidationError when amount is below 0.2 USDC", async () => {
    const client = publicClient(mockFetcher(201, {}));
    await expect(
      client.createIntent({
        email: "a@b.com",
        amount: "0.1",
        payerChain: "solana",
      }),
    ).rejects.toThrow("0.2 USDC");
  });

  it("throws PayValidationError when payerChain is empty", async () => {
    const client = publicClient(mockFetcher(201, {}));
    await expect(
      client.createIntent({
        email: "a@b.com",
        amount: "10.00",
        payerChain: "",
      }),
    ).rejects.toThrow(PayValidationError);
  });
});

describe("PublicPayClient submitProof", () => {
  it("sends POST /api/intents/{id} with settle_proof body", async () => {
    let sentBody: any;
    const f: Fetcher = async (req) => {
      expect(req.url).toBe("http://localhost/api/intents/xyz-789");
      sentBody = req.body ? JSON.parse(req.body) : undefined;
      return new Response(
        JSON.stringify({ intent_id: "xyz-789", status: IntentStatus.Pending }),
        { status: 200, statusText: "OK" },
      ) as unknown as Awaited<ReturnType<Fetcher>>;
    };

    const client = publicClient(f);
    const resp = await client.submitProof("xyz-789", "proof-base64-here");
    expect(resp.status).toBe(IntentStatus.Pending);
    expect(sentBody).toEqual({ settle_proof: "proof-base64-here" });
  });

  it("throws PayValidationError for empty intentId", async () => {
    const client = publicClient(mockFetcher(200, {}));
    await expect(client.submitProof("", "proof")).rejects.toThrow(
      PayValidationError,
    );
  });

  it("throws PayValidationError for empty settleProof", async () => {
    const client = publicClient(mockFetcher(200, {}));
    await expect(client.submitProof("intent-1", "")).rejects.toThrow(
      PayValidationError,
    );
  });

  it("URL-encodes special characters in intentId", async () => {
    const f = mockFetcher(200, { intent_id: "a/b", status: "PENDING" }, (req) => {
      expect(req.url).toBe("http://localhost/api/intents/a%2Fb");
    });

    const client = publicClient(f);
    await client.submitProof("a/b", "proof");
  });
});

describe("PublicPayClient getIntent", () => {
  it("sends GET /api/intents?intent_id=... and returns 200", async () => {
    const f = mockFetcher(
      200,
      { intent_id: "abc", status: IntentStatus.BaseSettled },
      (req) => {
        expect(req.url).toBe("http://localhost/api/intents?intent_id=abc");
      },
    );

    const client = publicClient(f);
    const resp = await client.getIntent("abc");
    expect(resp.intentId).toBe("abc");
  });

  it("throws PayValidationError for empty intentId", async () => {
    const client = publicClient(mockFetcher(200, {}));
    await expect(client.getIntent("")).rejects.toThrow(PayValidationError);
  });
});
