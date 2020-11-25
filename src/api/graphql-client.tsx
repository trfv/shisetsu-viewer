import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  _text: any;
  date: any;
  jsonb: any;
  timestamp: any;
  timestamptz: any;
  uuid: any;
};

/** expression to compare columns of type Int. All fields are combined with logical 'AND'. */
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

/** expression to compare columns of type String. All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: Maybe<Scalars['String']>;
  _gt?: Maybe<Scalars['String']>;
  _gte?: Maybe<Scalars['String']>;
  _ilike?: Maybe<Scalars['String']>;
  _in?: Maybe<Array<Scalars['String']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _like?: Maybe<Scalars['String']>;
  _lt?: Maybe<Scalars['String']>;
  _lte?: Maybe<Scalars['String']>;
  _neq?: Maybe<Scalars['String']>;
  _nilike?: Maybe<Scalars['String']>;
  _nin?: Maybe<Array<Scalars['String']>>;
  _nlike?: Maybe<Scalars['String']>;
  _nsimilar?: Maybe<Scalars['String']>;
  _similar?: Maybe<Scalars['String']>;
};


/** expression to compare columns of type _text. All fields are combined with logical 'AND'. */
export type _Text_Comparison_Exp = {
  _eq?: Maybe<Scalars['_text']>;
  _gt?: Maybe<Scalars['_text']>;
  _gte?: Maybe<Scalars['_text']>;
  _in?: Maybe<Array<Scalars['_text']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['_text']>;
  _lte?: Maybe<Scalars['_text']>;
  _neq?: Maybe<Scalars['_text']>;
  _nin?: Maybe<Array<Scalars['_text']>>;
};


/** expression to compare columns of type date. All fields are combined with logical 'AND'. */
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

/** columns and relationships of "institution" */
export type Institution = {
  __typename?: 'institution';
  address: Scalars['String'];
  area: Scalars['String'];
  building: Scalars['String'];
  capacity: Scalars['String'];
  created_at: Scalars['timestamp'];
  holiday_usage_fee: Scalars['jsonb'];
  id: Scalars['uuid'];
  institution: Scalars['String'];
  is_available_brass: Scalars['String'];
  is_available_percussion: Scalars['String'];
  is_available_strings: Scalars['String'];
  is_available_woodwind: Scalars['String'];
  is_equipped_music_stand: Scalars['String'];
  is_equipped_piano: Scalars['String'];
  layout_image_url: Scalars['String'];
  lottery_period: Scalars['String'];
  note: Scalars['String'];
  reservation_division: Scalars['_text'];
  website_url: Scalars['String'];
  weekday_usage_fee: Scalars['jsonb'];
};


/** columns and relationships of "institution" */
export type InstitutionHoliday_Usage_FeeArgs = {
  path?: Maybe<Scalars['String']>;
};


/** columns and relationships of "institution" */
export type InstitutionWeekday_Usage_FeeArgs = {
  path?: Maybe<Scalars['String']>;
};

/** aggregated selection of "institution" */
export type Institution_Aggregate = {
  __typename?: 'institution_aggregate';
  aggregate?: Maybe<Institution_Aggregate_Fields>;
  nodes: Array<Institution>;
};

/** aggregate fields of "institution" */
export type Institution_Aggregate_Fields = {
  __typename?: 'institution_aggregate_fields';
  count?: Maybe<Scalars['Int']>;
  max?: Maybe<Institution_Max_Fields>;
  min?: Maybe<Institution_Min_Fields>;
};


/** aggregate fields of "institution" */
export type Institution_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Institution_Select_Column>>;
  distinct?: Maybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "institution" */
export type Institution_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<Institution_Max_Order_By>;
  min?: Maybe<Institution_Min_Order_By>;
};

/** Boolean expression to filter rows from the table "institution". All fields are combined with a logical 'AND'. */
export type Institution_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Institution_Bool_Exp>>>;
  _not?: Maybe<Institution_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Institution_Bool_Exp>>>;
  address?: Maybe<String_Comparison_Exp>;
  area?: Maybe<String_Comparison_Exp>;
  building?: Maybe<String_Comparison_Exp>;
  capacity?: Maybe<String_Comparison_Exp>;
  created_at?: Maybe<Timestamp_Comparison_Exp>;
  holiday_usage_fee?: Maybe<Jsonb_Comparison_Exp>;
  id?: Maybe<Uuid_Comparison_Exp>;
  institution?: Maybe<String_Comparison_Exp>;
  is_available_brass?: Maybe<String_Comparison_Exp>;
  is_available_percussion?: Maybe<String_Comparison_Exp>;
  is_available_strings?: Maybe<String_Comparison_Exp>;
  is_available_woodwind?: Maybe<String_Comparison_Exp>;
  is_equipped_music_stand?: Maybe<String_Comparison_Exp>;
  is_equipped_piano?: Maybe<String_Comparison_Exp>;
  layout_image_url?: Maybe<String_Comparison_Exp>;
  lottery_period?: Maybe<String_Comparison_Exp>;
  note?: Maybe<String_Comparison_Exp>;
  reservation_division?: Maybe<_Text_Comparison_Exp>;
  website_url?: Maybe<String_Comparison_Exp>;
  weekday_usage_fee?: Maybe<Jsonb_Comparison_Exp>;
};

/** aggregate max on columns */
export type Institution_Max_Fields = {
  __typename?: 'institution_max_fields';
  address?: Maybe<Scalars['String']>;
  area?: Maybe<Scalars['String']>;
  building?: Maybe<Scalars['String']>;
  capacity?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamp']>;
  id?: Maybe<Scalars['uuid']>;
  institution?: Maybe<Scalars['String']>;
  is_available_brass?: Maybe<Scalars['String']>;
  is_available_percussion?: Maybe<Scalars['String']>;
  is_available_strings?: Maybe<Scalars['String']>;
  is_available_woodwind?: Maybe<Scalars['String']>;
  is_equipped_music_stand?: Maybe<Scalars['String']>;
  is_equipped_piano?: Maybe<Scalars['String']>;
  layout_image_url?: Maybe<Scalars['String']>;
  lottery_period?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  website_url?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "institution" */
export type Institution_Max_Order_By = {
  address?: Maybe<Order_By>;
  area?: Maybe<Order_By>;
  building?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  is_available_brass?: Maybe<Order_By>;
  is_available_percussion?: Maybe<Order_By>;
  is_available_strings?: Maybe<Order_By>;
  is_available_woodwind?: Maybe<Order_By>;
  is_equipped_music_stand?: Maybe<Order_By>;
  is_equipped_piano?: Maybe<Order_By>;
  layout_image_url?: Maybe<Order_By>;
  lottery_period?: Maybe<Order_By>;
  note?: Maybe<Order_By>;
  website_url?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Institution_Min_Fields = {
  __typename?: 'institution_min_fields';
  address?: Maybe<Scalars['String']>;
  area?: Maybe<Scalars['String']>;
  building?: Maybe<Scalars['String']>;
  capacity?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamp']>;
  id?: Maybe<Scalars['uuid']>;
  institution?: Maybe<Scalars['String']>;
  is_available_brass?: Maybe<Scalars['String']>;
  is_available_percussion?: Maybe<Scalars['String']>;
  is_available_strings?: Maybe<Scalars['String']>;
  is_available_woodwind?: Maybe<Scalars['String']>;
  is_equipped_music_stand?: Maybe<Scalars['String']>;
  is_equipped_piano?: Maybe<Scalars['String']>;
  layout_image_url?: Maybe<Scalars['String']>;
  lottery_period?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  website_url?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "institution" */
export type Institution_Min_Order_By = {
  address?: Maybe<Order_By>;
  area?: Maybe<Order_By>;
  building?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  is_available_brass?: Maybe<Order_By>;
  is_available_percussion?: Maybe<Order_By>;
  is_available_strings?: Maybe<Order_By>;
  is_available_woodwind?: Maybe<Order_By>;
  is_equipped_music_stand?: Maybe<Order_By>;
  is_equipped_piano?: Maybe<Order_By>;
  layout_image_url?: Maybe<Order_By>;
  lottery_period?: Maybe<Order_By>;
  note?: Maybe<Order_By>;
  website_url?: Maybe<Order_By>;
};

/** ordering options when selecting data from "institution" */
export type Institution_Order_By = {
  address?: Maybe<Order_By>;
  area?: Maybe<Order_By>;
  building?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  holiday_usage_fee?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  is_available_brass?: Maybe<Order_By>;
  is_available_percussion?: Maybe<Order_By>;
  is_available_strings?: Maybe<Order_By>;
  is_available_woodwind?: Maybe<Order_By>;
  is_equipped_music_stand?: Maybe<Order_By>;
  is_equipped_piano?: Maybe<Order_By>;
  layout_image_url?: Maybe<Order_By>;
  lottery_period?: Maybe<Order_By>;
  note?: Maybe<Order_By>;
  reservation_division?: Maybe<Order_By>;
  website_url?: Maybe<Order_By>;
  weekday_usage_fee?: Maybe<Order_By>;
};

/** primary key columns input for table: "institution" */
export type Institution_Pk_Columns_Input = {
  id: Scalars['uuid'];
};

/** select columns of table "institution" */
export enum Institution_Select_Column {
  /** column name */
  Address = 'address',
  /** column name */
  Area = 'area',
  /** column name */
  Building = 'building',
  /** column name */
  Capacity = 'capacity',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  HolidayUsageFee = 'holiday_usage_fee',
  /** column name */
  Id = 'id',
  /** column name */
  Institution = 'institution',
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
  Note = 'note',
  /** column name */
  ReservationDivision = 'reservation_division',
  /** column name */
  WebsiteUrl = 'website_url',
  /** column name */
  WeekdayUsageFee = 'weekday_usage_fee'
}


/** expression to compare columns of type jsonb. All fields are combined with logical 'AND'. */
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

/** column ordering options */
export enum Order_By {
  /** in the ascending order, nulls last */
  Asc = 'asc',
  /** in the ascending order, nulls first */
  AscNullsFirst = 'asc_nulls_first',
  /** in the ascending order, nulls last */
  AscNullsLast = 'asc_nulls_last',
  /** in the descending order, nulls first */
  Desc = 'desc',
  /** in the descending order, nulls first */
  DescNullsFirst = 'desc_nulls_first',
  /** in the descending order, nulls last */
  DescNullsLast = 'desc_nulls_last'
}

/** query root */
export type Query_Root = {
  __typename?: 'query_root';
  /** fetch data from the table: "institution" */
  institution: Array<Institution>;
  /** fetch aggregated fields from the table: "institution" */
  institution_aggregate: Institution_Aggregate;
  /** fetch data from the table: "institution" using primary key columns */
  institution_by_pk?: Maybe<Institution>;
  /** fetch data from the table: "reservation" */
  reservation: Array<Reservation>;
  /** fetch aggregated fields from the table: "reservation" */
  reservation_aggregate: Reservation_Aggregate;
  /** fetch data from the table: "reservation" using primary key columns */
  reservation_by_pk?: Maybe<Reservation>;
};


/** query root */
export type Query_RootInstitutionArgs = {
  distinct_on?: Maybe<Array<Institution_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Institution_Order_By>>;
  where?: Maybe<Institution_Bool_Exp>;
};


/** query root */
export type Query_RootInstitution_AggregateArgs = {
  distinct_on?: Maybe<Array<Institution_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Institution_Order_By>>;
  where?: Maybe<Institution_Bool_Exp>;
};


/** query root */
export type Query_RootInstitution_By_PkArgs = {
  id: Scalars['uuid'];
};


/** query root */
export type Query_RootReservationArgs = {
  distinct_on?: Maybe<Array<Reservation_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Reservation_Order_By>>;
  where?: Maybe<Reservation_Bool_Exp>;
};


/** query root */
export type Query_RootReservation_AggregateArgs = {
  distinct_on?: Maybe<Array<Reservation_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Reservation_Order_By>>;
  where?: Maybe<Reservation_Bool_Exp>;
};


/** query root */
export type Query_RootReservation_By_PkArgs = {
  id: Scalars['Int'];
};

/** columns and relationships of "reservation" */
export type Reservation = {
  __typename?: 'reservation';
  building: Scalars['String'];
  created_at: Scalars['timestamptz'];
  date: Scalars['date'];
  day_of_week: Scalars['String'];
  id: Scalars['Int'];
  institution: Scalars['String'];
  institution_id: Scalars['uuid'];
  reservation: Scalars['jsonb'];
};


/** columns and relationships of "reservation" */
export type ReservationReservationArgs = {
  path?: Maybe<Scalars['String']>;
};

/** aggregated selection of "reservation" */
export type Reservation_Aggregate = {
  __typename?: 'reservation_aggregate';
  aggregate?: Maybe<Reservation_Aggregate_Fields>;
  nodes: Array<Reservation>;
};

/** aggregate fields of "reservation" */
export type Reservation_Aggregate_Fields = {
  __typename?: 'reservation_aggregate_fields';
  avg?: Maybe<Reservation_Avg_Fields>;
  count?: Maybe<Scalars['Int']>;
  max?: Maybe<Reservation_Max_Fields>;
  min?: Maybe<Reservation_Min_Fields>;
  stddev?: Maybe<Reservation_Stddev_Fields>;
  stddev_pop?: Maybe<Reservation_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Reservation_Stddev_Samp_Fields>;
  sum?: Maybe<Reservation_Sum_Fields>;
  var_pop?: Maybe<Reservation_Var_Pop_Fields>;
  var_samp?: Maybe<Reservation_Var_Samp_Fields>;
  variance?: Maybe<Reservation_Variance_Fields>;
};


/** aggregate fields of "reservation" */
export type Reservation_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Reservation_Select_Column>>;
  distinct?: Maybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "reservation" */
export type Reservation_Aggregate_Order_By = {
  avg?: Maybe<Reservation_Avg_Order_By>;
  count?: Maybe<Order_By>;
  max?: Maybe<Reservation_Max_Order_By>;
  min?: Maybe<Reservation_Min_Order_By>;
  stddev?: Maybe<Reservation_Stddev_Order_By>;
  stddev_pop?: Maybe<Reservation_Stddev_Pop_Order_By>;
  stddev_samp?: Maybe<Reservation_Stddev_Samp_Order_By>;
  sum?: Maybe<Reservation_Sum_Order_By>;
  var_pop?: Maybe<Reservation_Var_Pop_Order_By>;
  var_samp?: Maybe<Reservation_Var_Samp_Order_By>;
  variance?: Maybe<Reservation_Variance_Order_By>;
};

/** aggregate avg on columns */
export type Reservation_Avg_Fields = {
  __typename?: 'reservation_avg_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "reservation" */
export type Reservation_Avg_Order_By = {
  id?: Maybe<Order_By>;
};

/** Boolean expression to filter rows from the table "reservation". All fields are combined with a logical 'AND'. */
export type Reservation_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Reservation_Bool_Exp>>>;
  _not?: Maybe<Reservation_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Reservation_Bool_Exp>>>;
  building?: Maybe<String_Comparison_Exp>;
  created_at?: Maybe<Timestamptz_Comparison_Exp>;
  date?: Maybe<Date_Comparison_Exp>;
  day_of_week?: Maybe<String_Comparison_Exp>;
  id?: Maybe<Int_Comparison_Exp>;
  institution?: Maybe<String_Comparison_Exp>;
  institution_id?: Maybe<Uuid_Comparison_Exp>;
  reservation?: Maybe<Jsonb_Comparison_Exp>;
};

/** aggregate max on columns */
export type Reservation_Max_Fields = {
  __typename?: 'reservation_max_fields';
  building?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamptz']>;
  date?: Maybe<Scalars['date']>;
  day_of_week?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
  institution?: Maybe<Scalars['String']>;
  institution_id?: Maybe<Scalars['uuid']>;
};

/** order by max() on columns of table "reservation" */
export type Reservation_Max_Order_By = {
  building?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  date?: Maybe<Order_By>;
  day_of_week?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  institution_id?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Reservation_Min_Fields = {
  __typename?: 'reservation_min_fields';
  building?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamptz']>;
  date?: Maybe<Scalars['date']>;
  day_of_week?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
  institution?: Maybe<Scalars['String']>;
  institution_id?: Maybe<Scalars['uuid']>;
};

/** order by min() on columns of table "reservation" */
export type Reservation_Min_Order_By = {
  building?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  date?: Maybe<Order_By>;
  day_of_week?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  institution_id?: Maybe<Order_By>;
};

/** ordering options when selecting data from "reservation" */
export type Reservation_Order_By = {
  building?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  date?: Maybe<Order_By>;
  day_of_week?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  institution_id?: Maybe<Order_By>;
  reservation?: Maybe<Order_By>;
};

/** primary key columns input for table: "reservation" */
export type Reservation_Pk_Columns_Input = {
  id: Scalars['Int'];
};

/** select columns of table "reservation" */
export enum Reservation_Select_Column {
  /** column name */
  Building = 'building',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Date = 'date',
  /** column name */
  DayOfWeek = 'day_of_week',
  /** column name */
  Id = 'id',
  /** column name */
  Institution = 'institution',
  /** column name */
  InstitutionId = 'institution_id',
  /** column name */
  Reservation = 'reservation'
}

/** aggregate stddev on columns */
export type Reservation_Stddev_Fields = {
  __typename?: 'reservation_stddev_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "reservation" */
export type Reservation_Stddev_Order_By = {
  id?: Maybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Reservation_Stddev_Pop_Fields = {
  __typename?: 'reservation_stddev_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "reservation" */
export type Reservation_Stddev_Pop_Order_By = {
  id?: Maybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Reservation_Stddev_Samp_Fields = {
  __typename?: 'reservation_stddev_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "reservation" */
export type Reservation_Stddev_Samp_Order_By = {
  id?: Maybe<Order_By>;
};

/** aggregate sum on columns */
export type Reservation_Sum_Fields = {
  __typename?: 'reservation_sum_fields';
  id?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "reservation" */
export type Reservation_Sum_Order_By = {
  id?: Maybe<Order_By>;
};

/** aggregate var_pop on columns */
export type Reservation_Var_Pop_Fields = {
  __typename?: 'reservation_var_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "reservation" */
export type Reservation_Var_Pop_Order_By = {
  id?: Maybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Reservation_Var_Samp_Fields = {
  __typename?: 'reservation_var_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "reservation" */
export type Reservation_Var_Samp_Order_By = {
  id?: Maybe<Order_By>;
};

/** aggregate variance on columns */
export type Reservation_Variance_Fields = {
  __typename?: 'reservation_variance_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "reservation" */
export type Reservation_Variance_Order_By = {
  id?: Maybe<Order_By>;
};

/** subscription root */
export type Subscription_Root = {
  __typename?: 'subscription_root';
  /** fetch data from the table: "institution" */
  institution: Array<Institution>;
  /** fetch aggregated fields from the table: "institution" */
  institution_aggregate: Institution_Aggregate;
  /** fetch data from the table: "institution" using primary key columns */
  institution_by_pk?: Maybe<Institution>;
  /** fetch data from the table: "reservation" */
  reservation: Array<Reservation>;
  /** fetch aggregated fields from the table: "reservation" */
  reservation_aggregate: Reservation_Aggregate;
  /** fetch data from the table: "reservation" using primary key columns */
  reservation_by_pk?: Maybe<Reservation>;
};


/** subscription root */
export type Subscription_RootInstitutionArgs = {
  distinct_on?: Maybe<Array<Institution_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Institution_Order_By>>;
  where?: Maybe<Institution_Bool_Exp>;
};


/** subscription root */
export type Subscription_RootInstitution_AggregateArgs = {
  distinct_on?: Maybe<Array<Institution_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Institution_Order_By>>;
  where?: Maybe<Institution_Bool_Exp>;
};


/** subscription root */
export type Subscription_RootInstitution_By_PkArgs = {
  id: Scalars['uuid'];
};


/** subscription root */
export type Subscription_RootReservationArgs = {
  distinct_on?: Maybe<Array<Reservation_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Reservation_Order_By>>;
  where?: Maybe<Reservation_Bool_Exp>;
};


/** subscription root */
export type Subscription_RootReservation_AggregateArgs = {
  distinct_on?: Maybe<Array<Reservation_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Reservation_Order_By>>;
  where?: Maybe<Reservation_Bool_Exp>;
};


/** subscription root */
export type Subscription_RootReservation_By_PkArgs = {
  id: Scalars['Int'];
};


/** expression to compare columns of type timestamp. All fields are combined with logical 'AND'. */
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


/** expression to compare columns of type timestamptz. All fields are combined with logical 'AND'. */
export type Timestamptz_Comparison_Exp = {
  _eq?: Maybe<Scalars['timestamptz']>;
  _gt?: Maybe<Scalars['timestamptz']>;
  _gte?: Maybe<Scalars['timestamptz']>;
  _in?: Maybe<Array<Scalars['timestamptz']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['timestamptz']>;
  _lte?: Maybe<Scalars['timestamptz']>;
  _neq?: Maybe<Scalars['timestamptz']>;
  _nin?: Maybe<Array<Scalars['timestamptz']>>;
};


/** expression to compare columns of type uuid. All fields are combined with logical 'AND'. */
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

export type InstitutionDetailQueryVariables = Exact<{
  id: Scalars['uuid'];
}>;


export type InstitutionDetailQuery = (
  { __typename?: 'query_root' }
  & { institution_by_pk?: Maybe<(
    { __typename?: 'institution' }
    & Pick<Institution, 'building' | 'institution' | 'capacity' | 'area' | 'reservation_division' | 'weekday_usage_fee' | 'holiday_usage_fee' | 'address' | 'is_available_strings' | 'is_available_woodwind' | 'is_available_brass' | 'is_available_percussion' | 'is_equipped_music_stand' | 'is_equipped_piano' | 'website_url' | 'layout_image_url' | 'lottery_period' | 'note'>
  )>, reservation: Array<(
    { __typename?: 'reservation' }
    & Pick<Reservation, 'date' | 'reservation'>
  )> }
);

export type InstitutionQueryVariables = Exact<{
  offset?: Maybe<Scalars['Int']>;
  limit?: Maybe<Scalars['Int']>;
}>;


export type InstitutionQuery = (
  { __typename?: 'query_root' }
  & { institution: Array<(
    { __typename?: 'institution' }
    & Pick<Institution, 'id' | 'building' | 'institution' | 'capacity' | 'area' | 'reservation_division' | 'weekday_usage_fee' | 'holiday_usage_fee' | 'address' | 'is_available_strings' | 'is_available_woodwind' | 'is_available_brass' | 'is_available_percussion' | 'is_equipped_music_stand' | 'is_equipped_piano' | 'website_url' | 'layout_image_url' | 'lottery_period' | 'note'>
  )>, institution_aggregate: (
    { __typename?: 'institution_aggregate' }
    & { aggregate?: Maybe<(
      { __typename?: 'institution_aggregate_fields' }
      & Pick<Institution_Aggregate_Fields, 'count'>
    )> }
  ) }
);

export type ReservationQueryVariables = Exact<{
  offset?: Maybe<Scalars['Int']>;
  limit?: Maybe<Scalars['Int']>;
  startDate?: Maybe<Scalars['date']>;
  endDate?: Maybe<Scalars['date']>;
  daysOfWeek?: Maybe<Array<Scalars['String']>>;
  reservationStatus1?: Maybe<Scalars['jsonb']>;
  reservationStatus2?: Maybe<Scalars['jsonb']>;
}>;


export type ReservationQuery = (
  { __typename?: 'query_root' }
  & { reservation: Array<(
    { __typename?: 'reservation' }
    & Pick<Reservation, 'id' | 'institution_id' | 'building' | 'institution' | 'date' | 'reservation'>
  )>, reservation_aggregate: (
    { __typename?: 'reservation_aggregate' }
    & { aggregate?: Maybe<(
      { __typename?: 'reservation_aggregate_fields' }
      & Pick<Reservation_Aggregate_Fields, 'count'>
    )> }
  ) }
);


export const InstitutionDetailDocument = gql`
    query institutionDetail($id: uuid!) {
  institution_by_pk(id: $id) {
    building
    institution
    capacity
    area
    reservation_division
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
  reservation(where: {institution_id: {_eq: $id}}) {
    date
    reservation
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
export function useInstitutionDetailQuery(baseOptions: Apollo.QueryHookOptions<InstitutionDetailQuery, InstitutionDetailQueryVariables>) {
        return Apollo.useQuery<InstitutionDetailQuery, InstitutionDetailQueryVariables>(InstitutionDetailDocument, baseOptions);
      }
export function useInstitutionDetailLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstitutionDetailQuery, InstitutionDetailQueryVariables>) {
          return Apollo.useLazyQuery<InstitutionDetailQuery, InstitutionDetailQueryVariables>(InstitutionDetailDocument, baseOptions);
        }
export type InstitutionDetailQueryHookResult = ReturnType<typeof useInstitutionDetailQuery>;
export type InstitutionDetailLazyQueryHookResult = ReturnType<typeof useInstitutionDetailLazyQuery>;
export type InstitutionDetailQueryResult = Apollo.QueryResult<InstitutionDetailQuery, InstitutionDetailQueryVariables>;
export const InstitutionDocument = gql`
    query institution($offset: Int, $limit: Int) {
  institution(offset: $offset, limit: $limit) {
    id
    building
    institution
    capacity
    area
    reservation_division
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
  institution_aggregate {
    aggregate {
      count
    }
  }
}
    `;

/**
 * __useInstitutionQuery__
 *
 * To run a query within a React component, call `useInstitutionQuery` and pass it any options that fit your needs.
 * When your component renders, `useInstitutionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInstitutionQuery({
 *   variables: {
 *      offset: // value for 'offset'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useInstitutionQuery(baseOptions?: Apollo.QueryHookOptions<InstitutionQuery, InstitutionQueryVariables>) {
        return Apollo.useQuery<InstitutionQuery, InstitutionQueryVariables>(InstitutionDocument, baseOptions);
      }
export function useInstitutionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstitutionQuery, InstitutionQueryVariables>) {
          return Apollo.useLazyQuery<InstitutionQuery, InstitutionQueryVariables>(InstitutionDocument, baseOptions);
        }
export type InstitutionQueryHookResult = ReturnType<typeof useInstitutionQuery>;
export type InstitutionLazyQueryHookResult = ReturnType<typeof useInstitutionLazyQuery>;
export type InstitutionQueryResult = Apollo.QueryResult<InstitutionQuery, InstitutionQueryVariables>;
export const ReservationDocument = gql`
    query reservation($offset: Int, $limit: Int, $startDate: date, $endDate: date, $daysOfWeek: [String!] = null, $reservationStatus1: jsonb = null, $reservationStatus2: jsonb = null) {
  reservation(
    offset: $offset
    limit: $limit
    where: {_or: [{date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $daysOfWeek}, reservation: {_contains: $reservationStatus1}}, {date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $daysOfWeek}, reservation: {_contains: $reservationStatus2}}]}
  ) {
    id
    institution_id
    building
    institution
    date
    reservation
  }
  reservation_aggregate(
    where: {_or: [{date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $daysOfWeek}, reservation: {_contains: $reservationStatus1}}, {date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $daysOfWeek}, reservation: {_contains: $reservationStatus2}}]}
  ) {
    aggregate {
      count
    }
  }
}
    `;

/**
 * __useReservationQuery__
 *
 * To run a query within a React component, call `useReservationQuery` and pass it any options that fit your needs.
 * When your component renders, `useReservationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReservationQuery({
 *   variables: {
 *      offset: // value for 'offset'
 *      limit: // value for 'limit'
 *      startDate: // value for 'startDate'
 *      endDate: // value for 'endDate'
 *      daysOfWeek: // value for 'daysOfWeek'
 *      reservationStatus1: // value for 'reservationStatus1'
 *      reservationStatus2: // value for 'reservationStatus2'
 *   },
 * });
 */
export function useReservationQuery(baseOptions?: Apollo.QueryHookOptions<ReservationQuery, ReservationQueryVariables>) {
        return Apollo.useQuery<ReservationQuery, ReservationQueryVariables>(ReservationDocument, baseOptions);
      }
export function useReservationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReservationQuery, ReservationQueryVariables>) {
          return Apollo.useLazyQuery<ReservationQuery, ReservationQueryVariables>(ReservationDocument, baseOptions);
        }
export type ReservationQueryHookResult = ReturnType<typeof useReservationQuery>;
export type ReservationLazyQueryHookResult = ReturnType<typeof useReservationLazyQuery>;
export type ReservationQueryResult = Apollo.QueryResult<ReservationQuery, ReservationQueryVariables>;