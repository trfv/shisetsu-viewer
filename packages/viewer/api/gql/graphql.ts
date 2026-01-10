/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  availavility_division: { input: any; output: any };
  bigint: { input: any; output: any };
  date: { input: any; output: any };
  equipment_division: { input: any; output: any };
  fee_division: { input: any; output: any };
  jsonb: { input: any; output: any };
  numeric: { input: any; output: any };
  prefecture: { input: any; output: any };
  timestamp: { input: any; output: any };
  uuid: { input: any; output: any };
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  _gt?: InputMaybe<Scalars["Boolean"]["input"]>;
  _gte?: InputMaybe<Scalars["Boolean"]["input"]>;
  _in?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lte?: InputMaybe<Scalars["Boolean"]["input"]>;
  _neq?: InputMaybe<Scalars["Boolean"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["Int"]["input"]>;
  _gt?: InputMaybe<Scalars["Int"]["input"]>;
  _gte?: InputMaybe<Scalars["Int"]["input"]>;
  _in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["Int"]["input"]>;
  _lte?: InputMaybe<Scalars["Int"]["input"]>;
  _neq?: InputMaybe<Scalars["Int"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

/** An object with globally unique ID */
export type Node = {
  /** A globally unique identifier */
  id: Scalars["ID"]["output"];
};

export type PageInfo = {
  __typename?: "PageInfo";
  endCursor: Scalars["String"]["output"];
  hasNextPage: Scalars["Boolean"]["output"];
  hasPreviousPage: Scalars["Boolean"]["output"];
  startCursor: Scalars["String"]["output"];
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["String"]["input"]>;
  _gt?: InputMaybe<Scalars["String"]["input"]>;
  _gte?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars["String"]["input"]>;
  _in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars["String"]["input"]>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars["String"]["input"]>;
  _lt?: InputMaybe<Scalars["String"]["input"]>;
  _lte?: InputMaybe<Scalars["String"]["input"]>;
  _neq?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars["String"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars["String"]["input"]>;
};

/** Boolean expression to compare columns of type "availavility_division". All fields are combined with logical 'AND'. */
export type Availavility_Division_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["availavility_division"]["input"]>;
  _gt?: InputMaybe<Scalars["availavility_division"]["input"]>;
  _gte?: InputMaybe<Scalars["availavility_division"]["input"]>;
  _in?: InputMaybe<Array<Scalars["availavility_division"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["availavility_division"]["input"]>;
  _lte?: InputMaybe<Scalars["availavility_division"]["input"]>;
  _neq?: InputMaybe<Scalars["availavility_division"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["availavility_division"]["input"]>>;
};

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type Bigint_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["bigint"]["input"]>;
  _gt?: InputMaybe<Scalars["bigint"]["input"]>;
  _gte?: InputMaybe<Scalars["bigint"]["input"]>;
  _in?: InputMaybe<Array<Scalars["bigint"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["bigint"]["input"]>;
  _lte?: InputMaybe<Scalars["bigint"]["input"]>;
  _neq?: InputMaybe<Scalars["bigint"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["bigint"]["input"]>>;
};

/** Boolean expression to compare columns of type "date". All fields are combined with logical 'AND'. */
export type Date_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["date"]["input"]>;
  _gt?: InputMaybe<Scalars["date"]["input"]>;
  _gte?: InputMaybe<Scalars["date"]["input"]>;
  _in?: InputMaybe<Array<Scalars["date"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["date"]["input"]>;
  _lte?: InputMaybe<Scalars["date"]["input"]>;
  _neq?: InputMaybe<Scalars["date"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["date"]["input"]>>;
};

/** Boolean expression to compare columns of type "equipment_division". All fields are combined with logical 'AND'. */
export type Equipment_Division_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["equipment_division"]["input"]>;
  _gt?: InputMaybe<Scalars["equipment_division"]["input"]>;
  _gte?: InputMaybe<Scalars["equipment_division"]["input"]>;
  _in?: InputMaybe<Array<Scalars["equipment_division"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["equipment_division"]["input"]>;
  _lte?: InputMaybe<Scalars["equipment_division"]["input"]>;
  _neq?: InputMaybe<Scalars["equipment_division"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["equipment_division"]["input"]>>;
};

/** Boolean expression to compare columns of type "fee_division". All fields are combined with logical 'AND'. */
export type Fee_Division_Array_Comparison_Exp = {
  /** is the array contained in the given array value */
  _contained_in?: InputMaybe<Array<Scalars["fee_division"]["input"]>>;
  /** does the array contain the given value */
  _contains?: InputMaybe<Array<Scalars["fee_division"]["input"]>>;
  _eq?: InputMaybe<Array<Scalars["fee_division"]["input"]>>;
  _gt?: InputMaybe<Array<Scalars["fee_division"]["input"]>>;
  _gte?: InputMaybe<Array<Scalars["fee_division"]["input"]>>;
  _in?: InputMaybe<Array<Array<Scalars["fee_division"]["input"]>>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Array<Scalars["fee_division"]["input"]>>;
  _lte?: InputMaybe<Array<Scalars["fee_division"]["input"]>>;
  _neq?: InputMaybe<Array<Scalars["fee_division"]["input"]>>;
  _nin?: InputMaybe<Array<Array<Scalars["fee_division"]["input"]>>>;
};

/** columns and relationships of "institutions" */
export type Institutions = Node & {
  __typename?: "institutions";
  address: Scalars["String"]["output"];
  area?: Maybe<Scalars["numeric"]["output"]>;
  building: Scalars["String"]["output"];
  building_kana: Scalars["String"]["output"];
  building_system_name?: Maybe<Scalars["String"]["output"]>;
  capacity?: Maybe<Scalars["Int"]["output"]>;
  created_at: Scalars["timestamp"]["output"];
  fee_divisions: Array<Scalars["fee_division"]["output"]>;
  holiday_usage_fee: Scalars["jsonb"]["output"];
  id: Scalars["ID"]["output"];
  institution: Scalars["String"]["output"];
  institution_kana: Scalars["String"]["output"];
  institution_size: Scalars["String"]["output"];
  institution_system_name?: Maybe<Scalars["String"]["output"]>;
  is_available_brass: Scalars["availavility_division"]["output"];
  is_available_percussion: Scalars["availavility_division"]["output"];
  is_available_strings: Scalars["availavility_division"]["output"];
  is_available_woodwind: Scalars["availavility_division"]["output"];
  is_equipped_music_stand: Scalars["equipment_division"]["output"];
  is_equipped_piano: Scalars["equipment_division"]["output"];
  layout_image_url: Scalars["String"]["output"];
  lottery_period: Scalars["String"]["output"];
  municipality: Scalars["String"]["output"];
  note: Scalars["String"]["output"];
  prefecture: Scalars["prefecture"]["output"];
  updated_at?: Maybe<Scalars["timestamp"]["output"]>;
  website_url: Scalars["String"]["output"];
  weekday_usage_fee: Scalars["jsonb"]["output"];
};

/** columns and relationships of "institutions" */
export type InstitutionsHoliday_Usage_FeeArgs = {
  path?: InputMaybe<Scalars["String"]["input"]>;
};

/** columns and relationships of "institutions" */
export type InstitutionsWeekday_Usage_FeeArgs = {
  path?: InputMaybe<Scalars["String"]["input"]>;
};

/** A Relay connection object on "institutions" */
export type InstitutionsConnection = {
  __typename?: "institutionsConnection";
  edges: Array<InstitutionsEdge>;
  pageInfo: PageInfo;
};

export type InstitutionsEdge = {
  __typename?: "institutionsEdge";
  cursor: Scalars["String"]["output"];
  node: Institutions;
};

/** Boolean expression to filter rows from the table "institutions". All fields are combined with a logical 'AND'. */
export type Institutions_Bool_Exp = {
  _and?: InputMaybe<Array<Institutions_Bool_Exp>>;
  _not?: InputMaybe<Institutions_Bool_Exp>;
  _or?: InputMaybe<Array<Institutions_Bool_Exp>>;
  address?: InputMaybe<String_Comparison_Exp>;
  area?: InputMaybe<Numeric_Comparison_Exp>;
  building?: InputMaybe<String_Comparison_Exp>;
  building_kana?: InputMaybe<String_Comparison_Exp>;
  building_system_name?: InputMaybe<String_Comparison_Exp>;
  capacity?: InputMaybe<Int_Comparison_Exp>;
  created_at?: InputMaybe<Timestamp_Comparison_Exp>;
  fee_divisions?: InputMaybe<Fee_Division_Array_Comparison_Exp>;
  holiday_usage_fee?: InputMaybe<Jsonb_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  institution?: InputMaybe<String_Comparison_Exp>;
  institution_kana?: InputMaybe<String_Comparison_Exp>;
  institution_size?: InputMaybe<String_Comparison_Exp>;
  institution_system_name?: InputMaybe<String_Comparison_Exp>;
  is_available_brass?: InputMaybe<Availavility_Division_Comparison_Exp>;
  is_available_percussion?: InputMaybe<Availavility_Division_Comparison_Exp>;
  is_available_strings?: InputMaybe<Availavility_Division_Comparison_Exp>;
  is_available_woodwind?: InputMaybe<Availavility_Division_Comparison_Exp>;
  is_equipped_music_stand?: InputMaybe<Equipment_Division_Comparison_Exp>;
  is_equipped_piano?: InputMaybe<Equipment_Division_Comparison_Exp>;
  layout_image_url?: InputMaybe<String_Comparison_Exp>;
  lottery_period?: InputMaybe<String_Comparison_Exp>;
  municipality?: InputMaybe<String_Comparison_Exp>;
  note?: InputMaybe<String_Comparison_Exp>;
  prefecture?: InputMaybe<Prefecture_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamp_Comparison_Exp>;
  website_url?: InputMaybe<String_Comparison_Exp>;
  weekday_usage_fee?: InputMaybe<Jsonb_Comparison_Exp>;
};

/** Ordering options when selecting data from "institutions". */
export type Institutions_Order_By = {
  address?: InputMaybe<Order_By>;
  area?: InputMaybe<Order_By>;
  building?: InputMaybe<Order_By>;
  building_kana?: InputMaybe<Order_By>;
  building_system_name?: InputMaybe<Order_By>;
  capacity?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  fee_divisions?: InputMaybe<Order_By>;
  holiday_usage_fee?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  institution?: InputMaybe<Order_By>;
  institution_kana?: InputMaybe<Order_By>;
  institution_size?: InputMaybe<Order_By>;
  institution_system_name?: InputMaybe<Order_By>;
  is_available_brass?: InputMaybe<Order_By>;
  is_available_percussion?: InputMaybe<Order_By>;
  is_available_strings?: InputMaybe<Order_By>;
  is_available_woodwind?: InputMaybe<Order_By>;
  is_equipped_music_stand?: InputMaybe<Order_By>;
  is_equipped_piano?: InputMaybe<Order_By>;
  layout_image_url?: InputMaybe<Order_By>;
  lottery_period?: InputMaybe<Order_By>;
  municipality?: InputMaybe<Order_By>;
  note?: InputMaybe<Order_By>;
  prefecture?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  website_url?: InputMaybe<Order_By>;
  weekday_usage_fee?: InputMaybe<Order_By>;
};

/** select columns of table "institutions" */
export enum Institutions_Select_Column {
  /** column name */
  Address = "address",
  /** column name */
  Area = "area",
  /** column name */
  Building = "building",
  /** column name */
  BuildingKana = "building_kana",
  /** column name */
  BuildingSystemName = "building_system_name",
  /** column name */
  Capacity = "capacity",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  FeeDivisions = "fee_divisions",
  /** column name */
  HolidayUsageFee = "holiday_usage_fee",
  /** column name */
  Id = "id",
  /** column name */
  Institution = "institution",
  /** column name */
  InstitutionKana = "institution_kana",
  /** column name */
  InstitutionSize = "institution_size",
  /** column name */
  InstitutionSystemName = "institution_system_name",
  /** column name */
  IsAvailableBrass = "is_available_brass",
  /** column name */
  IsAvailablePercussion = "is_available_percussion",
  /** column name */
  IsAvailableStrings = "is_available_strings",
  /** column name */
  IsAvailableWoodwind = "is_available_woodwind",
  /** column name */
  IsEquippedMusicStand = "is_equipped_music_stand",
  /** column name */
  IsEquippedPiano = "is_equipped_piano",
  /** column name */
  LayoutImageUrl = "layout_image_url",
  /** column name */
  LotteryPeriod = "lottery_period",
  /** column name */
  Municipality = "municipality",
  /** column name */
  Note = "note",
  /** column name */
  Prefecture = "prefecture",
  /** column name */
  UpdatedAt = "updated_at",
  /** column name */
  WebsiteUrl = "website_url",
  /** column name */
  WeekdayUsageFee = "weekday_usage_fee",
}

export type Jsonb_Cast_Exp = {
  String?: InputMaybe<String_Comparison_Exp>;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  _cast?: InputMaybe<Jsonb_Cast_Exp>;
  /** is the column contained in the given json value */
  _contained_in?: InputMaybe<Scalars["jsonb"]["input"]>;
  /** does the column contain the given json value at the top level */
  _contains?: InputMaybe<Scalars["jsonb"]["input"]>;
  _eq?: InputMaybe<Scalars["jsonb"]["input"]>;
  _gt?: InputMaybe<Scalars["jsonb"]["input"]>;
  _gte?: InputMaybe<Scalars["jsonb"]["input"]>;
  /** does the string exist as a top-level key in the column */
  _has_key?: InputMaybe<Scalars["String"]["input"]>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: InputMaybe<Array<Scalars["String"]["input"]>>;
  _in?: InputMaybe<Array<Scalars["jsonb"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["jsonb"]["input"]>;
  _lte?: InputMaybe<Scalars["jsonb"]["input"]>;
  _neq?: InputMaybe<Scalars["jsonb"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["jsonb"]["input"]>>;
};

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type Numeric_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["numeric"]["input"]>;
  _gt?: InputMaybe<Scalars["numeric"]["input"]>;
  _gte?: InputMaybe<Scalars["numeric"]["input"]>;
  _in?: InputMaybe<Array<Scalars["numeric"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["numeric"]["input"]>;
  _lte?: InputMaybe<Scalars["numeric"]["input"]>;
  _neq?: InputMaybe<Scalars["numeric"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["numeric"]["input"]>>;
};

/** column ordering options */
export enum Order_By {
  /** in ascending order, nulls last */
  Asc = "asc",
  /** in ascending order, nulls first */
  AscNullsFirst = "asc_nulls_first",
  /** in ascending order, nulls last */
  AscNullsLast = "asc_nulls_last",
  /** in descending order, nulls first */
  Desc = "desc",
  /** in descending order, nulls first */
  DescNullsFirst = "desc_nulls_first",
  /** in descending order, nulls last */
  DescNullsLast = "desc_nulls_last",
}

/** Boolean expression to compare columns of type "prefecture". All fields are combined with logical 'AND'. */
export type Prefecture_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["prefecture"]["input"]>;
  _gt?: InputMaybe<Scalars["prefecture"]["input"]>;
  _gte?: InputMaybe<Scalars["prefecture"]["input"]>;
  _in?: InputMaybe<Array<Scalars["prefecture"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["prefecture"]["input"]>;
  _lte?: InputMaybe<Scalars["prefecture"]["input"]>;
  _neq?: InputMaybe<Scalars["prefecture"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["prefecture"]["input"]>>;
};

export type Query_Root = {
  __typename?: "query_root";
  /** fetch data from the table: "institutions" */
  institutions_connection: InstitutionsConnection;
  node?: Maybe<Node>;
  /** fetch data from the table: "reservations" */
  reservations_connection: ReservationsConnection;
  /** fetch data from the table: "searchable_reservations" */
  searchable_reservations_connection: Searchable_ReservationsConnection;
};

export type Query_RootInstitutions_ConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  distinct_on?: InputMaybe<Array<Institutions_Select_Column>>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Institutions_Order_By>>;
  where?: InputMaybe<Institutions_Bool_Exp>;
};

export type Query_RootNodeArgs = {
  id: Scalars["ID"]["input"];
};

export type Query_RootReservations_ConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  distinct_on?: InputMaybe<Array<Reservations_Select_Column>>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Reservations_Order_By>>;
  where?: InputMaybe<Reservations_Bool_Exp>;
};

export type Query_RootSearchable_Reservations_ConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  distinct_on?: InputMaybe<Array<Searchable_Reservations_Select_Column>>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Searchable_Reservations_Order_By>>;
  where?: InputMaybe<Searchable_Reservations_Bool_Exp>;
};

/** columns and relationships of "reservations" */
export type Reservations = Node & {
  __typename?: "reservations";
  created_at: Scalars["timestamp"]["output"];
  date: Scalars["date"]["output"];
  id: Scalars["ID"]["output"];
  /** An object relationship */
  institution?: Maybe<Institutions>;
  institution_id: Scalars["uuid"]["output"];
  is_holiday: Scalars["Boolean"]["output"];
  reservation: Scalars["jsonb"]["output"];
  updated_at: Scalars["timestamp"]["output"];
};

/** columns and relationships of "reservations" */
export type ReservationsReservationArgs = {
  path?: InputMaybe<Scalars["String"]["input"]>;
};

/** A Relay connection object on "reservations" */
export type ReservationsConnection = {
  __typename?: "reservationsConnection";
  edges: Array<ReservationsEdge>;
  pageInfo: PageInfo;
};

export type ReservationsEdge = {
  __typename?: "reservationsEdge";
  cursor: Scalars["String"]["output"];
  node: Reservations;
};

/** Boolean expression to filter rows from the table "reservations". All fields are combined with a logical 'AND'. */
export type Reservations_Bool_Exp = {
  _and?: InputMaybe<Array<Reservations_Bool_Exp>>;
  _not?: InputMaybe<Reservations_Bool_Exp>;
  _or?: InputMaybe<Array<Reservations_Bool_Exp>>;
  created_at?: InputMaybe<Timestamp_Comparison_Exp>;
  date?: InputMaybe<Date_Comparison_Exp>;
  id?: InputMaybe<Bigint_Comparison_Exp>;
  institution?: InputMaybe<Institutions_Bool_Exp>;
  institution_id?: InputMaybe<Uuid_Comparison_Exp>;
  is_holiday?: InputMaybe<Boolean_Comparison_Exp>;
  reservation?: InputMaybe<Jsonb_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamp_Comparison_Exp>;
};

/** Ordering options when selecting data from "reservations". */
export type Reservations_Order_By = {
  created_at?: InputMaybe<Order_By>;
  date?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  institution?: InputMaybe<Institutions_Order_By>;
  institution_id?: InputMaybe<Order_By>;
  is_holiday?: InputMaybe<Order_By>;
  reservation?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** select columns of table "reservations" */
export enum Reservations_Select_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Date = "date",
  /** column name */
  Id = "id",
  /** column name */
  InstitutionId = "institution_id",
  /** column name */
  IsHoliday = "is_holiday",
  /** column name */
  Reservation = "reservation",
  /** column name */
  UpdatedAt = "updated_at",
}

/** columns and relationships of "searchable_reservations" */
export type Searchable_Reservations = Node & {
  __typename?: "searchable_reservations";
  date?: Maybe<Scalars["date"]["output"]>;
  id: Scalars["ID"]["output"];
  /** An object relationship */
  institution?: Maybe<Institutions>;
  institution_id?: Maybe<Scalars["uuid"]["output"]>;
  is_afternoon_vacant?: Maybe<Scalars["Boolean"]["output"]>;
  is_evening_vacant?: Maybe<Scalars["Boolean"]["output"]>;
  /** A computed field, executes function "reservations_is_holiday" */
  is_holiday?: Maybe<Scalars["Boolean"]["output"]>;
  is_morning_vacant?: Maybe<Scalars["Boolean"]["output"]>;
  /** An object relationship */
  reservation?: Maybe<Reservations>;
};

/** A Relay connection object on "searchable_reservations" */
export type Searchable_ReservationsConnection = {
  __typename?: "searchable_reservationsConnection";
  edges: Array<Searchable_ReservationsEdge>;
  pageInfo: PageInfo;
};

export type Searchable_ReservationsEdge = {
  __typename?: "searchable_reservationsEdge";
  cursor: Scalars["String"]["output"];
  node: Searchable_Reservations;
};

/** Boolean expression to filter rows from the table "searchable_reservations". All fields are combined with a logical 'AND'. */
export type Searchable_Reservations_Bool_Exp = {
  _and?: InputMaybe<Array<Searchable_Reservations_Bool_Exp>>;
  _not?: InputMaybe<Searchable_Reservations_Bool_Exp>;
  _or?: InputMaybe<Array<Searchable_Reservations_Bool_Exp>>;
  date?: InputMaybe<Date_Comparison_Exp>;
  id?: InputMaybe<Bigint_Comparison_Exp>;
  institution?: InputMaybe<Institutions_Bool_Exp>;
  institution_id?: InputMaybe<Uuid_Comparison_Exp>;
  is_afternoon_vacant?: InputMaybe<Boolean_Comparison_Exp>;
  is_evening_vacant?: InputMaybe<Boolean_Comparison_Exp>;
  is_holiday?: InputMaybe<Boolean_Comparison_Exp>;
  is_morning_vacant?: InputMaybe<Boolean_Comparison_Exp>;
  reservation?: InputMaybe<Reservations_Bool_Exp>;
};

/** Ordering options when selecting data from "searchable_reservations". */
export type Searchable_Reservations_Order_By = {
  date?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  institution?: InputMaybe<Institutions_Order_By>;
  institution_id?: InputMaybe<Order_By>;
  is_afternoon_vacant?: InputMaybe<Order_By>;
  is_evening_vacant?: InputMaybe<Order_By>;
  is_holiday?: InputMaybe<Order_By>;
  is_morning_vacant?: InputMaybe<Order_By>;
  reservation?: InputMaybe<Reservations_Order_By>;
};

/** select columns of table "searchable_reservations" */
export enum Searchable_Reservations_Select_Column {
  /** column name */
  Date = "date",
  /** column name */
  Id = "id",
  /** column name */
  InstitutionId = "institution_id",
  /** column name */
  IsAfternoonVacant = "is_afternoon_vacant",
  /** column name */
  IsEveningVacant = "is_evening_vacant",
  /** column name */
  IsMorningVacant = "is_morning_vacant",
}

export type Subscription_Root = {
  __typename?: "subscription_root";
  /** fetch data from the table: "institutions" */
  institutions_connection: InstitutionsConnection;
  node?: Maybe<Node>;
  /** fetch data from the table: "reservations" */
  reservations_connection: ReservationsConnection;
  /** fetch data from the table: "searchable_reservations" */
  searchable_reservations_connection: Searchable_ReservationsConnection;
};

export type Subscription_RootInstitutions_ConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  distinct_on?: InputMaybe<Array<Institutions_Select_Column>>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Institutions_Order_By>>;
  where?: InputMaybe<Institutions_Bool_Exp>;
};

export type Subscription_RootNodeArgs = {
  id: Scalars["ID"]["input"];
};

export type Subscription_RootReservations_ConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  distinct_on?: InputMaybe<Array<Reservations_Select_Column>>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Reservations_Order_By>>;
  where?: InputMaybe<Reservations_Bool_Exp>;
};

export type Subscription_RootSearchable_Reservations_ConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  distinct_on?: InputMaybe<Array<Searchable_Reservations_Select_Column>>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  order_by?: InputMaybe<Array<Searchable_Reservations_Order_By>>;
  where?: InputMaybe<Searchable_Reservations_Bool_Exp>;
};

/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
export type Timestamp_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["timestamp"]["input"]>;
  _gt?: InputMaybe<Scalars["timestamp"]["input"]>;
  _gte?: InputMaybe<Scalars["timestamp"]["input"]>;
  _in?: InputMaybe<Array<Scalars["timestamp"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["timestamp"]["input"]>;
  _lte?: InputMaybe<Scalars["timestamp"]["input"]>;
  _neq?: InputMaybe<Scalars["timestamp"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["timestamp"]["input"]>>;
};

/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
export type Uuid_Comparison_Exp = {
  _eq?: InputMaybe<Scalars["uuid"]["input"]>;
  _gt?: InputMaybe<Scalars["uuid"]["input"]>;
  _gte?: InputMaybe<Scalars["uuid"]["input"]>;
  _in?: InputMaybe<Array<Scalars["uuid"]["input"]>>;
  _is_null?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["uuid"]["input"]>;
  _lte?: InputMaybe<Scalars["uuid"]["input"]>;
  _neq?: InputMaybe<Scalars["uuid"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["uuid"]["input"]>>;
};

export type InstitutionDetailQueryVariables = Exact<{
  id: Scalars["uuid"]["input"];
}>;

export type InstitutionDetailQuery = {
  __typename?: "query_root";
  institutions_connection: {
    __typename?: "institutionsConnection";
    edges: Array<{
      __typename?: "institutionsEdge";
      node: {
        __typename?: "institutions";
        id: string;
        prefecture: any;
        municipality: string;
        building: string;
        institution: string;
        capacity?: number | null;
        area?: any | null;
        fee_divisions: Array<any>;
        weekday_usage_fee: any;
        holiday_usage_fee: any;
        address: string;
        is_available_strings: any;
        is_available_woodwind: any;
        is_available_brass: any;
        is_available_percussion: any;
        is_equipped_music_stand: any;
        is_equipped_piano: any;
        website_url: string;
        layout_image_url: string;
        lottery_period: string;
        note: string;
      };
    }>;
  };
};

export type InstitutionReservationsQueryVariables = Exact<{
  id: Scalars["uuid"]["input"];
  startDate?: InputMaybe<Scalars["date"]["input"]>;
  endDate?: InputMaybe<Scalars["date"]["input"]>;
}>;

export type InstitutionReservationsQuery = {
  __typename?: "query_root";
  reservations_connection: {
    __typename?: "reservationsConnection";
    edges: Array<{
      __typename?: "reservationsEdge";
      node: {
        __typename?: "reservations";
        id: string;
        date: any;
        reservation: any;
        updated_at: any;
      };
    }>;
  };
};

export type InstitutionsQueryVariables = Exact<{
  first?: InputMaybe<Scalars["Int"]["input"]>;
  after?: InputMaybe<Scalars["String"]["input"]>;
  municipality?: InputMaybe<Array<Scalars["String"]["input"]> | Scalars["String"]["input"]>;
  isAvailableStrings?: InputMaybe<Scalars["availavility_division"]["input"]>;
  isAvailableWoodwind?: InputMaybe<Scalars["availavility_division"]["input"]>;
  isAvailableBrass?: InputMaybe<Scalars["availavility_division"]["input"]>;
  isAvailablePercussion?: InputMaybe<Scalars["availavility_division"]["input"]>;
  institutionSizes?: InputMaybe<Array<Scalars["String"]["input"]> | Scalars["String"]["input"]>;
}>;

export type InstitutionsQuery = {
  __typename?: "query_root";
  institutions_connection: {
    __typename?: "institutionsConnection";
    edges: Array<{
      __typename?: "institutionsEdge";
      cursor: string;
      node: {
        __typename?: "institutions";
        id: string;
        municipality: string;
        building: string;
        institution: string;
        institution_size: string;
        is_available_strings: any;
        is_available_woodwind: any;
        is_available_brass: any;
        is_available_percussion: any;
        is_equipped_music_stand: any;
        is_equipped_piano: any;
        updated_at?: any | null;
      };
    }>;
    pageInfo: { __typename?: "PageInfo"; hasNextPage: boolean; endCursor: string };
  };
};

export type ReservationsQueryVariables = Exact<{
  first?: InputMaybe<Scalars["Int"]["input"]>;
  after?: InputMaybe<Scalars["String"]["input"]>;
  prefecture?: InputMaybe<Scalars["prefecture"]["input"]>;
  municipality?: InputMaybe<Array<Scalars["String"]["input"]> | Scalars["String"]["input"]>;
  isAvailableStrings?: InputMaybe<Scalars["availavility_division"]["input"]>;
  isAvailableWoodwind?: InputMaybe<Scalars["availavility_division"]["input"]>;
  isAvailableBrass?: InputMaybe<Scalars["availavility_division"]["input"]>;
  isAvailablePercussion?: InputMaybe<Scalars["availavility_division"]["input"]>;
  institutionSizes?: InputMaybe<Array<Scalars["String"]["input"]> | Scalars["String"]["input"]>;
  startDate?: InputMaybe<Scalars["date"]["input"]>;
  endDate?: InputMaybe<Scalars["date"]["input"]>;
  isHoliday?: InputMaybe<Scalars["Boolean"]["input"]>;
  isMorningVacant?: InputMaybe<Scalars["Boolean"]["input"]>;
  isAfternoonVacant?: InputMaybe<Scalars["Boolean"]["input"]>;
  isEveningVacant?: InputMaybe<Scalars["Boolean"]["input"]>;
}>;

export type ReservationsQuery = {
  __typename?: "query_root";
  searchable_reservations_connection: {
    __typename?: "searchable_reservationsConnection";
    edges: Array<{
      __typename?: "searchable_reservationsEdge";
      cursor: string;
      node: {
        __typename?: "searchable_reservations";
        id: string;
        reservation?: {
          __typename?: "reservations";
          id: string;
          date: any;
          reservation: any;
          updated_at: any;
        } | null;
        institution?: {
          __typename?: "institutions";
          id: string;
          municipality: string;
          building: string;
          institution: string;
          institution_size: string;
        } | null;
      };
    }>;
    pageInfo: { __typename?: "PageInfo"; hasNextPage: boolean; endCursor: string };
  };
};

export const InstitutionDetailDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "institutionDetail" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "uuid" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "institutions_connection" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "where" },
                value: {
                  kind: "ObjectValue",
                  fields: [
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "id" },
                      value: {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "_eq" },
                            value: { kind: "Variable", name: { kind: "Name", value: "id" } },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "first" },
                value: { kind: "IntValue", value: "1" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "edges" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "node" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "id" } },
                            { kind: "Field", name: { kind: "Name", value: "prefecture" } },
                            { kind: "Field", name: { kind: "Name", value: "municipality" } },
                            { kind: "Field", name: { kind: "Name", value: "building" } },
                            { kind: "Field", name: { kind: "Name", value: "institution" } },
                            { kind: "Field", name: { kind: "Name", value: "capacity" } },
                            { kind: "Field", name: { kind: "Name", value: "area" } },
                            { kind: "Field", name: { kind: "Name", value: "fee_divisions" } },
                            { kind: "Field", name: { kind: "Name", value: "weekday_usage_fee" } },
                            { kind: "Field", name: { kind: "Name", value: "holiday_usage_fee" } },
                            { kind: "Field", name: { kind: "Name", value: "address" } },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "is_available_strings" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "is_available_woodwind" },
                            },
                            { kind: "Field", name: { kind: "Name", value: "is_available_brass" } },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "is_available_percussion" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "is_equipped_music_stand" },
                            },
                            { kind: "Field", name: { kind: "Name", value: "is_equipped_piano" } },
                            { kind: "Field", name: { kind: "Name", value: "website_url" } },
                            { kind: "Field", name: { kind: "Name", value: "layout_image_url" } },
                            { kind: "Field", name: { kind: "Name", value: "lottery_period" } },
                            { kind: "Field", name: { kind: "Name", value: "note" } },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<InstitutionDetailQuery, InstitutionDetailQueryVariables>;
export const InstitutionReservationsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "institutionReservations" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "uuid" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "startDate" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "date" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "endDate" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "date" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "reservations_connection" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "where" },
                value: {
                  kind: "ObjectValue",
                  fields: [
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "institution_id" },
                      value: {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "_eq" },
                            value: { kind: "Variable", name: { kind: "Name", value: "id" } },
                          },
                        ],
                      },
                    },
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "date" },
                      value: {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "_gte" },
                            value: { kind: "Variable", name: { kind: "Name", value: "startDate" } },
                          },
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "_lte" },
                            value: { kind: "Variable", name: { kind: "Name", value: "endDate" } },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "order_by" },
                value: {
                  kind: "ObjectValue",
                  fields: [
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "date" },
                      value: { kind: "EnumValue", value: "asc" },
                    },
                  ],
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "first" },
                value: { kind: "IntValue", value: "1000" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "edges" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "node" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "id" } },
                            { kind: "Field", name: { kind: "Name", value: "date" } },
                            { kind: "Field", name: { kind: "Name", value: "reservation" } },
                            { kind: "Field", name: { kind: "Name", value: "updated_at" } },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<InstitutionReservationsQuery, InstitutionReservationsQueryVariables>;
export const InstitutionsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "institutions" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "first" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "after" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "municipality" } },
          type: {
            kind: "ListType",
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
            },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isAvailableStrings" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "availavility_division" } },
          defaultValue: { kind: "NullValue" },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isAvailableWoodwind" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "availavility_division" } },
          defaultValue: { kind: "NullValue" },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isAvailableBrass" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "availavility_division" } },
          defaultValue: { kind: "NullValue" },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isAvailablePercussion" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "availavility_division" } },
          defaultValue: { kind: "NullValue" },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "institutionSizes" } },
          type: {
            kind: "ListType",
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
            },
          },
          defaultValue: { kind: "NullValue" },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "institutions_connection" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "first" },
                value: { kind: "Variable", name: { kind: "Name", value: "first" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "after" },
                value: { kind: "Variable", name: { kind: "Name", value: "after" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "where" },
                value: {
                  kind: "ObjectValue",
                  fields: [
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "municipality" },
                      value: {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "_in" },
                            value: {
                              kind: "Variable",
                              name: { kind: "Name", value: "municipality" },
                            },
                          },
                        ],
                      },
                    },
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "is_available_strings" },
                      value: {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "_eq" },
                            value: {
                              kind: "Variable",
                              name: { kind: "Name", value: "isAvailableStrings" },
                            },
                          },
                        ],
                      },
                    },
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "is_available_woodwind" },
                      value: {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "_eq" },
                            value: {
                              kind: "Variable",
                              name: { kind: "Name", value: "isAvailableWoodwind" },
                            },
                          },
                        ],
                      },
                    },
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "is_available_brass" },
                      value: {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "_eq" },
                            value: {
                              kind: "Variable",
                              name: { kind: "Name", value: "isAvailableBrass" },
                            },
                          },
                        ],
                      },
                    },
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "is_available_percussion" },
                      value: {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "_eq" },
                            value: {
                              kind: "Variable",
                              name: { kind: "Name", value: "isAvailablePercussion" },
                            },
                          },
                        ],
                      },
                    },
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "institution_size" },
                      value: {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "_in" },
                            value: {
                              kind: "Variable",
                              name: { kind: "Name", value: "institutionSizes" },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "order_by" },
                value: {
                  kind: "ObjectValue",
                  fields: [
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "municipality" },
                      value: { kind: "EnumValue", value: "asc" },
                    },
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "building_kana" },
                      value: { kind: "EnumValue", value: "asc" },
                    },
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "institution_kana" },
                      value: { kind: "EnumValue", value: "asc" },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "edges" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "node" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "id" } },
                            { kind: "Field", name: { kind: "Name", value: "municipality" } },
                            { kind: "Field", name: { kind: "Name", value: "building" } },
                            { kind: "Field", name: { kind: "Name", value: "institution" } },
                            { kind: "Field", name: { kind: "Name", value: "institution_size" } },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "is_available_strings" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "is_available_woodwind" },
                            },
                            { kind: "Field", name: { kind: "Name", value: "is_available_brass" } },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "is_available_percussion" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "is_equipped_music_stand" },
                            },
                            { kind: "Field", name: { kind: "Name", value: "is_equipped_piano" } },
                            { kind: "Field", name: { kind: "Name", value: "updated_at" } },
                          ],
                        },
                      },
                      { kind: "Field", name: { kind: "Name", value: "cursor" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pageInfo" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "hasNextPage" } },
                      { kind: "Field", name: { kind: "Name", value: "endCursor" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<InstitutionsQuery, InstitutionsQueryVariables>;
export const ReservationsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "reservations" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "first" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "after" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "prefecture" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "prefecture" } },
          defaultValue: { kind: "NullValue" },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "municipality" } },
          type: {
            kind: "ListType",
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
            },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isAvailableStrings" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "availavility_division" } },
          defaultValue: { kind: "NullValue" },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isAvailableWoodwind" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "availavility_division" } },
          defaultValue: { kind: "NullValue" },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isAvailableBrass" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "availavility_division" } },
          defaultValue: { kind: "NullValue" },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isAvailablePercussion" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "availavility_division" } },
          defaultValue: { kind: "NullValue" },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "institutionSizes" } },
          type: {
            kind: "ListType",
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
            },
          },
          defaultValue: { kind: "NullValue" },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "startDate" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "date" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "endDate" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "date" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isHoliday" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isMorningVacant" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isAfternoonVacant" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "isEveningVacant" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "searchable_reservations_connection" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "first" },
                value: { kind: "Variable", name: { kind: "Name", value: "first" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "after" },
                value: { kind: "Variable", name: { kind: "Name", value: "after" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "where" },
                value: {
                  kind: "ObjectValue",
                  fields: [
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "_and" },
                      value: {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "institution" },
                            value: {
                              kind: "ObjectValue",
                              fields: [
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "prefecture" },
                                  value: {
                                    kind: "ObjectValue",
                                    fields: [
                                      {
                                        kind: "ObjectField",
                                        name: { kind: "Name", value: "_eq" },
                                        value: {
                                          kind: "Variable",
                                          name: { kind: "Name", value: "prefecture" },
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "municipality" },
                                  value: {
                                    kind: "ObjectValue",
                                    fields: [
                                      {
                                        kind: "ObjectField",
                                        name: { kind: "Name", value: "_in" },
                                        value: {
                                          kind: "Variable",
                                          name: { kind: "Name", value: "municipality" },
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "is_available_strings" },
                                  value: {
                                    kind: "ObjectValue",
                                    fields: [
                                      {
                                        kind: "ObjectField",
                                        name: { kind: "Name", value: "_eq" },
                                        value: {
                                          kind: "Variable",
                                          name: { kind: "Name", value: "isAvailableStrings" },
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "is_available_woodwind" },
                                  value: {
                                    kind: "ObjectValue",
                                    fields: [
                                      {
                                        kind: "ObjectField",
                                        name: { kind: "Name", value: "_eq" },
                                        value: {
                                          kind: "Variable",
                                          name: { kind: "Name", value: "isAvailableWoodwind" },
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "is_available_brass" },
                                  value: {
                                    kind: "ObjectValue",
                                    fields: [
                                      {
                                        kind: "ObjectField",
                                        name: { kind: "Name", value: "_eq" },
                                        value: {
                                          kind: "Variable",
                                          name: { kind: "Name", value: "isAvailableBrass" },
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "is_available_percussion" },
                                  value: {
                                    kind: "ObjectValue",
                                    fields: [
                                      {
                                        kind: "ObjectField",
                                        name: { kind: "Name", value: "_eq" },
                                        value: {
                                          kind: "Variable",
                                          name: { kind: "Name", value: "isAvailablePercussion" },
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "institution_size" },
                                  value: {
                                    kind: "ObjectValue",
                                    fields: [
                                      {
                                        kind: "ObjectField",
                                        name: { kind: "Name", value: "_in" },
                                        value: {
                                          kind: "Variable",
                                          name: { kind: "Name", value: "institutionSizes" },
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "date" },
                            value: {
                              kind: "ObjectValue",
                              fields: [
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "_gte" },
                                  value: {
                                    kind: "Variable",
                                    name: { kind: "Name", value: "startDate" },
                                  },
                                },
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "_lte" },
                                  value: {
                                    kind: "Variable",
                                    name: { kind: "Name", value: "endDate" },
                                  },
                                },
                              ],
                            },
                          },
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "is_morning_vacant" },
                            value: {
                              kind: "ObjectValue",
                              fields: [
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "_eq" },
                                  value: {
                                    kind: "Variable",
                                    name: { kind: "Name", value: "isMorningVacant" },
                                  },
                                },
                              ],
                            },
                          },
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "is_afternoon_vacant" },
                            value: {
                              kind: "ObjectValue",
                              fields: [
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "_eq" },
                                  value: {
                                    kind: "Variable",
                                    name: { kind: "Name", value: "isAfternoonVacant" },
                                  },
                                },
                              ],
                            },
                          },
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "is_evening_vacant" },
                            value: {
                              kind: "ObjectValue",
                              fields: [
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "_eq" },
                                  value: {
                                    kind: "Variable",
                                    name: { kind: "Name", value: "isEveningVacant" },
                                  },
                                },
                              ],
                            },
                          },
                          {
                            kind: "ObjectField",
                            name: { kind: "Name", value: "is_holiday" },
                            value: {
                              kind: "ObjectValue",
                              fields: [
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "_eq" },
                                  value: {
                                    kind: "Variable",
                                    name: { kind: "Name", value: "isHoliday" },
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "order_by" },
                value: {
                  kind: "ObjectValue",
                  fields: [
                    {
                      kind: "ObjectField",
                      name: { kind: "Name", value: "date" },
                      value: { kind: "EnumValue", value: "asc" },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "edges" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "node" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "id" } },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "reservation" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  { kind: "Field", name: { kind: "Name", value: "id" } },
                                  { kind: "Field", name: { kind: "Name", value: "date" } },
                                  { kind: "Field", name: { kind: "Name", value: "reservation" } },
                                  { kind: "Field", name: { kind: "Name", value: "updated_at" } },
                                ],
                              },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "institution" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  { kind: "Field", name: { kind: "Name", value: "id" } },
                                  { kind: "Field", name: { kind: "Name", value: "municipality" } },
                                  { kind: "Field", name: { kind: "Name", value: "building" } },
                                  { kind: "Field", name: { kind: "Name", value: "institution" } },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "institution_size" },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      { kind: "Field", name: { kind: "Name", value: "cursor" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pageInfo" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "hasNextPage" } },
                      { kind: "Field", name: { kind: "Name", value: "endCursor" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ReservationsQuery, ReservationsQueryVariables>;
