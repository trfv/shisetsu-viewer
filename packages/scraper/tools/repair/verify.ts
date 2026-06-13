// 修復ループの「検証」半分。AI を一切含まない決定論的スクリプト。
// 使い方: node tools/repair/verify.ts <municipality> "<facility>" ["<roomName>"]
// 出力: stdout 末尾に `REPAIR_VERIFY_RESULT <json>` を1行。exit code 0=pass, 1=fail。
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const [municipality, facility, roomName] = process.argv.slice(2);
if (!municipality || !facility) {
  console.error('Usage: node tools/repair/verify.ts <municipality> "<facility>" ["<roomName>"]');
  process.exit(2);
}

const failuresDir = path.join("test-results", municipality, "_failures");
// 前回の残骸を消し、今回の実行で出た失敗だけを読む。
await fs.rm(failuresDir, { recursive: true, force: true });

const grep = roomName ? `${facility} ${roomName}` : facility;

let pass = true;
try {
  execFileSync("npx", ["playwright", "test", municipality, "-g", grep, "--retries=0"], {
    stdio: "inherit",
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
} catch {
  // _failures が無い（= 成功）なら空のまま
}

const result = { municipality, facility, roomName: roomName ?? null, pass, failures };
console.log("REPAIR_VERIFY_RESULT " + JSON.stringify(result));
process.exit(pass ? 0 : 1);
