/**
 * scrape アクションから呼ばれ、対象自治体が国内 proxy 経由かを stdout に出力する。
 * 使い方: node scripts/viaJpProxy.ts <municipality>   → "true" | "false"
 */
import { isViaJpProxy } from "../common/jpProxy.ts";

process.stdout.write(isViaJpProxy(process.argv[2] ?? "") ? "true" : "false");
