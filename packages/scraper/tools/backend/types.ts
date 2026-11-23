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
