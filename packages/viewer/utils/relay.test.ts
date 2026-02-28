import { describe, expect, test } from "vitest";
import { extractSinglePkFromRelayId } from "./relay";

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
