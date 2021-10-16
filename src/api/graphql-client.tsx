import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions =  {}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  _fee_division: any;
  availavility_division: any;
  bigint: any;
  date: any;
  equipment_division: any;
  jsonb: any;
  numeric: any;
  prefecture: any;
  timestamp: any;
  uuid: any;
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: Maybe<Scalars['Boolean']>;
  _gt?: Maybe<Scalars['Boolean']>;
  _gte?: Maybe<Scalars['Boolean']>;
  _in?: Maybe<Array<Scalars['Boolean']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['Boolean']>;
  _lte?: Maybe<Scalars['Boolean']>;
  _neq?: Maybe<Scalars['Boolean']>;
  _nin?: Maybe<Array<Scalars['Boolean']>>;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: Maybe<Scalars['Int']>;
  _gt?: Maybe<Scalars['Int']>;
  _gte?: Maybe<Scalars['Int']>;
  _in?: Maybe<Array<Scalars['Int']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['Int']>;
  _lte?: Maybe<Scalars['Int']>;
  _neq?: Maybe<Scalars['Int']>;
  _nin?: Maybe<Array<Scalars['Int']>>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: Maybe<Scalars['String']>;
  _gt?: Maybe<Scalars['String']>;
  _gte?: Maybe<Scalars['String']>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: Maybe<Scalars['String']>;
  _in?: Maybe<Array<Scalars['String']>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: Maybe<Scalars['String']>;
  _is_null?: Maybe<Scalars['Boolean']>;
  /** does the column match the given pattern */
  _like?: Maybe<Scalars['String']>;
  _lt?: Maybe<Scalars['String']>;
  _lte?: Maybe<Scalars['String']>;
  _neq?: Maybe<Scalars['String']>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: Maybe<Scalars['String']>;
  _nin?: Maybe<Array<Scalars['String']>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: Maybe<Scalars['String']>;
  /** does the column NOT match the given pattern */
  _nlike?: Maybe<Scalars['String']>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: Maybe<Scalars['String']>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: Maybe<Scalars['String']>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: Maybe<Scalars['String']>;
  /** does the column match the given SQL regular expression */
  _similar?: Maybe<Scalars['String']>;
};

/** Boolean expression to compare columns of type "_fee_division". All fields are combined with logical 'AND'. */
export type _Fee_Division_Comparison_Exp = {
  _eq?: Maybe<Scalars['_fee_division']>;
  _gt?: Maybe<Scalars['_fee_division']>;
  _gte?: Maybe<Scalars['_fee_division']>;
  _in?: Maybe<Array<Scalars['_fee_division']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['_fee_division']>;
  _lte?: Maybe<Scalars['_fee_division']>;
  _neq?: Maybe<Scalars['_fee_division']>;
  _nin?: Maybe<Array<Scalars['_fee_division']>>;
};

/** Boolean expression to compare columns of type "availavility_division". All fields are combined with logical 'AND'. */
export type Availavility_Division_Comparison_Exp = {
  _eq?: Maybe<Scalars['availavility_division']>;
  _gt?: Maybe<Scalars['availavility_division']>;
  _gte?: Maybe<Scalars['availavility_division']>;
  _in?: Maybe<Array<Scalars['availavility_division']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['availavility_division']>;
  _lte?: Maybe<Scalars['availavility_division']>;
  _neq?: Maybe<Scalars['availavility_division']>;
  _nin?: Maybe<Array<Scalars['availavility_division']>>;
};

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type Bigint_Comparison_Exp = {
  _eq?: Maybe<Scalars['bigint']>;
  _gt?: Maybe<Scalars['bigint']>;
  _gte?: Maybe<Scalars['bigint']>;
  _in?: Maybe<Array<Scalars['bigint']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['bigint']>;
  _lte?: Maybe<Scalars['bigint']>;
  _neq?: Maybe<Scalars['bigint']>;
  _nin?: Maybe<Array<Scalars['bigint']>>;
};

/** Boolean expression to compare columns of type "date". All fields are combined with logical 'AND'. */
export type Date_Comparison_Exp = {
  _eq?: Maybe<Scalars['date']>;
  _gt?: Maybe<Scalars['date']>;
  _gte?: Maybe<Scalars['date']>;
  _in?: Maybe<Array<Scalars['date']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['date']>;
  _lte?: Maybe<Scalars['date']>;
  _neq?: Maybe<Scalars['date']>;
  _nin?: Maybe<Array<Scalars['date']>>;
};

/** Boolean expression to compare columns of type "equipment_division". All fields are combined with logical 'AND'. */
export type Equipment_Division_Comparison_Exp = {
  _eq?: Maybe<Scalars['equipment_division']>;
  _gt?: Maybe<Scalars['equipment_division']>;
  _gte?: Maybe<Scalars['equipment_division']>;
  _in?: Maybe<Array<Scalars['equipment_division']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['equipment_division']>;
  _lte?: Maybe<Scalars['equipment_division']>;
  _neq?: Maybe<Scalars['equipment_division']>;
  _nin?: Maybe<Array<Scalars['equipment_division']>>;
};

/** columns and relationships of "institutions" */
export type Institutions = {
  __typename?: 'institutions';
  address: Scalars['String'];
  area?: Maybe<Scalars['numeric']>;
  building: Scalars['String'];
  building_system_name?: Maybe<Scalars['String']>;
  capacity?: Maybe<Scalars['Int']>;
  created_at: Scalars['timestamp'];
  fee_divisions: Scalars['_fee_division'];
  holiday_usage_fee: Scalars['jsonb'];
  id: Scalars['uuid'];
  institution: Scalars['String'];
  institution_system_name?: Maybe<Scalars['String']>;
  is_available_brass: Scalars['availavility_division'];
  is_available_percussion: Scalars['availavility_division'];
  is_available_strings: Scalars['availavility_division'];
  is_available_woodwind: Scalars['availavility_division'];
  is_equipped_music_stand: Scalars['equipment_division'];
  is_equipped_piano: Scalars['equipment_division'];
  layout_image_url: Scalars['String'];
  lottery_period: Scalars['String'];
  municipality: Scalars['String'];
  note: Scalars['String'];
  prefecture: Scalars['prefecture'];
  updated_at: Scalars['timestamp'];
  website_url: Scalars['String'];
  weekday_usage_fee: Scalars['jsonb'];
};


/** columns and relationships of "institutions" */
export type InstitutionsHoliday_Usage_FeeArgs = {
  path?: Maybe<Scalars['String']>;
};


/** columns and relationships of "institutions" */
export type InstitutionsWeekday_Usage_FeeArgs = {
  path?: Maybe<Scalars['String']>;
};

/** aggregated selection of "institutions" */
export type Institutions_Aggregate = {
  __typename?: 'institutions_aggregate';
  aggregate?: Maybe<Institutions_Aggregate_Fields>;
  nodes: Array<Institutions>;
};

/** aggregate fields of "institutions" */
export type Institutions_Aggregate_Fields = {
  __typename?: 'institutions_aggregate_fields';
  avg?: Maybe<Institutions_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Institutions_Max_Fields>;
  min?: Maybe<Institutions_Min_Fields>;
  stddev?: Maybe<Institutions_Stddev_Fields>;
  stddev_pop?: Maybe<Institutions_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Institutions_Stddev_Samp_Fields>;
  sum?: Maybe<Institutions_Sum_Fields>;
  var_pop?: Maybe<Institutions_Var_Pop_Fields>;
  var_samp?: Maybe<Institutions_Var_Samp_Fields>;
  variance?: Maybe<Institutions_Variance_Fields>;
};


/** aggregate fields of "institutions" */
export type Institutions_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Institutions_Select_Column>>;
  distinct?: Maybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type Institutions_Avg_Fields = {
  __typename?: 'institutions_avg_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "institutions". All fields are combined with a logical 'AND'. */
export type Institutions_Bool_Exp = {
  _and?: Maybe<Array<Institutions_Bool_Exp>>;
  _not?: Maybe<Institutions_Bool_Exp>;
  _or?: Maybe<Array<Institutions_Bool_Exp>>;
  address?: Maybe<String_Comparison_Exp>;
  area?: Maybe<Numeric_Comparison_Exp>;
  building?: Maybe<String_Comparison_Exp>;
  building_system_name?: Maybe<String_Comparison_Exp>;
  capacity?: Maybe<Int_Comparison_Exp>;
  created_at?: Maybe<Timestamp_Comparison_Exp>;
  fee_divisions?: Maybe<_Fee_Division_Comparison_Exp>;
  holiday_usage_fee?: Maybe<Jsonb_Comparison_Exp>;
  id?: Maybe<Uuid_Comparison_Exp>;
  institution?: Maybe<String_Comparison_Exp>;
  institution_system_name?: Maybe<String_Comparison_Exp>;
  is_available_brass?: Maybe<Availavility_Division_Comparison_Exp>;
  is_available_percussion?: Maybe<Availavility_Division_Comparison_Exp>;
  is_available_strings?: Maybe<Availavility_Division_Comparison_Exp>;
  is_available_woodwind?: Maybe<Availavility_Division_Comparison_Exp>;
  is_equipped_music_stand?: Maybe<Equipment_Division_Comparison_Exp>;
  is_equipped_piano?: Maybe<Equipment_Division_Comparison_Exp>;
  layout_image_url?: Maybe<String_Comparison_Exp>;
  lottery_period?: Maybe<String_Comparison_Exp>;
  municipality?: Maybe<String_Comparison_Exp>;
  note?: Maybe<String_Comparison_Exp>;
  prefecture?: Maybe<Prefecture_Comparison_Exp>;
  updated_at?: Maybe<Timestamp_Comparison_Exp>;
  website_url?: Maybe<String_Comparison_Exp>;
  weekday_usage_fee?: Maybe<Jsonb_Comparison_Exp>;
};

/** aggregate max on columns */
export type Institutions_Max_Fields = {
  __typename?: 'institutions_max_fields';
  address?: Maybe<Scalars['String']>;
  area?: Maybe<Scalars['numeric']>;
  building?: Maybe<Scalars['String']>;
  building_system_name?: Maybe<Scalars['String']>;
  capacity?: Maybe<Scalars['Int']>;
  created_at?: Maybe<Scalars['timestamp']>;
  id?: Maybe<Scalars['uuid']>;
  institution?: Maybe<Scalars['String']>;
  institution_system_name?: Maybe<Scalars['String']>;
  layout_image_url?: Maybe<Scalars['String']>;
  lottery_period?: Maybe<Scalars['String']>;
  municipality?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
  website_url?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Institutions_Min_Fields = {
  __typename?: 'institutions_min_fields';
  address?: Maybe<Scalars['String']>;
  area?: Maybe<Scalars['numeric']>;
  building?: Maybe<Scalars['String']>;
  building_system_name?: Maybe<Scalars['String']>;
  capacity?: Maybe<Scalars['Int']>;
  created_at?: Maybe<Scalars['timestamp']>;
  id?: Maybe<Scalars['uuid']>;
  institution?: Maybe<Scalars['String']>;
  institution_system_name?: Maybe<Scalars['String']>;
  layout_image_url?: Maybe<Scalars['String']>;
  lottery_period?: Maybe<Scalars['String']>;
  municipality?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
  website_url?: Maybe<Scalars['String']>;
};

/** Ordering options when selecting data from "institutions". */
export type Institutions_Order_By = {
  address?: Maybe<Order_By>;
  area?: Maybe<Order_By>;
  building?: Maybe<Order_By>;
  building_system_name?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  fee_divisions?: Maybe<Order_By>;
  holiday_usage_fee?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  institution_system_name?: Maybe<Order_By>;
  is_available_brass?: Maybe<Order_By>;
  is_available_percussion?: Maybe<Order_By>;
  is_available_strings?: Maybe<Order_By>;
  is_available_woodwind?: Maybe<Order_By>;
  is_equipped_music_stand?: Maybe<Order_By>;
  is_equipped_piano?: Maybe<Order_By>;
  layout_image_url?: Maybe<Order_By>;
  lottery_period?: Maybe<Order_By>;
  municipality?: Maybe<Order_By>;
  note?: Maybe<Order_By>;
  prefecture?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
  website_url?: Maybe<Order_By>;
  weekday_usage_fee?: Maybe<Order_By>;
};

/** select columns of table "institutions" */
export enum Institutions_Select_Column {
  /** column name */
  Address = 'address',
  /** column name */
  Area = 'area',
  /** column name */
  Building = 'building',
  /** column name */
  BuildingSystemName = 'building_system_name',
  /** column name */
  Capacity = 'capacity',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  FeeDivisions = 'fee_divisions',
  /** column name */
  HolidayUsageFee = 'holiday_usage_fee',
  /** column name */
  Id = 'id',
  /** column name */
  Institution = 'institution',
  /** column name */
  InstitutionSystemName = 'institution_system_name',
  /** column name */
  IsAvailableBrass = 'is_available_brass',
  /** column name */
  IsAvailablePercussion = 'is_available_percussion',
  /** column name */
  IsAvailableStrings = 'is_available_strings',
  /** column name */
  IsAvailableWoodwind = 'is_available_woodwind',
  /** column name */
  IsEquippedMusicStand = 'is_equipped_music_stand',
  /** column name */
  IsEquippedPiano = 'is_equipped_piano',
  /** column name */
  LayoutImageUrl = 'layout_image_url',
  /** column name */
  LotteryPeriod = 'lottery_period',
  /** column name */
  Municipality = 'municipality',
  /** column name */
  Note = 'note',
  /** column name */
  Prefecture = 'prefecture',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  WebsiteUrl = 'website_url',
  /** column name */
  WeekdayUsageFee = 'weekday_usage_fee'
}

/** aggregate stddev on columns */
export type Institutions_Stddev_Fields = {
  __typename?: 'institutions_stddev_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Institutions_Stddev_Pop_Fields = {
  __typename?: 'institutions_stddev_pop_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Institutions_Stddev_Samp_Fields = {
  __typename?: 'institutions_stddev_samp_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** aggregate sum on columns */
export type Institutions_Sum_Fields = {
  __typename?: 'institutions_sum_fields';
  area?: Maybe<Scalars['numeric']>;
  capacity?: Maybe<Scalars['Int']>;
};

/** aggregate var_pop on columns */
export type Institutions_Var_Pop_Fields = {
  __typename?: 'institutions_var_pop_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Institutions_Var_Samp_Fields = {
  __typename?: 'institutions_var_samp_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Institutions_Variance_Fields = {
  __typename?: 'institutions_variance_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  /** is the column contained in the given json value */
  _contained_in?: Maybe<Scalars['jsonb']>;
  /** does the column contain the given json value at the top level */
  _contains?: Maybe<Scalars['jsonb']>;
  _eq?: Maybe<Scalars['jsonb']>;
  _gt?: Maybe<Scalars['jsonb']>;
  _gte?: Maybe<Scalars['jsonb']>;
  /** does the string exist as a top-level key in the column */
  _has_key?: Maybe<Scalars['String']>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: Maybe<Array<Scalars['String']>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: Maybe<Array<Scalars['String']>>;
  _in?: Maybe<Array<Scalars['jsonb']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['jsonb']>;
  _lte?: Maybe<Scalars['jsonb']>;
  _neq?: Maybe<Scalars['jsonb']>;
  _nin?: Maybe<Array<Scalars['jsonb']>>;
};

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type Numeric_Comparison_Exp = {
  _eq?: Maybe<Scalars['numeric']>;
  _gt?: Maybe<Scalars['numeric']>;
  _gte?: Maybe<Scalars['numeric']>;
  _in?: Maybe<Array<Scalars['numeric']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['numeric']>;
  _lte?: Maybe<Scalars['numeric']>;
  _neq?: Maybe<Scalars['numeric']>;
  _nin?: Maybe<Array<Scalars['numeric']>>;
};

/** column ordering options */
export enum Order_By {
  /** in ascending order, nulls last */
  Asc = 'asc',
  /** in ascending order, nulls first */
  AscNullsFirst = 'asc_nulls_first',
  /** in ascending order, nulls last */
  AscNullsLast = 'asc_nulls_last',
  /** in descending order, nulls first */
  Desc = 'desc',
  /** in descending order, nulls first */
  DescNullsFirst = 'desc_nulls_first',
  /** in descending order, nulls last */
  DescNullsLast = 'desc_nulls_last'
}

/** Boolean expression to compare columns of type "prefecture". All fields are combined with logical 'AND'. */
export type Prefecture_Comparison_Exp = {
  _eq?: Maybe<Scalars['prefecture']>;
  _gt?: Maybe<Scalars['prefecture']>;
  _gte?: Maybe<Scalars['prefecture']>;
  _in?: Maybe<Array<Scalars['prefecture']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['prefecture']>;
  _lte?: Maybe<Scalars['prefecture']>;
  _neq?: Maybe<Scalars['prefecture']>;
  _nin?: Maybe<Array<Scalars['prefecture']>>;
};

export type Query_Root = {
  __typename?: 'query_root';
  /** fetch data from the table: "institutions" */
  institutions: Array<Institutions>;
  /** fetch aggregated fields from the table: "institutions" */
  institutions_aggregate: Institutions_Aggregate;
  /** fetch data from the table: "institutions" using primary key columns */
  institutions_by_pk?: Maybe<Institutions>;
  /** fetch data from the table: "reservations" */
  reservations: Array<Reservations>;
  /** fetch aggregated fields from the table: "reservations" */
  reservations_aggregate: Reservations_Aggregate;
  /** fetch data from the table: "reservations" using primary key columns */
  reservations_by_pk?: Maybe<Reservations>;
};


export type Query_RootInstitutionsArgs = {
  distinct_on?: Maybe<Array<Institutions_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Institutions_Order_By>>;
  where?: Maybe<Institutions_Bool_Exp>;
};


export type Query_RootInstitutions_AggregateArgs = {
  distinct_on?: Maybe<Array<Institutions_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Institutions_Order_By>>;
  where?: Maybe<Institutions_Bool_Exp>;
};


export type Query_RootInstitutions_By_PkArgs = {
  id: Scalars['uuid'];
};


export type Query_RootReservationsArgs = {
  distinct_on?: Maybe<Array<Reservations_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Reservations_Order_By>>;
  where?: Maybe<Reservations_Bool_Exp>;
};


export type Query_RootReservations_AggregateArgs = {
  distinct_on?: Maybe<Array<Reservations_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Reservations_Order_By>>;
  where?: Maybe<Reservations_Bool_Exp>;
};


export type Query_RootReservations_By_PkArgs = {
  id: Scalars['bigint'];
};

/** columns and relationships of "reservations" */
export type Reservations = {
  __typename?: 'reservations';
  building_system_name: Scalars['String'];
  created_at: Scalars['timestamp'];
  date: Scalars['date'];
  id: Scalars['bigint'];
  /** An object relationship */
  institution?: Maybe<Institutions>;
  institution_id?: Maybe<Scalars['uuid']>;
  institution_system_name: Scalars['String'];
  is_holiday: Scalars['Boolean'];
  municipality: Scalars['String'];
  prefecture: Scalars['prefecture'];
  reservation: Scalars['jsonb'];
  updated_at: Scalars['timestamp'];
};


/** columns and relationships of "reservations" */
export type ReservationsReservationArgs = {
  path?: Maybe<Scalars['String']>;
};

/** aggregated selection of "reservations" */
export type Reservations_Aggregate = {
  __typename?: 'reservations_aggregate';
  aggregate?: Maybe<Reservations_Aggregate_Fields>;
  nodes: Array<Reservations>;
};

/** aggregate fields of "reservations" */
export type Reservations_Aggregate_Fields = {
  __typename?: 'reservations_aggregate_fields';
  avg?: Maybe<Reservations_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Reservations_Max_Fields>;
  min?: Maybe<Reservations_Min_Fields>;
  stddev?: Maybe<Reservations_Stddev_Fields>;
  stddev_pop?: Maybe<Reservations_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Reservations_Stddev_Samp_Fields>;
  sum?: Maybe<Reservations_Sum_Fields>;
  var_pop?: Maybe<Reservations_Var_Pop_Fields>;
  var_samp?: Maybe<Reservations_Var_Samp_Fields>;
  variance?: Maybe<Reservations_Variance_Fields>;
};


/** aggregate fields of "reservations" */
export type Reservations_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Reservations_Select_Column>>;
  distinct?: Maybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type Reservations_Avg_Fields = {
  __typename?: 'reservations_avg_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "reservations". All fields are combined with a logical 'AND'. */
export type Reservations_Bool_Exp = {
  _and?: Maybe<Array<Reservations_Bool_Exp>>;
  _not?: Maybe<Reservations_Bool_Exp>;
  _or?: Maybe<Array<Reservations_Bool_Exp>>;
  building_system_name?: Maybe<String_Comparison_Exp>;
  created_at?: Maybe<Timestamp_Comparison_Exp>;
  date?: Maybe<Date_Comparison_Exp>;
  id?: Maybe<Bigint_Comparison_Exp>;
  institution?: Maybe<Institutions_Bool_Exp>;
  institution_id?: Maybe<Uuid_Comparison_Exp>;
  institution_system_name?: Maybe<String_Comparison_Exp>;
  is_holiday?: Maybe<Boolean_Comparison_Exp>;
  municipality?: Maybe<String_Comparison_Exp>;
  prefecture?: Maybe<Prefecture_Comparison_Exp>;
  reservation?: Maybe<Jsonb_Comparison_Exp>;
  updated_at?: Maybe<Timestamp_Comparison_Exp>;
};

/** aggregate max on columns */
export type Reservations_Max_Fields = {
  __typename?: 'reservations_max_fields';
  building_system_name?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamp']>;
  date?: Maybe<Scalars['date']>;
  id?: Maybe<Scalars['bigint']>;
  institution_id?: Maybe<Scalars['uuid']>;
  institution_system_name?: Maybe<Scalars['String']>;
  municipality?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** aggregate min on columns */
export type Reservations_Min_Fields = {
  __typename?: 'reservations_min_fields';
  building_system_name?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamp']>;
  date?: Maybe<Scalars['date']>;
  id?: Maybe<Scalars['bigint']>;
  institution_id?: Maybe<Scalars['uuid']>;
  institution_system_name?: Maybe<Scalars['String']>;
  municipality?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** Ordering options when selecting data from "reservations". */
export type Reservations_Order_By = {
  building_system_name?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  date?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Institutions_Order_By>;
  institution_id?: Maybe<Order_By>;
  institution_system_name?: Maybe<Order_By>;
  is_holiday?: Maybe<Order_By>;
  municipality?: Maybe<Order_By>;
  prefecture?: Maybe<Order_By>;
  reservation?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** select columns of table "reservations" */
export enum Reservations_Select_Column {
  /** column name */
  BuildingSystemName = 'building_system_name',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Date = 'date',
  /** column name */
  Id = 'id',
  /** column name */
  InstitutionId = 'institution_id',
  /** column name */
  InstitutionSystemName = 'institution_system_name',
  /** column name */
  IsHoliday = 'is_holiday',
  /** column name */
  Municipality = 'municipality',
  /** column name */
  Prefecture = 'prefecture',
  /** column name */
  Reservation = 'reservation',
  /** column name */
  UpdatedAt = 'updated_at'
}

/** aggregate stddev on columns */
export type Reservations_Stddev_Fields = {
  __typename?: 'reservations_stddev_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Reservations_Stddev_Pop_Fields = {
  __typename?: 'reservations_stddev_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Reservations_Stddev_Samp_Fields = {
  __typename?: 'reservations_stddev_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate sum on columns */
export type Reservations_Sum_Fields = {
  __typename?: 'reservations_sum_fields';
  id?: Maybe<Scalars['bigint']>;
};

/** aggregate var_pop on columns */
export type Reservations_Var_Pop_Fields = {
  __typename?: 'reservations_var_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Reservations_Var_Samp_Fields = {
  __typename?: 'reservations_var_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Reservations_Variance_Fields = {
  __typename?: 'reservations_variance_fields';
  id?: Maybe<Scalars['Float']>;
};

export type Subscription_Root = {
  __typename?: 'subscription_root';
  /** fetch data from the table: "institutions" */
  institutions: Array<Institutions>;
  /** fetch aggregated fields from the table: "institutions" */
  institutions_aggregate: Institutions_Aggregate;
  /** fetch data from the table: "institutions" using primary key columns */
  institutions_by_pk?: Maybe<Institutions>;
  /** fetch data from the table: "reservations" */
  reservations: Array<Reservations>;
  /** fetch aggregated fields from the table: "reservations" */
  reservations_aggregate: Reservations_Aggregate;
  /** fetch data from the table: "reservations" using primary key columns */
  reservations_by_pk?: Maybe<Reservations>;
};


export type Subscription_RootInstitutionsArgs = {
  distinct_on?: Maybe<Array<Institutions_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Institutions_Order_By>>;
  where?: Maybe<Institutions_Bool_Exp>;
};


export type Subscription_RootInstitutions_AggregateArgs = {
  distinct_on?: Maybe<Array<Institutions_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Institutions_Order_By>>;
  where?: Maybe<Institutions_Bool_Exp>;
};


export type Subscription_RootInstitutions_By_PkArgs = {
  id: Scalars['uuid'];
};


export type Subscription_RootReservationsArgs = {
  distinct_on?: Maybe<Array<Reservations_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Reservations_Order_By>>;
  where?: Maybe<Reservations_Bool_Exp>;
};


export type Subscription_RootReservations_AggregateArgs = {
  distinct_on?: Maybe<Array<Reservations_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Reservations_Order_By>>;
  where?: Maybe<Reservations_Bool_Exp>;
};


export type Subscription_RootReservations_By_PkArgs = {
  id: Scalars['bigint'];
};

/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
export type Timestamp_Comparison_Exp = {
  _eq?: Maybe<Scalars['timestamp']>;
  _gt?: Maybe<Scalars['timestamp']>;
  _gte?: Maybe<Scalars['timestamp']>;
  _in?: Maybe<Array<Scalars['timestamp']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['timestamp']>;
  _lte?: Maybe<Scalars['timestamp']>;
  _neq?: Maybe<Scalars['timestamp']>;
  _nin?: Maybe<Array<Scalars['timestamp']>>;
};

/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
export type Uuid_Comparison_Exp = {
  _eq?: Maybe<Scalars['uuid']>;
  _gt?: Maybe<Scalars['uuid']>;
  _gte?: Maybe<Scalars['uuid']>;
  _in?: Maybe<Array<Scalars['uuid']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['uuid']>;
  _lte?: Maybe<Scalars['uuid']>;
  _neq?: Maybe<Scalars['uuid']>;
  _nin?: Maybe<Array<Scalars['uuid']>>;
};

export type Detail_InstitutionQueryVariables = Exact<{
  id: Scalars['uuid'];
}>;


export type Detail_InstitutionQuery = { __typename?: 'query_root', institutions_by_pk?: { __typename?: 'institutions', prefecture: any, municipality: string, building: string, institution: string, capacity?: number | null | undefined, area?: any | null | undefined, fee_divisions: any, weekday_usage_fee: any, holiday_usage_fee: any, address: string, is_available_strings: any, is_available_woodwind: any, is_available_brass: any, is_available_percussion: any, is_equipped_music_stand: any, is_equipped_piano: any, website_url: string, layout_image_url: string, lottery_period: string, note: string } | null | undefined, reservations_aggregate: { __typename?: 'reservations_aggregate', aggregate?: { __typename?: 'reservations_aggregate_fields', count: number, max?: { __typename?: 'reservations_max_fields', date?: any | null | undefined } | null | undefined, min?: { __typename?: 'reservations_min_fields', date?: any | null | undefined } | null | undefined } | null | undefined } };

export type Detail_ReservationsQueryVariables = Exact<{
  id: Scalars['uuid'];
  startDate?: Maybe<Scalars['date']>;
  endDate?: Maybe<Scalars['date']>;
}>;


export type Detail_ReservationsQuery = { __typename?: 'query_root', reservations: Array<{ __typename?: 'reservations', id: any, date: any, reservation: any, updated_at: any }> };

export type InstitutionsQueryVariables = Exact<{
  offset?: Maybe<Scalars['Int']>;
  limit?: Maybe<Scalars['Int']>;
  municipality?: Maybe<Array<Scalars['String']> | Scalars['String']>;
  isAvailableStrings?: Maybe<Scalars['availavility_division']>;
  isAvailableWoodwind?: Maybe<Scalars['availavility_division']>;
  isAvailableBrass?: Maybe<Scalars['availavility_division']>;
  isAvailablePercussion?: Maybe<Scalars['availavility_division']>;
}>;


export type InstitutionsQuery = { __typename?: 'query_root', institutions: Array<{ __typename?: 'institutions', id: any, municipality: string, building: string, institution: string, capacity?: number | null | undefined, area?: any | null | undefined, is_available_strings: any, is_available_woodwind: any, is_available_brass: any, is_available_percussion: any, updated_at: any }>, institutions_aggregate: { __typename?: 'institutions_aggregate', aggregate?: { __typename?: 'institutions_aggregate_fields', count: number } | null | undefined } };

export type ReservationsQueryVariables = Exact<{
  offset?: Maybe<Scalars['Int']>;
  limit?: Maybe<Scalars['Int']>;
  prefecture?: Maybe<Scalars['prefecture']>;
  municipality?: Maybe<Array<Scalars['String']> | Scalars['String']>;
  startDate?: Maybe<Scalars['date']>;
  endDate?: Maybe<Scalars['date']>;
  isHoliday?: Maybe<Scalars['Boolean']>;
  reservationStatus1?: Maybe<Scalars['jsonb']>;
  reservationStatus2?: Maybe<Scalars['jsonb']>;
  reservationStatus3?: Maybe<Scalars['jsonb']>;
  reservationStatus4?: Maybe<Scalars['jsonb']>;
}>;


export type ReservationsQuery = { __typename?: 'query_root', reservations: Array<{ __typename?: 'reservations', id: any, date: any, reservation: any, updated_at: any, institution?: { __typename?: 'institutions', id: any, municipality: string, building: string, institution: string } | null | undefined }>, reservations_aggregate: { __typename?: 'reservations_aggregate', aggregate?: { __typename?: 'reservations_aggregate_fields', count: number } | null | undefined } };


export const Detail_InstitutionDocument = gql`
    query detail_institution($id: uuid!) {
  institutions_by_pk(id: $id) {
    prefecture
    municipality
    building
    institution
    capacity
    area
    fee_divisions
    weekday_usage_fee
    holiday_usage_fee
    address
    is_available_strings
    is_available_woodwind
    is_available_brass
    is_available_percussion
    is_equipped_music_stand
    is_equipped_piano
    website_url
    layout_image_url
    lottery_period
    note
  }
  reservations_aggregate(where: {institution_id: {_eq: $id}}) {
    aggregate {
      count
      max {
        date
      }
      min {
        date
      }
    }
  }
}
    `;

/**
 * __useDetail_InstitutionQuery__
 *
 * To run a query within a React component, call `useDetail_InstitutionQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetail_InstitutionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetail_InstitutionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetail_InstitutionQuery(baseOptions: Apollo.QueryHookOptions<Detail_InstitutionQuery, Detail_InstitutionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Detail_InstitutionQuery, Detail_InstitutionQueryVariables>(Detail_InstitutionDocument, options);
      }
export function useDetail_InstitutionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Detail_InstitutionQuery, Detail_InstitutionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Detail_InstitutionQuery, Detail_InstitutionQueryVariables>(Detail_InstitutionDocument, options);
        }
export type Detail_InstitutionQueryHookResult = ReturnType<typeof useDetail_InstitutionQuery>;
export type Detail_InstitutionLazyQueryHookResult = ReturnType<typeof useDetail_InstitutionLazyQuery>;
export type Detail_InstitutionQueryResult = Apollo.QueryResult<Detail_InstitutionQuery, Detail_InstitutionQueryVariables>;
export const Detail_ReservationsDocument = gql`
    query detail_reservations($id: uuid!, $startDate: date, $endDate: date) {
  reservations(
    where: {institution_id: {_eq: $id}, date: {_gte: $startDate, _lte: $endDate}}
    order_by: {date: asc}
  ) {
    id
    date
    reservation
    updated_at
  }
}
    `;

/**
 * __useDetail_ReservationsQuery__
 *
 * To run a query within a React component, call `useDetail_ReservationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetail_ReservationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetail_ReservationsQuery({
 *   variables: {
 *      id: // value for 'id'
 *      startDate: // value for 'startDate'
 *      endDate: // value for 'endDate'
 *   },
 * });
 */
export function useDetail_ReservationsQuery(baseOptions: Apollo.QueryHookOptions<Detail_ReservationsQuery, Detail_ReservationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Detail_ReservationsQuery, Detail_ReservationsQueryVariables>(Detail_ReservationsDocument, options);
      }
export function useDetail_ReservationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Detail_ReservationsQuery, Detail_ReservationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Detail_ReservationsQuery, Detail_ReservationsQueryVariables>(Detail_ReservationsDocument, options);
        }
export type Detail_ReservationsQueryHookResult = ReturnType<typeof useDetail_ReservationsQuery>;
export type Detail_ReservationsLazyQueryHookResult = ReturnType<typeof useDetail_ReservationsLazyQuery>;
export type Detail_ReservationsQueryResult = Apollo.QueryResult<Detail_ReservationsQuery, Detail_ReservationsQueryVariables>;
export const InstitutionsDocument = gql`
    query institutions($offset: Int, $limit: Int, $municipality: [String!], $isAvailableStrings: availavility_division = null, $isAvailableWoodwind: availavility_division = null, $isAvailableBrass: availavility_division = null, $isAvailablePercussion: availavility_division = null) {
  institutions(
    offset: $offset
    limit: $limit
    where: {municipality: {_in: $municipality}, is_available_strings: {_eq: $isAvailableStrings}, is_available_woodwind: {_eq: $isAvailableWoodwind}, is_available_brass: {_eq: $isAvailableBrass}, is_available_percussion: {_eq: $isAvailablePercussion}}
  ) {
    id
    municipality
    building
    institution
    capacity
    area
    is_available_strings
    is_available_woodwind
    is_available_brass
    is_available_percussion
    updated_at
  }
  institutions_aggregate(
    where: {municipality: {_in: $municipality}, is_available_strings: {_eq: $isAvailableStrings}, is_available_woodwind: {_eq: $isAvailableWoodwind}, is_available_brass: {_eq: $isAvailableBrass}, is_available_percussion: {_eq: $isAvailablePercussion}}
  ) {
    aggregate {
      count
    }
  }
}
    `;

/**
 * __useInstitutionsQuery__
 *
 * To run a query within a React component, call `useInstitutionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useInstitutionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInstitutionsQuery({
 *   variables: {
 *      offset: // value for 'offset'
 *      limit: // value for 'limit'
 *      municipality: // value for 'municipality'
 *      isAvailableStrings: // value for 'isAvailableStrings'
 *      isAvailableWoodwind: // value for 'isAvailableWoodwind'
 *      isAvailableBrass: // value for 'isAvailableBrass'
 *      isAvailablePercussion: // value for 'isAvailablePercussion'
 *   },
 * });
 */
export function useInstitutionsQuery(baseOptions?: Apollo.QueryHookOptions<InstitutionsQuery, InstitutionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InstitutionsQuery, InstitutionsQueryVariables>(InstitutionsDocument, options);
      }
export function useInstitutionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstitutionsQuery, InstitutionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InstitutionsQuery, InstitutionsQueryVariables>(InstitutionsDocument, options);
        }
export type InstitutionsQueryHookResult = ReturnType<typeof useInstitutionsQuery>;
export type InstitutionsLazyQueryHookResult = ReturnType<typeof useInstitutionsLazyQuery>;
export type InstitutionsQueryResult = Apollo.QueryResult<InstitutionsQuery, InstitutionsQueryVariables>;
export const ReservationsDocument = gql`
    query reservations($offset: Int, $limit: Int, $prefecture: prefecture = "PREFECTURE_TOKYO", $municipality: [String!], $startDate: date, $endDate: date, $isHoliday: Boolean, $reservationStatus1: jsonb = null, $reservationStatus2: jsonb = null, $reservationStatus3: jsonb = null, $reservationStatus4: jsonb = null) {
  reservations(
    offset: $offset
    limit: $limit
    where: {_and: {institution: {prefecture: {_eq: $prefecture}, municipality: {_in: $municipality}}, date: {_gte: $startDate, _lte: $endDate}, is_holiday: {_eq: $isHoliday}}, _or: [{reservation: {_contains: $reservationStatus1}}, {reservation: {_contains: $reservationStatus2}}, {reservation: {_contains: $reservationStatus3}}, {reservation: {_contains: $reservationStatus4}}]}
    order_by: {date: asc}
  ) {
    id
    date
    reservation
    updated_at
    institution {
      id
      municipality
      building
      institution
    }
  }
  reservations_aggregate(
    where: {_and: {institution: {prefecture: {_eq: $prefecture}, municipality: {_in: $municipality}}, date: {_gte: $startDate, _lte: $endDate}, is_holiday: {_eq: $isHoliday}}, _or: [{reservation: {_contains: $reservationStatus1}}, {reservation: {_contains: $reservationStatus2}}, {reservation: {_contains: $reservationStatus3}}, {reservation: {_contains: $reservationStatus4}}]}
  ) {
    aggregate {
      count
    }
  }
}
    `;

/**
 * __useReservationsQuery__
 *
 * To run a query within a React component, call `useReservationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useReservationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReservationsQuery({
 *   variables: {
 *      offset: // value for 'offset'
 *      limit: // value for 'limit'
 *      prefecture: // value for 'prefecture'
 *      municipality: // value for 'municipality'
 *      startDate: // value for 'startDate'
 *      endDate: // value for 'endDate'
 *      isHoliday: // value for 'isHoliday'
 *      reservationStatus1: // value for 'reservationStatus1'
 *      reservationStatus2: // value for 'reservationStatus2'
 *      reservationStatus3: // value for 'reservationStatus3'
 *      reservationStatus4: // value for 'reservationStatus4'
 *   },
 * });
 */
export function useReservationsQuery(baseOptions?: Apollo.QueryHookOptions<ReservationsQuery, ReservationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReservationsQuery, ReservationsQueryVariables>(ReservationsDocument, options);
      }
export function useReservationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReservationsQuery, ReservationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReservationsQuery, ReservationsQueryVariables>(ReservationsDocument, options);
        }
export type ReservationsQueryHookResult = ReturnType<typeof useReservationsQuery>;
export type ReservationsLazyQueryHookResult = ReturnType<typeof useReservationsLazyQuery>;
export type ReservationsQueryResult = Apollo.QueryResult<ReservationsQuery, ReservationsQueryVariables>;