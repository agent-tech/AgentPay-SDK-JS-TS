import { describe, it, expect } from "vitest";
import { keysToSnake, keysToCamel } from "../src/utils.js";

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

describe("key conversion safety", () => {
  it("strips __proto__ keys to prevent prototype pollution", () => {
    const malicious = JSON.parse(
      '{"__proto__":{"polluted":true},"safe_key":"ok"}',
    );
    const result = keysToCamel(malicious) as Record<string, unknown>;
    expect(result.safeKey).toBe("ok");
    expect(result.polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("handles consecutive uppercase in camelToSnake", () => {
    const input = { xmlParser: "v", getHTTPSUrl: "u" };
    const snake = keysToSnake(input) as Record<string, string>;
    expect(snake.xml_parser).toBe("v");
    expect(snake.get_https_url).toBe("u");
  });
});
