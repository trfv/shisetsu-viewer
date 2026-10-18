import type { Institution } from "@shisetsu-viewer/shared";

export interface FileData {
  facility_name: string;
  data: { room_name: string; date: string; reservation: Record<string, string> }[];
}

export interface ReservationRow {
  institution_id: string;
  date: string; // YYYY-MM-DD
  reservation: Record<string, string>;
}

export type InstitutionKeyMap = Record<string, string>;

export interface ReservationBackend {
  fetchInstitutionKeyMap(prefecture: string, municipality: string): Promise<InstitutionKeyMap>;
  upsertReservations(rows: ReservationRow[]): Promise<number>;
}

export interface InstitutionBackend {
  upsertInstitutions(rows: Institution[]): Promise<number>;
  listInstitutions(prefecture: string, municipality: string): Promise<Institution[]>;
}
