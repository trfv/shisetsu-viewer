import { getReservationSystem } from "@shisetsu-viewer/shared";

export function isViaJpProxy(target: string): boolean {
  return getReservationSystem(target)?.scraperViaJpProxy === true;
}
