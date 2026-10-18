import { getMunicipalityByScraperTarget } from "@shisetsu-viewer/shared";

export function isViaJpProxy(target: string): boolean {
  return getMunicipalityByScraperTarget(target)?.scraperViaJpProxy === true;
}
