export {
  ReservationStatus,
  ReservationDivision,
  FeeDivision,
  AvailabilityDivision,
  EquipmentDivision,
  InstitutionSize,
} from "./types";

export type {
  Division,
  Status,
  Reservation,
  TransformOutput,
  UsageFeeEntry,
  Institution,
} from "./types";

export {
  MUNICIPALITIES,
  MUNICIPALITY_KEYS,
  getMunicipalityBySlug,
  getMunicipalityKeyBySlug,
  getReservationTargets,
  getAllMunicipalityTargets,
} from "./registry";

export type { MunicipalityConfig, MunicipalityKey } from "./registry";

export type { ScraperModule } from "./scraper";
