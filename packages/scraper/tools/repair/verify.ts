import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const [municipality, facility, roomName] = process.argv.slice(2);
if (!municipality || !facility) {
  console.error('Usage: node tools/repair/verify.ts <municipality> "<facility>" ["<roomName>"]');
  process.exit(2);
}

const failuresDir = path.join("test-results", municipality, "_failures");
await fs.rm(failuresDir, { recursive: true, force: true });

const grep = roomName ? `${facility} ${roomName}` : facility;

let pass = true;
try {
  execFileSync("npx", ["playwright", "test", municipality, "-g", grep, "--retries=0"], {
    stdio: "inherit",
    timeout: 300_000, // Playwright がハングしても修復ループが戻れるようにする
  });
} catch {
  pass = false;
}

let failures: unknown[] = [];
try {
  const files = (await fs.readdir(failuresDir)).filter((f) => f.endsWith(".json"));
  failures = await Promise.all(
    files.map(async (f) => JSON.parse(await fs.readFile(path.join(failuresDir, f), "utf8")))
  );
} catch (e) {
  // ENOENT は失敗レコード無し。それ以外を握りつぶすと修復ループが診断データを失う。
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
    console.error("Warning: 失敗アーティファクトの読み取りに失敗しました:", e);
  }
}

const result = { municipality, facility, roomName: roomName ?? null, pass, failures };
console.log("REPAIR_VERIFY_RESULT " + JSON.stringify(result));
process.exit(pass ? 0 : 1);
