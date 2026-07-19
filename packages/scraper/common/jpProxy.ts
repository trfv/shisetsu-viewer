import { MUNICIPALITIES, type MunicipalityConfig } from "@shisetsu-viewer/shared";

/** target 名（例 "tokyo-sumida"）が国内 proxy 経由の対象かを registry から引く。 */
export function isViaJpProxy(target: string): boolean {
  return Object.values<MunicipalityConfig>(MUNICIPALITIES).some(
    (m) => m.scraperViaJpProxy === true && `${m.prefecture}-${m.slug}` === target
  );
}
