#!/usr/bin/env node
import { parseArgs } from "node:util";
import { configureGraphQL } from "./graphqlClient.ts";
import { getValidToken } from "./auth/tokenStore.ts";
import { login } from "./auth/login.ts";
import { logout } from "./auth/logout.ts";
import { MUNICIPALITIES } from "@shisetsu-viewer/shared";
import { executeListInstitutions } from "./tools/listInstitutions.ts";
import { executeGetInstitutionDetail } from "./tools/getInstitutionDetail.ts";
import { executeGetInstitutionReservations } from "./tools/getInstitutionReservations.ts";
import { executeSearchReservations } from "./tools/searchReservations.ts";
import { MUNICIPALITY_HELP, INSTITUTION_SIZE_HELP } from "./paramHelpers.ts";

function printUsage(): void {
  process.stderr.write(`shisetsu - 施設予約データ CLI

Usage: shisetsu <command> [options]

Commands:
  login                   Auth0 でログイン（ブラウザが開きます）
  logout                  ログアウト（保存済みトークンを削除）
  list                    施設一覧取得
  detail <id>             施設詳細取得
  reservations <id>       施設予約状況取得
  search                  空き状況横断検索
  municipalities          自治体一覧

Common Options:
  --pretty                JSON を整形して出力
  --help                  ヘルプを表示

Run 'shisetsu <command> --help' for command-specific options.
`);
}

function printResult(data: unknown, pretty: boolean): void {
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  process.stdout.write(json + "\n");
}

function fail(message: string): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function splitCSV(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value.split(",").map((s) => s.trim());
}

async function commandList(argv: string[]): Promise<unknown> {
  const { values } = parseArgs({
    args: argv,
    options: {
      municipality: { type: "string" },
      size: { type: "string" },
      strings: { type: "boolean" },
      woodwind: { type: "boolean" },
      brass: { type: "boolean" },
      percussion: { type: "boolean" },
      fields: { type: "string" },
      first: { type: "string" },
      after: { type: "string" },
      pretty: { type: "boolean" },
      help: { type: "boolean" },
    },
  });

  if (values.help) {
    process.stderr.write(`shisetsu list - 施設一覧取得

Options:
  --municipality <keys>   自治体キー (カンマ区切り)
                          指定可能な値: ${MUNICIPALITY_HELP}
  --size <sizes>          施設サイズ (カンマ区切り)
                          指定可能な値: ${INSTITUTION_SIZE_HELP}
  --strings               弦楽器利用可の施設のみ
  --woodwind              木管楽器利用可の施設のみ
  --brass                 金管楽器利用可の施設のみ
  --percussion            打楽器利用可の施設のみ
  --fields <fields>       返却フィールド (カンマ区切り)
  --first <n>             取得件数 (デフォルト: 20, 最大: 100)
  --after <cursor>        ページネーション用カーソル
  --pretty                JSON を整形して出力
`);
    process.exit(0);
  }

  return executeListInstitutions({
    municipality: splitCSV(values.municipality),
    institutionSizes: splitCSV(values.size),
    isAvailableStrings: values.strings,
    isAvailableWoodwind: values.woodwind,
    isAvailableBrass: values.brass,
    isAvailablePercussion: values.percussion,
    fields: splitCSV(values.fields),
    first: values.first ? Number(values.first) : undefined,
    after: values.after,
  });
}

async function commandDetail(argv: string[]): Promise<unknown> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      fields: { type: "string" },
      pretty: { type: "boolean" },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    process.stderr.write(`shisetsu detail <id> - 施設詳細取得

Arguments:
  <id>                    施設のUUID

Options:
  --fields <fields>       返却フィールド (カンマ区切り)
  --pretty                JSON を整形して出力
`);
    process.exit(0);
  }

  const id = positionals[0];
  if (!id) fail("施設 ID (UUID) を指定してください");

  const result = await executeGetInstitutionDetail({
    id,
    fields: splitCSV(values.fields),
  });

  if (!result) fail("施設が見つかりません");
  return result;
}

async function commandReservations(argv: string[]): Promise<unknown> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      "start-date": { type: "string" },
      "end-date": { type: "string" },
      fields: { type: "string" },
      pretty: { type: "boolean" },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    process.stderr.write(`shisetsu reservations <id> - 施設予約状況取得

Arguments:
  <id>                    施設のUUID

Options:
  --start-date <date>     開始日 (YYYY-MM-DD, 必須)
  --end-date <date>       終了日 (YYYY-MM-DD, 必須)
  --fields <fields>       返却フィールド (カンマ区切り)
  --pretty                JSON を整形して出力
`);
    process.exit(0);
  }

  const id = positionals[0];
  if (!id) fail("施設 ID (UUID) を指定してください");
  if (!values["start-date"]) fail("--start-date は必須です");
  if (!values["end-date"]) fail("--end-date は必須です");

  return executeGetInstitutionReservations({
    institutionId: id,
    startDate: values["start-date"],
    endDate: values["end-date"],
    fields: splitCSV(values.fields),
  });
}

async function commandSearch(argv: string[]): Promise<unknown> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "start-date": { type: "string" },
      "end-date": { type: "string" },
      municipality: { type: "string" },
      size: { type: "string" },
      strings: { type: "boolean" },
      woodwind: { type: "boolean" },
      brass: { type: "boolean" },
      percussion: { type: "boolean" },
      morning: { type: "boolean" },
      afternoon: { type: "boolean" },
      evening: { type: "boolean" },
      holiday: { type: "boolean" },
      first: { type: "string" },
      after: { type: "string" },
      pretty: { type: "boolean" },
      help: { type: "boolean" },
    },
  });

  if (values.help) {
    process.stderr.write(`shisetsu search - 空き状況横断検索

Options:
  --start-date <date>     開始日 (YYYY-MM-DD, 必須)
  --end-date <date>       終了日 (YYYY-MM-DD, 必須)
  --municipality <keys>   自治体キー (カンマ区切り)
                          指定可能な値: ${MUNICIPALITY_HELP}
  --size <sizes>          施設サイズ (カンマ区切り)
                          指定可能な値: ${INSTITUTION_SIZE_HELP}
  --strings               弦楽器利用可の施設のみ
  --woodwind              木管楽器利用可の施設のみ
  --brass                 金管楽器利用可の施設のみ
  --percussion            打楽器利用可の施設のみ
  --morning               午前空きのみ
  --afternoon             午後空きのみ
  --evening               夜間空きのみ
  --holiday               祝日のみ
  --first <n>             取得件数 (デフォルト: 20, 最大: 100)
  --after <cursor>        ページネーション用カーソル
  --pretty                JSON を整形して出力
`);
    process.exit(0);
  }

  if (!values["start-date"]) fail("--start-date は必須です");
  if (!values["end-date"]) fail("--end-date は必須です");

  return executeSearchReservations({
    startDate: values["start-date"],
    endDate: values["end-date"],
    municipality: splitCSV(values.municipality),
    institutionSizes: splitCSV(values.size),
    isAvailableStrings: values.strings,
    isAvailableWoodwind: values.woodwind,
    isAvailableBrass: values.brass,
    isAvailablePercussion: values.percussion,
    isMorningVacant: values.morning,
    isAfternoonVacant: values.afternoon,
    isEveningVacant: values.evening,
    isHoliday: values.holiday,
    first: values.first ? Number(values.first) : undefined,
    after: values.after,
  });
}

function commandMunicipalities(argv: string[]): unknown {
  const { values } = parseArgs({
    args: argv,
    options: {
      pretty: { type: "boolean" },
      help: { type: "boolean" },
    },
  });

  if (values.help) {
    process.stderr.write(`shisetsu municipalities - 自治体一覧

Options:
  --pretty                JSON を整形して出力
`);
    process.exit(0);
  }

  return Object.values(MUNICIPALITIES).map((m) => ({
    key: m.key,
    slug: m.slug,
    prefecture: m.prefecture,
    label: m.label,
  }));
}

// --- Bootstrap ---

const [command, ...commandArgv] = process.argv.slice(2);
const isPretty = process.argv.includes("--pretty");

if (command === "--help" || command === "-h" || command === undefined) {
  printUsage();
  process.exit(command === undefined ? 1 : 0);
}

// Commands that don't need GraphQL auth
const noAuthCommands: Record<string, (argv: string[]) => unknown | Promise<unknown>> = {
  login: () => login(),
  logout: () => logout(),
  municipalities: commandMunicipalities,
};

// Commands that need GraphQL auth
const authCommands: Record<string, (argv: string[]) => unknown | Promise<unknown>> = {
  list: commandList,
  detail: commandDetail,
  reservations: commandReservations,
  search: commandSearch,
};

try {
  const noAuthHandler = noAuthCommands[command];
  if (noAuthHandler) {
    const result = await noAuthHandler(commandArgv);
    if (result !== undefined) printResult(result, isPretty);
    process.exit(0);
  }

  const authHandler = authCommands[command];
  if (!authHandler) {
    fail(`不明なコマンド: ${command}\n'shisetsu --help' でヘルプを表示`);
  }

  // Authenticate
  const graphqlEndpoint = process.env["GRAPHQL_ENDPOINT"];
  if (!graphqlEndpoint) fail("GRAPHQL_ENDPOINT 環境変数が必要です");

  const tokenResult = await getValidToken();
  if (tokenResult.status === "no_tokens") {
    fail("認証が必要です。'shisetsu login' を実行してください");
  }
  if (tokenResult.status === "refresh_failed") {
    fail("セッション期限切れ。'shisetsu login' を再実行してください");
  }

  configureGraphQL(graphqlEndpoint, tokenResult.token);
  const result = await authHandler(commandArgv);
  printResult(result, isPretty);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
}
