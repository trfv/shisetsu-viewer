import { describe, expect, test } from "vitest";
import {
  extractNodes,
  extractRelayParams,
  extractSinglePkFromRelayId,
  getEndCursor,
  hasNextPage,
} from "./relay";

describe("extractNodes", () => {
  test("returns empty array for null", () => {
    expect(extractNodes(null)).toEqual([]);
  });

  test("returns empty array for undefined", () => {
    expect(extractNodes(undefined)).toEqual([]);
  });

  test("returns empty array for connection with empty edges", () => {
    expect(extractNodes({ edges: [] })).toEqual([]);
  });

  test("returns nodes from valid connection", () => {
    const connection = {
      edges: [{ node: { id: "1", name: "a" } }, { node: { id: "2", name: "b" } }],
    };
    expect(extractNodes(connection)).toEqual([
      { id: "1", name: "a" },
      { id: "2", name: "b" },
    ]);
  });

  test("returns nodes preserving original types", () => {
    const connection = {
      edges: [{ node: 42 }, { node: 99 }],
    };
    expect(extractNodes(connection)).toEqual([42, 99]);
  });
});

describe("getEndCursor", () => {
  test("returns null for null connection", () => {
    expect(getEndCursor(null)).toBeNull();
  });

  test("returns null for undefined connection", () => {
    expect(getEndCursor(undefined)).toBeNull();
  });

  test("returns null when endCursor is null", () => {
    expect(getEndCursor({ pageInfo: { endCursor: null } })).toBeNull();
  });

  test("returns cursor string for valid connection", () => {
    expect(getEndCursor({ pageInfo: { endCursor: "cursor123" } })).toBe("cursor123");
  });

  test("returns empty string when endCursor is empty string", () => {
    expect(getEndCursor({ pageInfo: { endCursor: "" } })).toBe("");
  });
});

describe("hasNextPage", () => {
  test("returns false for null connection", () => {
    expect(hasNextPage(null)).toBe(false);
  });

  test("returns false for undefined connection", () => {
    expect(hasNextPage(undefined)).toBe(false);
  });

  test("returns true when hasNextPage is true", () => {
    expect(hasNextPage({ pageInfo: { hasNextPage: true } })).toBe(true);
  });

  test("returns false when hasNextPage is false", () => {
    expect(hasNextPage({ pageInfo: { hasNextPage: false } })).toBe(false);
  });
});

describe("extractRelayParams", () => {
  test("returns defaults for null connection", () => {
    expect(extractRelayParams(null)).toEqual({
      edges: [],
      endCursor: null,
      hasNextPage: false,
    });
  });

  test("returns defaults for undefined connection", () => {
    expect(extractRelayParams(undefined)).toEqual({
      edges: [],
      endCursor: null,
      hasNextPage: false,
    });
  });

  test("returns combined params for valid connection", () => {
    const connection = {
      edges: [{ node: { id: "1" } }, { node: { id: "2" } }],
      pageInfo: { endCursor: "abc", hasNextPage: true },
    };
    expect(extractRelayParams(connection)).toEqual({
      edges: [{ id: "1" }, { id: "2" }],
      endCursor: "abc",
      hasNextPage: true,
    });
  });

  test("returns combined params with no next page", () => {
    const connection = {
      edges: [{ node: "item" }],
      pageInfo: { endCursor: null, hasNextPage: false },
    };
    expect(extractRelayParams(connection)).toEqual({
      edges: ["item"],
      endCursor: null,
      hasNextPage: false,
    });
  });
});

describe("extractSinglePkFromRelayId", () => {
  test("extracts UUID from base64 encoded relay ID", () => {
    const uuid = "b3ed861c-c057-4b71-8678-93b7fea06202";
    const relayId = btoa(JSON.stringify([1, "public", "institutions", uuid]));
    expect(extractSinglePkFromRelayId(relayId)).toBe(uuid);
  });

  test("extracts string PK from different table", () => {
    const pk = "some-pk-value";
    const relayId = btoa(JSON.stringify([2, "public", "reservations", pk]));
    expect(extractSinglePkFromRelayId(relayId)).toBe(pk);
  });

  test("extracts numeric PK at index 3", () => {
    const relayId = btoa(JSON.stringify([1, "public", "table", 12345]));
    expect(extractSinglePkFromRelayId(relayId)).toBe(12345);
  });
});
