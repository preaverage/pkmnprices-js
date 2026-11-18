import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  CreditLimitError,
  InternalServerError,
  PkmnPrices,
  RateLimitError,
} from "../dist/index.js";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });

// Replaces fetch with a queue of canned responses and records each request.
const stubFetch = (...responses) => {
  const calls = [];

  globalThis.fetch = async (url, init) => {
    calls.push({ url: new URL(url), headers: init.headers });

    const next = responses.shift();
    assert.ok(next, `unexpected request to ${url}`);

    return typeof next === "function" ? next() : next;
  };

  return calls;
};

const listPage = (ids, pagination) =>
  json({
    data: ids.map((id) => ({ id })),
    pagination: { page: 1, per_page: 2, total: 5, total_pages: 3, ...pagination },
  });

test("list iteration follows the keyset cursor and stops sending page", async () => {
  const calls = stubFetch(
    listPage([1, 2], { next_cursor: "c1" }),
    listPage([3, 4], { next_cursor: "c2" }),
    listPage([5], { next_cursor: null })
  );
  const client = new PkmnPrices({ apiKey: "pk_test" });

  const cards = await client.cards.listAll({ set_id: 9, per_page: 2 });

  assert.deepEqual(cards.map((card) => card.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(
    calls.map(({ url }) => [url.searchParams.get("page"), url.searchParams.get("cursor")]),
    [["1", null], [null, "c1"], [null, "c2"]]
  );
  assert.equal(calls[2].url.searchParams.get("set_id"), "9");
});

test("a price-ordered list has no cursor and pages by number", async () => {
  const calls = stubFetch(
    listPage([1, 2], { next_cursor: null, total_pages: 2 }),
    listPage([3], { next_cursor: null, page: 2, total_pages: 2 })
  );
  const client = new PkmnPrices({ apiKey: "pk_test" });

  const cards = await client.cards.listAll({ sort: "price_asc" });

  assert.equal(cards.length, 3);
  assert.deepEqual(
    calls.map(({ url }) => url.searchParams.get("page")),
    ["1", "2"]
  );
});

test("array filters are comma-joined and booleans are sent as words", async () => {
  const calls = stubFetch(
    json({ data: [], pagination: { has_more: false, next_cursor: null, count: 0 } })
  );
  const client = new PkmnPrices({ apiKey: "pk_test" });

  await client.cards.listings.cardmarket(7, {
    seller_country: ["DE", "AT"],
    graded: false,
    min_sell_count: 0,
  });

  const { url, headers } = calls[0];
  assert.equal(url.pathname, "/v1/cards/7/listings/cardmarket");
  assert.equal(url.searchParams.get("seller_country"), "DE,AT");
  assert.equal(url.searchParams.get("graded"), "false");
  assert.equal(url.searchParams.get("min_sell_count"), "0");
  assert.equal(headers["x-api-key"], "pk_test");
});

test("the new card endpoints hit their paths", async () => {
  const calls = stubFetch(
    json({ card_id: 7, variants: [] }),
    json({ patterns: [], stamps: [], distributions: [], placements: [] }),
    json({ data: [], pagination: { page: 1, per_page: 30, total: 0, total_pages: 0 } })
  );
  const client = new PkmnPrices({ apiKey: "pk_test" });

  await client.cards.population(7, { variant: "Holofoil" });
  await client.cards.markers();
  await client.cards.salesVolume(7, { period: "90d", graded: true });

  assert.deepEqual(
    calls.map(({ url }) => url.pathname + url.search),
    [
      "/v1/cards/7/population?variant=Holofoil",
      "/v1/cards/markers",
      "/v1/cards/7/sales/volume?period=90d&graded=true",
    ]
  );
});

test("a per-minute 429 is retried and reports which limit it hit", async () => {
  const throttled = () =>
    json(
      {
        error: {
          code: "rate_limit_exceeded",
          message: "per-minute rate limit exceeded",
          docs_url: "https://www.pkmnprices.com/docs/rate-limits",
          limit_type: "per_minute",
          retry_after: 0,
          resets_at: "2026-10-26T00:00:30Z",
        },
      },
      { status: 429, headers: { "retry-after": "0", "x-rate-reset": "30" } }
    );
  const calls = stubFetch(throttled, json({ status: "healthy" }));
  const client = new PkmnPrices();

  assert.deepEqual(await client.health(), { status: "healthy" });
  assert.equal(calls.length, 2);

  stubFetch(throttled);
  const strict = new PkmnPrices({ maxRetries: 0 });

  await assert.rejects(strict.health(), (error) => {
    assert.ok(error instanceof RateLimitError);
    assert.equal(error.limitType, "per_minute");
    assert.equal(error.retryAfterMs, 0);
    assert.equal(error.resetsAt, "2026-10-26T00:00:30Z");
    assert.equal(error.upgradeUrl, null);
    assert.equal(error.rateLimit.rateReset, 30);
    return true;
  });
});

test("a daily 429 is not retried and carries the upgrade link", async () => {
  const calls = stubFetch(
    json(
      {
        error: {
          code: "credit_limit_exceeded",
          message: "daily credit limit exceeded",
          limit_type: "daily",
          retry_after: 41230,
          upgrade_url: "https://www.pkmnprices.com/dashboard?view=billing",
        },
      },
      { status: 429, headers: { "retry-after": "41230" } }
    )
  );
  const client = new PkmnPrices({ apiKey: "pk_test" });

  await assert.rejects(client.sets.get(1), (error) => {
    assert.ok(error instanceof CreditLimitError);
    assert.equal(error.limitType, "daily");
    assert.equal(error.retryAfterMs, 41_230_000);
    assert.equal(error.upgradeUrl, "https://www.pkmnprices.com/dashboard?view=billing");
    return true;
  });
  assert.equal(calls.length, 1);
});

test("the export streams the file and reads its headers", async () => {
  stubFetch(
    new Response(new Uint8Array([31, 139, 8]), {
      headers: {
        "content-type": "application/gzip",
        "content-disposition": 'attachment; filename="pkmnprices-cards-2026-10-26.csv.gz"',
        "x-export-downloads-remaining": "1",
      },
    })
  );
  const client = new PkmnPrices({ apiKey: "pk_test" });

  const file = await client.cards.export();

  assert.equal(file.filename, "pkmnprices-cards-2026-10-26.csv.gz");
  assert.equal(file.downloadsRemaining, 1);
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new Uint8Array([31, 139, 8]));
});

test("a failed export is not retried", async () => {
  const calls = stubFetch(json({ error: { code: "internal_error", message: "boom" } }, { status: 500 }));
  const client = new PkmnPrices({ apiKey: "pk_test" });

  await assert.rejects(client.cards.export(), InternalServerError);
  assert.equal(calls.length, 1);
});
