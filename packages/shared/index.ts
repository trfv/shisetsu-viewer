export {
  ReservationStatus,
  ReservationDivision,
  FeeDivision,
  AvailabilityDivision,
  EquipmentDivision,
  InstitutionSize,
} from "./types.ts";

export type {
  Division,
  Status,
  Reservation,
  TransformOutput,
  UsageFeeEntry,
  Institution,
} from "./types.ts";

export {
  MUNICIPALITIES,
  MUNICIPALITY_KEYS,
  getMunicipalityBySlug,
  getMunicipalityKeyBySlug,
  getReservationTargets,
  getAllMunicipalityTargets,
} from "./registry.ts";

export type { MunicipalityConfig, MunicipalityKey } from "./registry.ts";

export type { ScraperModule } from "./scraper.ts";
