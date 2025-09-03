import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  _fee_division: { input: any; output: any; }
  availavility_division: { input: any; output: any; }
  bigint: { input: any; output: any; }
  date: { input: any; output: any; }
  equipment_division: { input: any; output: any; }
  jsonb: { input: any; output: any; }
  numeric: { input: any; output: any; }
  prefecture: { input: any; output: any; }
  timestamp: { input: any; output: any; }
  uuid: { input: any; output: any; }
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  _gt?: InputMaybe<Scalars['Boolean']['input']>;
  _gte?: InputMaybe<Scalars['Boolean']['input']>;
  _in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Boolean']['input']>;
  _lte?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
  _nin?: InputMaybe<Array<Scalars['Boolean']['input']>>;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Int']['input']>;
  _gt?: InputMaybe<Scalars['Int']['input']>;
  _gte?: InputMaybe<Scalars['Int']['input']>;
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Int']['input']>;
  _lte?: InputMaybe<Scalars['Int']['input']>;
  _neq?: InputMaybe<Scalars['Int']['input']>;
  _nin?: InputMaybe<Array<Scalars['Int']['input']>>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['String']['input']>;
  _gt?: InputMaybe<Scalars['String']['input']>;
  _gte?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars['String']['input']>;
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars['String']['input']>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars['String']['input']>;
  _lt?: InputMaybe<Scalars['String']['input']>;
  _lte?: InputMaybe<Scalars['String']['input']>;
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars['String']['input']>;
  _nin?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars['String']['input']>;
};

/** Boolean expression to compare columns of type "_fee_division". All fields are combined with logical 'AND'. */
export type _Fee_Division_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['_fee_division']['input']>;
  _gt?: InputMaybe<Scalars['_fee_division']['input']>;
  _gte?: InputMaybe<Scalars['_fee_division']['input']>;
  _in?: InputMaybe<Array<Scalars['_fee_division']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['_fee_division']['input']>;
  _lte?: InputMaybe<Scalars['_fee_division']['input']>;
  _neq?: InputMaybe<Scalars['_fee_division']['input']>;
  _nin?: InputMaybe<Array<Scalars['_fee_division']['input']>>;
};

/** Boolean expression to compare columns of type "availavility_division". All fields are combined with logical 'AND'. */
export type Availavility_Division_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['availavility_division']['input']>;
  _gt?: InputMaybe<Scalars['availavility_division']['input']>;
  _gte?: InputMaybe<Scalars['availavility_division']['input']>;
  _in?: InputMaybe<Array<Scalars['availavility_division']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['availavility_division']['input']>;
  _lte?: InputMaybe<Scalars['availavility_division']['input']>;
  _neq?: InputMaybe<Scalars['availavility_division']['input']>;
  _nin?: InputMaybe<Array<Scalars['availavility_division']['input']>>;
};

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type Bigint_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['bigint']['input']>;
  _gt?: InputMaybe<Scalars['bigint']['input']>;
  _gte?: InputMaybe<Scalars['bigint']['input']>;
  _in?: InputMaybe<Array<Scalars['bigint']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['bigint']['input']>;
  _lte?: InputMaybe<Scalars['bigint']['input']>;
  _neq?: InputMaybe<Scalars['bigint']['input']>;
  _nin?: InputMaybe<Array<Scalars['bigint']['input']>>;
};

/** Boolean expression to compare columns of type "date". All fields are combined with logical 'AND'. */
export type Date_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['date']['input']>;
  _gt?: InputMaybe<Scalars['date']['input']>;
  _gte?: InputMaybe<Scalars['date']['input']>;
  _in?: InputMaybe<Array<Scalars['date']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['date']['input']>;
  _lte?: InputMaybe<Scalars['date']['input']>;
  _neq?: InputMaybe<Scalars['date']['input']>;
  _nin?: InputMaybe<Array<Scalars['date']['input']>>;
};

/** Boolean expression to compare columns of type "equipment_division". All fields are combined with logical 'AND'. */
export type Equipment_Division_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['equipment_division']['input']>;
  _gt?: InputMaybe<Scalars['equipment_division']['input']>;
  _gte?: InputMaybe<Scalars['equipment_division']['input']>;
  _in?: InputMaybe<Array<Scalars['equipment_division']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['equipment_division']['input']>;
  _lte?: InputMaybe<Scalars['equipment_division']['input']>;
  _neq?: InputMaybe<Scalars['equipment_division']['input']>;
  _nin?: InputMaybe<Array<Scalars['equipment_division']['input']>>;
};

/** columns and relationships of "institutions" */
export type Institutions = {
  __typename?: 'institutions';
  address: Scalars['String']['output'];
  area?: Maybe<Scalars['numeric']['output']>;
  building: Scalars['String']['output'];
  building_kana: Scalars['String']['output'];
  building_system_name?: Maybe<Scalars['String']['output']>;
  capacity?: Maybe<Scalars['Int']['output']>;
  created_at: Scalars['timestamp']['output'];
  fee_divisions: Scalars['_fee_division']['output'];
  holiday_usage_fee: Scalars['jsonb']['output'];
  id: Scalars['uuid']['output'];
  institution: Scalars['String']['output'];
  institution_kana: Scalars['String']['output'];
  institution_size: Scalars['String']['output'];
  institution_system_name?: Maybe<Scalars['String']['output']>;
  is_available_brass: Scalars['availavility_division']['output'];
  is_available_percussion: Scalars['availavility_division']['output'];
  is_available_strings: Scalars['availavility_division']['output'];
  is_available_woodwind: Scalars['availavility_division']['output'];
  is_equipped_music_stand: Scalars['equipment_division']['output'];
  is_equipped_piano: Scalars['equipment_division']['output'];
  layout_image_url: Scalars['String']['output'];
  lottery_period: Scalars['String']['output'];
  municipality: Scalars['String']['output'];
  note: Scalars['String']['output'];
  prefecture: Scalars['prefecture']['output'];
  updated_at?: Maybe<Scalars['timestamp']['output']>;
  website_url: Scalars['String']['output'];
  weekday_usage_fee: Scalars['jsonb']['output'];
};


/** columns and relationships of "institutions" */
export type InstitutionsHoliday_Usage_FeeArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};


/** columns and relationships of "institutions" */
export type InstitutionsWeekday_Usage_FeeArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
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
  count: Scalars['Int']['output'];
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
  columns?: InputMaybe<Array<Institutions_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type Institutions_Avg_Fields = {
  __typename?: 'institutions_avg_fields';
  area?: Maybe<Scalars['Float']['output']>;
  capacity?: Maybe<Scalars['Float']['output']>;
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
  fee_divisions?: InputMaybe<_Fee_Division_Comparison_Exp>;
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

/** aggregate max on columns */
export type Institutions_Max_Fields = {
  __typename?: 'institutions_max_fields';
  address?: Maybe<Scalars['String']['output']>;
  area?: Maybe<Scalars['numeric']['output']>;
  building?: Maybe<Scalars['String']['output']>;
  building_kana?: Maybe<Scalars['String']['output']>;
  building_system_name?: Maybe<Scalars['String']['output']>;
  capacity?: Maybe<Scalars['Int']['output']>;
  created_at?: Maybe<Scalars['timestamp']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  institution?: Maybe<Scalars['String']['output']>;
  institution_kana?: Maybe<Scalars['String']['output']>;
  institution_size?: Maybe<Scalars['String']['output']>;
  institution_system_name?: Maybe<Scalars['String']['output']>;
  is_available_brass?: Maybe<Scalars['availavility_division']['output']>;
  is_available_percussion?: Maybe<Scalars['availavility_division']['output']>;
  is_available_strings?: Maybe<Scalars['availavility_division']['output']>;
  is_available_woodwind?: Maybe<Scalars['availavility_division']['output']>;
  is_equipped_music_stand?: Maybe<Scalars['equipment_division']['output']>;
  is_equipped_piano?: Maybe<Scalars['equipment_division']['output']>;
  layout_image_url?: Maybe<Scalars['String']['output']>;
  lottery_period?: Maybe<Scalars['String']['output']>;
  municipality?: Maybe<Scalars['String']['output']>;
  note?: Maybe<Scalars['String']['output']>;
  prefecture?: Maybe<Scalars['prefecture']['output']>;
  updated_at?: Maybe<Scalars['timestamp']['output']>;
  website_url?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Institutions_Min_Fields = {
  __typename?: 'institutions_min_fields';
  address?: Maybe<Scalars['String']['output']>;
  area?: Maybe<Scalars['numeric']['output']>;
  building?: Maybe<Scalars['String']['output']>;
  building_kana?: Maybe<Scalars['String']['output']>;
  building_system_name?: Maybe<Scalars['String']['output']>;
  capacity?: Maybe<Scalars['Int']['output']>;
  created_at?: Maybe<Scalars['timestamp']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  institution?: Maybe<Scalars['String']['output']>;
  institution_kana?: Maybe<Scalars['String']['output']>;
  institution_size?: Maybe<Scalars['String']['output']>;
  institution_system_name?: Maybe<Scalars['String']['output']>;
  is_available_brass?: Maybe<Scalars['availavility_division']['output']>;
  is_available_percussion?: Maybe<Scalars['availavility_division']['output']>;
  is_available_strings?: Maybe<Scalars['availavility_division']['output']>;
  is_available_woodwind?: Maybe<Scalars['availavility_division']['output']>;
  is_equipped_music_stand?: Maybe<Scalars['equipment_division']['output']>;
  is_equipped_piano?: Maybe<Scalars['equipment_division']['output']>;
  layout_image_url?: Maybe<Scalars['String']['output']>;
  lottery_period?: Maybe<Scalars['String']['output']>;
  municipality?: Maybe<Scalars['String']['output']>;
  note?: Maybe<Scalars['String']['output']>;
  prefecture?: Maybe<Scalars['prefecture']['output']>;
  updated_at?: Maybe<Scalars['timestamp']['output']>;
  website_url?: Maybe<Scalars['String']['output']>;
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
  Address = 'address',
  /** column name */
  Area = 'area',
  /** column name */
  Building = 'building',
  /** column name */
  BuildingKana = 'building_kana',
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
  InstitutionKana = 'institution_kana',
  /** column name */
  InstitutionSize = 'institution_size',
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
  area?: Maybe<Scalars['Float']['output']>;
  capacity?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Institutions_Stddev_Pop_Fields = {
  __typename?: 'institutions_stddev_pop_fields';
  area?: Maybe<Scalars['Float']['output']>;
  capacity?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Institutions_Stddev_Samp_Fields = {
  __typename?: 'institutions_stddev_samp_fields';
  area?: Maybe<Scalars['Float']['output']>;
  capacity?: Maybe<Scalars['Float']['output']>;
};

/** aggregate sum on columns */
export type Institutions_Sum_Fields = {
  __typename?: 'institutions_sum_fields';
  area?: Maybe<Scalars['numeric']['output']>;
  capacity?: Maybe<Scalars['Int']['output']>;
};

/** aggregate var_pop on columns */
export type Institutions_Var_Pop_Fields = {
  __typename?: 'institutions_var_pop_fields';
  area?: Maybe<Scalars['Float']['output']>;
  capacity?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Institutions_Var_Samp_Fields = {
  __typename?: 'institutions_var_samp_fields';
  area?: Maybe<Scalars['Float']['output']>;
  capacity?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Institutions_Variance_Fields = {
  __typename?: 'institutions_variance_fields';
  area?: Maybe<Scalars['Float']['output']>;
  capacity?: Maybe<Scalars['Float']['output']>;
};

export type Jsonb_Cast_Exp = {
  String?: InputMaybe<String_Comparison_Exp>;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  _cast?: InputMaybe<Jsonb_Cast_Exp>;
  /** is the column contained in the given json value */
  _contained_in?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the column contain the given json value at the top level */
  _contains?: InputMaybe<Scalars['jsonb']['input']>;
  _eq?: InputMaybe<Scalars['jsonb']['input']>;
  _gt?: InputMaybe<Scalars['jsonb']['input']>;
  _gte?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the string exist as a top-level key in the column */
  _has_key?: InputMaybe<Scalars['String']['input']>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: InputMaybe<Array<Scalars['String']['input']>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: InputMaybe<Array<Scalars['String']['input']>>;
  _in?: InputMaybe<Array<Scalars['jsonb']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['jsonb']['input']>;
  _lte?: InputMaybe<Scalars['jsonb']['input']>;
  _neq?: InputMaybe<Scalars['jsonb']['input']>;
  _nin?: InputMaybe<Array<Scalars['jsonb']['input']>>;
};

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type Numeric_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['numeric']['input']>;
  _gt?: InputMaybe<Scalars['numeric']['input']>;
  _gte?: InputMaybe<Scalars['numeric']['input']>;
  _in?: InputMaybe<Array<Scalars['numeric']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['numeric']['input']>;
  _lte?: InputMaybe<Scalars['numeric']['input']>;
  _neq?: InputMaybe<Scalars['numeric']['input']>;
  _nin?: InputMaybe<Array<Scalars['numeric']['input']>>;
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
  _eq?: InputMaybe<Scalars['prefecture']['input']>;
  _gt?: InputMaybe<Scalars['prefecture']['input']>;
  _gte?: InputMaybe<Scalars['prefecture']['input']>;
  _in?: InputMaybe<Array<Scalars['prefecture']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['prefecture']['input']>;
  _lte?: InputMaybe<Scalars['prefecture']['input']>;
  _neq?: InputMaybe<Scalars['prefecture']['input']>;
  _nin?: InputMaybe<Array<Scalars['prefecture']['input']>>;
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
  distinct_on?: InputMaybe<Array<Institutions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Institutions_Order_By>>;
  where?: InputMaybe<Institutions_Bool_Exp>;
};


export type Query_RootInstitutions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Institutions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Institutions_Order_By>>;
  where?: InputMaybe<Institutions_Bool_Exp>;
};


export type Query_RootInstitutions_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootReservationsArgs = {
  distinct_on?: InputMaybe<Array<Reservations_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Reservations_Order_By>>;
  where?: InputMaybe<Reservations_Bool_Exp>;
};


export type Query_RootReservations_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Reservations_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Reservations_Order_By>>;
  where?: InputMaybe<Reservations_Bool_Exp>;
};


export type Query_RootReservations_By_PkArgs = {
  id: Scalars['bigint']['input'];
};

/** columns and relationships of "reservations" */
export type Reservations = {
  __typename?: 'reservations';
  created_at: Scalars['timestamp']['output'];
  date: Scalars['date']['output'];
  id: Scalars['bigint']['output'];
  /** An object relationship */
  institution?: Maybe<Institutions>;
  institution_id: Scalars['uuid']['output'];
  is_holiday: Scalars['Boolean']['output'];
  reservation: Scalars['jsonb']['output'];
  updated_at: Scalars['timestamp']['output'];
};


/** columns and relationships of "reservations" */
export type ReservationsReservationArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
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
  count: Scalars['Int']['output'];
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
  columns?: InputMaybe<Array<Reservations_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type Reservations_Avg_Fields = {
  __typename?: 'reservations_avg_fields';
  id?: Maybe<Scalars['Float']['output']>;
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

/** aggregate max on columns */
export type Reservations_Max_Fields = {
  __typename?: 'reservations_max_fields';
  created_at?: Maybe<Scalars['timestamp']['output']>;
  date?: Maybe<Scalars['date']['output']>;
  id?: Maybe<Scalars['bigint']['output']>;
  institution_id?: Maybe<Scalars['uuid']['output']>;
  updated_at?: Maybe<Scalars['timestamp']['output']>;
};

/** aggregate min on columns */
export type Reservations_Min_Fields = {
  __typename?: 'reservations_min_fields';
  created_at?: Maybe<Scalars['timestamp']['output']>;
  date?: Maybe<Scalars['date']['output']>;
  id?: Maybe<Scalars['bigint']['output']>;
  institution_id?: Maybe<Scalars['uuid']['output']>;
  updated_at?: Maybe<Scalars['timestamp']['output']>;
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
  CreatedAt = 'created_at',
  /** column name */
  Date = 'date',
  /** column name */
  Id = 'id',
  /** column name */
  InstitutionId = 'institution_id',
  /** column name */
  IsHoliday = 'is_holiday',
  /** column name */
  Reservation = 'reservation',
  /** column name */
  UpdatedAt = 'updated_at'
}

/** aggregate stddev on columns */
export type Reservations_Stddev_Fields = {
  __typename?: 'reservations_stddev_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Reservations_Stddev_Pop_Fields = {
  __typename?: 'reservations_stddev_pop_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Reservations_Stddev_Samp_Fields = {
  __typename?: 'reservations_stddev_samp_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate sum on columns */
export type Reservations_Sum_Fields = {
  __typename?: 'reservations_sum_fields';
  id?: Maybe<Scalars['bigint']['output']>;
};

/** aggregate var_pop on columns */
export type Reservations_Var_Pop_Fields = {
  __typename?: 'reservations_var_pop_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Reservations_Var_Samp_Fields = {
  __typename?: 'reservations_var_samp_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Reservations_Variance_Fields = {
  __typename?: 'reservations_variance_fields';
  id?: Maybe<Scalars['Float']['output']>;
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
  distinct_on?: InputMaybe<Array<Institutions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Institutions_Order_By>>;
  where?: InputMaybe<Institutions_Bool_Exp>;
};


export type Subscription_RootInstitutions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Institutions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Institutions_Order_By>>;
  where?: InputMaybe<Institutions_Bool_Exp>;
};


export type Subscription_RootInstitutions_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootReservationsArgs = {
  distinct_on?: InputMaybe<Array<Reservations_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Reservations_Order_By>>;
  where?: InputMaybe<Reservations_Bool_Exp>;
};


export type Subscription_RootReservations_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Reservations_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Reservations_Order_By>>;
  where?: InputMaybe<Reservations_Bool_Exp>;
};


export type Subscription_RootReservations_By_PkArgs = {
  id: Scalars['bigint']['input'];
};

/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
export type Timestamp_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['timestamp']['input']>;
  _gt?: InputMaybe<Scalars['timestamp']['input']>;
  _gte?: InputMaybe<Scalars['timestamp']['input']>;
  _in?: InputMaybe<Array<Scalars['timestamp']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['timestamp']['input']>;
  _lte?: InputMaybe<Scalars['timestamp']['input']>;
  _neq?: InputMaybe<Scalars['timestamp']['input']>;
  _nin?: InputMaybe<Array<Scalars['timestamp']['input']>>;
};

/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
export type Uuid_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['uuid']['input']>;
  _gt?: InputMaybe<Scalars['uuid']['input']>;
  _gte?: InputMaybe<Scalars['uuid']['input']>;
  _in?: InputMaybe<Array<Scalars['uuid']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['uuid']['input']>;
  _lte?: InputMaybe<Scalars['uuid']['input']>;
  _neq?: InputMaybe<Scalars['uuid']['input']>;
  _nin?: InputMaybe<Array<Scalars['uuid']['input']>>;
};

export type InstitutionDetailQueryVariables = Exact<{
  id: Scalars['uuid']['input'];
}>;


export type InstitutionDetailQuery = { __typename?: 'query_root', institutions_by_pk?: { __typename?: 'institutions', id: any, prefecture: any, municipality: string, building: string, institution: string, capacity?: number | null, area?: any | null, fee_divisions: any, weekday_usage_fee: any, holiday_usage_fee: any, address: string, is_available_strings: any, is_available_woodwind: any, is_available_brass: any, is_available_percussion: any, is_equipped_music_stand: any, is_equipped_piano: any, website_url: string, layout_image_url: string, lottery_period: string, note: string } | null };

export type InstitutionReservationsQueryVariables = Exact<{
  id: Scalars['uuid']['input'];
  startDate?: InputMaybe<Scalars['date']['input']>;
  endDate?: InputMaybe<Scalars['date']['input']>;
}>;


export type InstitutionReservationsQuery = { __typename?: 'query_root', reservations: Array<{ __typename?: 'reservations', id: any, date: any, reservation: any, updated_at: any }> };

export type InstitutionsQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  municipality?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  isAvailableStrings?: InputMaybe<Scalars['availavility_division']['input']>;
  isAvailableWoodwind?: InputMaybe<Scalars['availavility_division']['input']>;
  isAvailableBrass?: InputMaybe<Scalars['availavility_division']['input']>;
  isAvailablePercussion?: InputMaybe<Scalars['availavility_division']['input']>;
  institutionSizes?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type InstitutionsQuery = { __typename?: 'query_root', institutions: Array<{ __typename?: 'institutions', id: any, municipality: string, building: string, institution: string, institution_size: string, is_available_strings: any, is_available_woodwind: any, is_available_brass: any, is_available_percussion: any, is_equipped_music_stand: any, is_equipped_piano: any, updated_at?: any | null }>, institutions_aggregate: { __typename?: 'institutions_aggregate', aggregate?: { __typename?: 'institutions_aggregate_fields', count: number } | null } };

export type ReservationsQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  prefecture?: InputMaybe<Scalars['prefecture']['input']>;
  municipality?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  isAvailableStrings?: InputMaybe<Scalars['availavility_division']['input']>;
  isAvailableWoodwind?: InputMaybe<Scalars['availavility_division']['input']>;
  isAvailableBrass?: InputMaybe<Scalars['availavility_division']['input']>;
  isAvailablePercussion?: InputMaybe<Scalars['availavility_division']['input']>;
  institutionSizes?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['date']['input']>;
  endDate?: InputMaybe<Scalars['date']['input']>;
  isHoliday?: InputMaybe<Scalars['Boolean']['input']>;
  reservationStatus1?: InputMaybe<Scalars['jsonb']['input']>;
  reservationStatus2?: InputMaybe<Scalars['jsonb']['input']>;
  reservationStatus3?: InputMaybe<Scalars['jsonb']['input']>;
  reservationStatus4?: InputMaybe<Scalars['jsonb']['input']>;
}>;


export type ReservationsQuery = { __typename?: 'query_root', reservations: Array<{ __typename?: 'reservations', id: any, date: any, reservation: any, updated_at: any, institution?: { __typename?: 'institutions', id: any, municipality: string, building: string, institution: string, institution_size: string } | null }>, reservations_aggregate: { __typename?: 'reservations_aggregate', aggregate?: { __typename?: 'reservations_aggregate_fields', count: number } | null } };


export const InstitutionDetailDocument = gql`
    query institutionDetail($id: uuid!) {
  institutions_by_pk(id: $id) {
    id
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
}
    `;

/**
 * __useInstitutionDetailQuery__
 *
 * To run a query within a React component, call `useInstitutionDetailQuery` and pass it any options that fit your needs.
 * When your component renders, `useInstitutionDetailQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInstitutionDetailQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useInstitutionDetailQuery(baseOptions: Apollo.QueryHookOptions<InstitutionDetailQuery, InstitutionDetailQueryVariables> & ({ variables: InstitutionDetailQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InstitutionDetailQuery, InstitutionDetailQueryVariables>(InstitutionDetailDocument, options);
      }
export function useInstitutionDetailLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstitutionDetailQuery, InstitutionDetailQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InstitutionDetailQuery, InstitutionDetailQueryVariables>(InstitutionDetailDocument, options);
        }
export function useInstitutionDetailSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<InstitutionDetailQuery, InstitutionDetailQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<InstitutionDetailQuery, InstitutionDetailQueryVariables>(InstitutionDetailDocument, options);
        }
export type InstitutionDetailQueryHookResult = ReturnType<typeof useInstitutionDetailQuery>;
export type InstitutionDetailLazyQueryHookResult = ReturnType<typeof useInstitutionDetailLazyQuery>;
export type InstitutionDetailSuspenseQueryHookResult = ReturnType<typeof useInstitutionDetailSuspenseQuery>;
export type InstitutionDetailQueryResult = Apollo.QueryResult<InstitutionDetailQuery, InstitutionDetailQueryVariables>;
export const InstitutionReservationsDocument = gql`
    query institutionReservations($id: uuid!, $startDate: date, $endDate: date) {
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
 * __useInstitutionReservationsQuery__
 *
 * To run a query within a React component, call `useInstitutionReservationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useInstitutionReservationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInstitutionReservationsQuery({
 *   variables: {
 *      id: // value for 'id'
 *      startDate: // value for 'startDate'
 *      endDate: // value for 'endDate'
 *   },
 * });
 */
export function useInstitutionReservationsQuery(baseOptions: Apollo.QueryHookOptions<InstitutionReservationsQuery, InstitutionReservationsQueryVariables> & ({ variables: InstitutionReservationsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InstitutionReservationsQuery, InstitutionReservationsQueryVariables>(InstitutionReservationsDocument, options);
      }
export function useInstitutionReservationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstitutionReservationsQuery, InstitutionReservationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InstitutionReservationsQuery, InstitutionReservationsQueryVariables>(InstitutionReservationsDocument, options);
        }
export function useInstitutionReservationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<InstitutionReservationsQuery, InstitutionReservationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<InstitutionReservationsQuery, InstitutionReservationsQueryVariables>(InstitutionReservationsDocument, options);
        }
export type InstitutionReservationsQueryHookResult = ReturnType<typeof useInstitutionReservationsQuery>;
export type InstitutionReservationsLazyQueryHookResult = ReturnType<typeof useInstitutionReservationsLazyQuery>;
export type InstitutionReservationsSuspenseQueryHookResult = ReturnType<typeof useInstitutionReservationsSuspenseQuery>;
export type InstitutionReservationsQueryResult = Apollo.QueryResult<InstitutionReservationsQuery, InstitutionReservationsQueryVariables>;
export const InstitutionsDocument = gql`
    query institutions($offset: Int, $limit: Int, $municipality: [String!], $isAvailableStrings: availavility_division = null, $isAvailableWoodwind: availavility_division = null, $isAvailableBrass: availavility_division = null, $isAvailablePercussion: availavility_division = null, $institutionSizes: [String!] = null) {
  institutions(
    offset: $offset
    limit: $limit
    where: {municipality: {_in: $municipality}, is_available_strings: {_eq: $isAvailableStrings}, is_available_woodwind: {_eq: $isAvailableWoodwind}, is_available_brass: {_eq: $isAvailableBrass}, is_available_percussion: {_eq: $isAvailablePercussion}, institution_size: {_in: $institutionSizes}}
    order_by: {municipality: asc, building_kana: asc, institution_kana: asc}
  ) {
    id
    municipality
    building
    institution
    institution_size
    is_available_strings
    is_available_woodwind
    is_available_brass
    is_available_percussion
    is_equipped_music_stand
    is_equipped_piano
    updated_at
  }
  institutions_aggregate(
    where: {municipality: {_in: $municipality}, is_available_strings: {_eq: $isAvailableStrings}, is_available_woodwind: {_eq: $isAvailableWoodwind}, is_available_brass: {_eq: $isAvailableBrass}, is_available_percussion: {_eq: $isAvailablePercussion}, institution_size: {_in: $institutionSizes}}
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
 *      institutionSizes: // value for 'institutionSizes'
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
export function useInstitutionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<InstitutionsQuery, InstitutionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<InstitutionsQuery, InstitutionsQueryVariables>(InstitutionsDocument, options);
        }
export type InstitutionsQueryHookResult = ReturnType<typeof useInstitutionsQuery>;
export type InstitutionsLazyQueryHookResult = ReturnType<typeof useInstitutionsLazyQuery>;
export type InstitutionsSuspenseQueryHookResult = ReturnType<typeof useInstitutionsSuspenseQuery>;
export type InstitutionsQueryResult = Apollo.QueryResult<InstitutionsQuery, InstitutionsQueryVariables>;
export const ReservationsDocument = gql`
    query reservations($offset: Int, $limit: Int, $prefecture: prefecture = null, $municipality: [String!], $isAvailableStrings: availavility_division = null, $isAvailableWoodwind: availavility_division = null, $isAvailableBrass: availavility_division = null, $isAvailablePercussion: availavility_division = null, $institutionSizes: [String!] = null, $startDate: date, $endDate: date, $isHoliday: Boolean, $reservationStatus1: jsonb = null, $reservationStatus2: jsonb = null, $reservationStatus3: jsonb = null, $reservationStatus4: jsonb = null) {
  reservations(
    offset: $offset
    limit: $limit
    where: {_and: {institution: {prefecture: {_eq: $prefecture}, municipality: {_in: $municipality}, is_available_strings: {_eq: $isAvailableStrings}, is_available_woodwind: {_eq: $isAvailableWoodwind}, is_available_brass: {_eq: $isAvailableBrass}, is_available_percussion: {_eq: $isAvailablePercussion}, institution_size: {_in: $institutionSizes}}, date: {_gte: $startDate, _lte: $endDate}, is_holiday: {_eq: $isHoliday}}, _or: [{reservation: {_contains: $reservationStatus1}}, {reservation: {_contains: $reservationStatus2}}, {reservation: {_contains: $reservationStatus3}}, {reservation: {_contains: $reservationStatus4}}]}
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
      institution_size
    }
  }
  reservations_aggregate(
    where: {_and: {institution: {prefecture: {_eq: $prefecture}, municipality: {_in: $municipality}, is_available_strings: {_eq: $isAvailableStrings}, is_available_woodwind: {_eq: $isAvailableWoodwind}, is_available_brass: {_eq: $isAvailableBrass}, is_available_percussion: {_eq: $isAvailablePercussion}, institution_size: {_in: $institutionSizes}}, date: {_gte: $startDate, _lte: $endDate}, is_holiday: {_eq: $isHoliday}}, _or: [{reservation: {_contains: $reservationStatus1}}, {reservation: {_contains: $reservationStatus2}}, {reservation: {_contains: $reservationStatus3}}, {reservation: {_contains: $reservationStatus4}}]}
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
 *      isAvailableStrings: // value for 'isAvailableStrings'
 *      isAvailableWoodwind: // value for 'isAvailableWoodwind'
 *      isAvailableBrass: // value for 'isAvailableBrass'
 *      isAvailablePercussion: // value for 'isAvailablePercussion'
 *      institutionSizes: // value for 'institutionSizes'
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
export function useReservationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ReservationsQuery, ReservationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReservationsQuery, ReservationsQueryVariables>(ReservationsDocument, options);
        }
export type ReservationsQueryHookResult = ReturnType<typeof useReservationsQuery>;
export type ReservationsLazyQueryHookResult = ReturnType<typeof useReservationsLazyQuery>;
export type ReservationsSuspenseQueryHookResult = ReturnType<typeof useReservationsSuspenseQuery>;
export type ReservationsQueryResult = Apollo.QueryResult<ReservationsQuery, ReservationsQueryVariables>;