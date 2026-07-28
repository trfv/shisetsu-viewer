import { getMunicipalityByScraperTarget } from "@shisetsu-viewer/shared";

/**
 * スクレイパー target（例 "tokyo-sumida"）が国内 proxy 経由の対象かを registry から引く。
 * 追加スクレイパー（例 "tokyo-kita-genkiplaza"）は親自治体の設定を継承する。
 */
export function isViaJpProxy(target: string): boolean {
  return getMunicipalityByScraperTarget(target)?.scraperViaJpProxy === true;
}
