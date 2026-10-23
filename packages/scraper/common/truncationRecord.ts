import fs from "node:fs/promises";
import path from "node:path";

import { recordSlug } from "./captureFailure.ts";
import type { PaginationTruncation } from "./paginate.ts";

export interface TruncationRecord {
  readonly municipality: string;
  readonly facility: string;
  readonly context: Record<string, unknown>;
  readonly maxPages: number | null;
  readonly truncations: readonly PaginationTruncation[];
  readonly capturedAt: string;
}

interface TruncationTarget {
  municipality: string;
  facility: string;
  context: Record<string, unknown>;
  baseDir?: string;
}

function recordPath(input: TruncationTarget): string {
  const baseDir = input.baseDir ?? "test-results";
  return path.join(
    baseDir,
    input.municipality,
    "_truncations",
    `${recordSlug(input.facility, input.context)}.json`
  );
}

// 成功したテストから呼ぶので、IO の失敗でテストを落とさない
export async function writeTruncationRecord(
  input: TruncationTarget & {
    maxPages?: number;
    truncations: readonly PaginationTruncation[];
    now?: () => Date;
  }
): Promise<void> {
  const record: TruncationRecord = {
    municipality: input.municipality,
    facility: input.facility,
    context: input.context,
    maxPages: input.maxPages ?? null,
    truncations: input.truncations,
    capturedAt: (input.now ?? (() => new Date()))().toISOString(),
  };
  try {
    const p = recordPath(input);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(record, null, 2));
  } catch {}
}

export async function clearTruncationRecord(input: TruncationTarget): Promise<void> {
  try {
    await fs.rm(recordPath(input), { force: true });
  } catch {}
}
