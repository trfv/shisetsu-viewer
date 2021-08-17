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
  date: any;
  day_of_week: any;
  equipment_division: any;
  jsonb: any;
  timestamp: any;
  tokyo_ward: any;
  uuid: any;
};

/** expression to compare columns of type Float. All fields are combined with logical 'AND'. */
export type Float_Comparison_Exp = {
  _eq?: Maybe<Scalars['Float']>;
  _gt?: Maybe<Scalars['Float']>;
  _gte?: Maybe<Scalars['Float']>;
  _in?: Maybe<Array<Scalars['Float']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['Float']>;
  _lte?: Maybe<Scalars['Float']>;
  _neq?: Maybe<Scalars['Float']>;
  _nin?: Maybe<Array<Scalars['Float']>>;
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


/** expression to compare columns of type _fee_division. All fields are combined with logical 'AND'. */
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


/** expression to compare columns of type availavility_division. All fields are combined with logical 'AND'. */
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


/** expression to compare columns of type day_of_week. All fields are combined with logical 'AND'. */
export type Day_Of_Week_Comparison_Exp = {
  _eq?: Maybe<Scalars['day_of_week']>;
  _gt?: Maybe<Scalars['day_of_week']>;
  _gte?: Maybe<Scalars['day_of_week']>;
  _in?: Maybe<Array<Scalars['day_of_week']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['day_of_week']>;
  _lte?: Maybe<Scalars['day_of_week']>;
  _neq?: Maybe<Scalars['day_of_week']>;
  _nin?: Maybe<Array<Scalars['day_of_week']>>;
};


/** expression to compare columns of type equipment_division. All fields are combined with logical 'AND'. */
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

/** columns and relationships of "institution" */
export type Institution = {
  __typename?: 'institution';
  address: Scalars['String'];
  area?: Maybe<Scalars['Float']>;
  building: Scalars['String'];
  building_system_name?: Maybe<Scalars['String']>;
  capacity?: Maybe<Scalars['Int']>;
  created_at: Scalars['timestamp'];
  fee_division: Scalars['_fee_division'];
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
  note: Scalars['String'];
  tokyo_ward: Scalars['tokyo_ward'];
  updated_at: Scalars['timestamp'];
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
  avg?: Maybe<Institution_Avg_Fields>;
  count?: Maybe<Scalars['Int']>;
  max?: Maybe<Institution_Max_Fields>;
  min?: Maybe<Institution_Min_Fields>;
  stddev?: Maybe<Institution_Stddev_Fields>;
  stddev_pop?: Maybe<Institution_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Institution_Stddev_Samp_Fields>;
  sum?: Maybe<Institution_Sum_Fields>;
  var_pop?: Maybe<Institution_Var_Pop_Fields>;
  var_samp?: Maybe<Institution_Var_Samp_Fields>;
  variance?: Maybe<Institution_Variance_Fields>;
};


/** aggregate fields of "institution" */
export type Institution_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Institution_Select_Column>>;
  distinct?: Maybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "institution" */
export type Institution_Aggregate_Order_By = {
  avg?: Maybe<Institution_Avg_Order_By>;
  count?: Maybe<Order_By>;
  max?: Maybe<Institution_Max_Order_By>;
  min?: Maybe<Institution_Min_Order_By>;
  stddev?: Maybe<Institution_Stddev_Order_By>;
  stddev_pop?: Maybe<Institution_Stddev_Pop_Order_By>;
  stddev_samp?: Maybe<Institution_Stddev_Samp_Order_By>;
  sum?: Maybe<Institution_Sum_Order_By>;
  var_pop?: Maybe<Institution_Var_Pop_Order_By>;
  var_samp?: Maybe<Institution_Var_Samp_Order_By>;
  variance?: Maybe<Institution_Variance_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Institution_Append_Input = {
  holiday_usage_fee?: Maybe<Scalars['jsonb']>;
  weekday_usage_fee?: Maybe<Scalars['jsonb']>;
};

/** input type for inserting array relation for remote table "institution" */
export type Institution_Arr_Rel_Insert_Input = {
  data: Array<Institution_Insert_Input>;
  on_conflict?: Maybe<Institution_On_Conflict>;
};

/** aggregate avg on columns */
export type Institution_Avg_Fields = {
  __typename?: 'institution_avg_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "institution" */
export type Institution_Avg_Order_By = {
  area?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
};

/** Boolean expression to filter rows from the table "institution". All fields are combined with a logical 'AND'. */
export type Institution_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Institution_Bool_Exp>>>;
  _not?: Maybe<Institution_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Institution_Bool_Exp>>>;
  address?: Maybe<String_Comparison_Exp>;
  area?: Maybe<Float_Comparison_Exp>;
  building?: Maybe<String_Comparison_Exp>;
  building_system_name?: Maybe<String_Comparison_Exp>;
  capacity?: Maybe<Int_Comparison_Exp>;
  created_at?: Maybe<Timestamp_Comparison_Exp>;
  fee_division?: Maybe<_Fee_Division_Comparison_Exp>;
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
  note?: Maybe<String_Comparison_Exp>;
  tokyo_ward?: Maybe<Tokyo_Ward_Comparison_Exp>;
  updated_at?: Maybe<Timestamp_Comparison_Exp>;
  website_url?: Maybe<String_Comparison_Exp>;
  weekday_usage_fee?: Maybe<Jsonb_Comparison_Exp>;
};

/** unique or primary key constraints on table "institution" */
export enum Institution_Constraint {
  /** unique or primary key constraint */
  InstitutionPkey = 'institution_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Institution_Delete_At_Path_Input = {
  holiday_usage_fee?: Maybe<Array<Maybe<Scalars['String']>>>;
  weekday_usage_fee?: Maybe<Array<Maybe<Scalars['String']>>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Institution_Delete_Elem_Input = {
  holiday_usage_fee?: Maybe<Scalars['Int']>;
  weekday_usage_fee?: Maybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Institution_Delete_Key_Input = {
  holiday_usage_fee?: Maybe<Scalars['String']>;
  weekday_usage_fee?: Maybe<Scalars['String']>;
};

/** input type for incrementing integer column in table "institution" */
export type Institution_Inc_Input = {
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Int']>;
};

/** input type for inserting data into table "institution" */
export type Institution_Insert_Input = {
  address?: Maybe<Scalars['String']>;
  area?: Maybe<Scalars['Float']>;
  building?: Maybe<Scalars['String']>;
  building_system_name?: Maybe<Scalars['String']>;
  capacity?: Maybe<Scalars['Int']>;
  created_at?: Maybe<Scalars['timestamp']>;
  fee_division?: Maybe<Scalars['_fee_division']>;
  holiday_usage_fee?: Maybe<Scalars['jsonb']>;
  id?: Maybe<Scalars['uuid']>;
  institution?: Maybe<Scalars['String']>;
  institution_system_name?: Maybe<Scalars['String']>;
  is_available_brass?: Maybe<Scalars['availavility_division']>;
  is_available_percussion?: Maybe<Scalars['availavility_division']>;
  is_available_strings?: Maybe<Scalars['availavility_division']>;
  is_available_woodwind?: Maybe<Scalars['availavility_division']>;
  is_equipped_music_stand?: Maybe<Scalars['equipment_division']>;
  is_equipped_piano?: Maybe<Scalars['equipment_division']>;
  layout_image_url?: Maybe<Scalars['String']>;
  lottery_period?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  tokyo_ward?: Maybe<Scalars['tokyo_ward']>;
  updated_at?: Maybe<Scalars['timestamp']>;
  website_url?: Maybe<Scalars['String']>;
  weekday_usage_fee?: Maybe<Scalars['jsonb']>;
};

/** aggregate max on columns */
export type Institution_Max_Fields = {
  __typename?: 'institution_max_fields';
  address?: Maybe<Scalars['String']>;
  area?: Maybe<Scalars['Float']>;
  building?: Maybe<Scalars['String']>;
  building_system_name?: Maybe<Scalars['String']>;
  capacity?: Maybe<Scalars['Int']>;
  created_at?: Maybe<Scalars['timestamp']>;
  id?: Maybe<Scalars['uuid']>;
  institution?: Maybe<Scalars['String']>;
  institution_system_name?: Maybe<Scalars['String']>;
  layout_image_url?: Maybe<Scalars['String']>;
  lottery_period?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
  website_url?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "institution" */
export type Institution_Max_Order_By = {
  address?: Maybe<Order_By>;
  area?: Maybe<Order_By>;
  building?: Maybe<Order_By>;
  building_system_name?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  institution_system_name?: Maybe<Order_By>;
  layout_image_url?: Maybe<Order_By>;
  lottery_period?: Maybe<Order_By>;
  note?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
  website_url?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Institution_Min_Fields = {
  __typename?: 'institution_min_fields';
  address?: Maybe<Scalars['String']>;
  area?: Maybe<Scalars['Float']>;
  building?: Maybe<Scalars['String']>;
  building_system_name?: Maybe<Scalars['String']>;
  capacity?: Maybe<Scalars['Int']>;
  created_at?: Maybe<Scalars['timestamp']>;
  id?: Maybe<Scalars['uuid']>;
  institution?: Maybe<Scalars['String']>;
  institution_system_name?: Maybe<Scalars['String']>;
  layout_image_url?: Maybe<Scalars['String']>;
  lottery_period?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
  website_url?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "institution" */
export type Institution_Min_Order_By = {
  address?: Maybe<Order_By>;
  area?: Maybe<Order_By>;
  building?: Maybe<Order_By>;
  building_system_name?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  institution_system_name?: Maybe<Order_By>;
  layout_image_url?: Maybe<Order_By>;
  lottery_period?: Maybe<Order_By>;
  note?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
  website_url?: Maybe<Order_By>;
};

/** response of any mutation on the table "institution" */
export type Institution_Mutation_Response = {
  __typename?: 'institution_mutation_response';
  /** number of affected rows by the mutation */
  affected_rows: Scalars['Int'];
  /** data of the affected rows by the mutation */
  returning: Array<Institution>;
};

/** input type for inserting object relation for remote table "institution" */
export type Institution_Obj_Rel_Insert_Input = {
  data: Institution_Insert_Input;
  on_conflict?: Maybe<Institution_On_Conflict>;
};

/** on conflict condition type for table "institution" */
export type Institution_On_Conflict = {
  constraint: Institution_Constraint;
  update_columns: Array<Institution_Update_Column>;
  where?: Maybe<Institution_Bool_Exp>;
};

/** ordering options when selecting data from "institution" */
export type Institution_Order_By = {
  address?: Maybe<Order_By>;
  area?: Maybe<Order_By>;
  building?: Maybe<Order_By>;
  building_system_name?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  fee_division?: Maybe<Order_By>;
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
  note?: Maybe<Order_By>;
  tokyo_ward?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
  website_url?: Maybe<Order_By>;
  weekday_usage_fee?: Maybe<Order_By>;
};

/** primary key columns input for table: "institution" */
export type Institution_Pk_Columns_Input = {
  id: Scalars['uuid'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Institution_Prepend_Input = {
  holiday_usage_fee?: Maybe<Scalars['jsonb']>;
  weekday_usage_fee?: Maybe<Scalars['jsonb']>;
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
  BuildingSystemName = 'building_system_name',
  /** column name */
  Capacity = 'capacity',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  FeeDivision = 'fee_division',
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
  Note = 'note',
  /** column name */
  TokyoWard = 'tokyo_ward',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  WebsiteUrl = 'website_url',
  /** column name */
  WeekdayUsageFee = 'weekday_usage_fee'
}

/** input type for updating data in table "institution" */
export type Institution_Set_Input = {
  address?: Maybe<Scalars['String']>;
  area?: Maybe<Scalars['Float']>;
  building?: Maybe<Scalars['String']>;
  building_system_name?: Maybe<Scalars['String']>;
  capacity?: Maybe<Scalars['Int']>;
  created_at?: Maybe<Scalars['timestamp']>;
  fee_division?: Maybe<Scalars['_fee_division']>;
  holiday_usage_fee?: Maybe<Scalars['jsonb']>;
  id?: Maybe<Scalars['uuid']>;
  institution?: Maybe<Scalars['String']>;
  institution_system_name?: Maybe<Scalars['String']>;
  is_available_brass?: Maybe<Scalars['availavility_division']>;
  is_available_percussion?: Maybe<Scalars['availavility_division']>;
  is_available_strings?: Maybe<Scalars['availavility_division']>;
  is_available_woodwind?: Maybe<Scalars['availavility_division']>;
  is_equipped_music_stand?: Maybe<Scalars['equipment_division']>;
  is_equipped_piano?: Maybe<Scalars['equipment_division']>;
  layout_image_url?: Maybe<Scalars['String']>;
  lottery_period?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  tokyo_ward?: Maybe<Scalars['tokyo_ward']>;
  updated_at?: Maybe<Scalars['timestamp']>;
  website_url?: Maybe<Scalars['String']>;
  weekday_usage_fee?: Maybe<Scalars['jsonb']>;
};

/** aggregate stddev on columns */
export type Institution_Stddev_Fields = {
  __typename?: 'institution_stddev_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "institution" */
export type Institution_Stddev_Order_By = {
  area?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Institution_Stddev_Pop_Fields = {
  __typename?: 'institution_stddev_pop_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "institution" */
export type Institution_Stddev_Pop_Order_By = {
  area?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Institution_Stddev_Samp_Fields = {
  __typename?: 'institution_stddev_samp_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "institution" */
export type Institution_Stddev_Samp_Order_By = {
  area?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
};

/** aggregate sum on columns */
export type Institution_Sum_Fields = {
  __typename?: 'institution_sum_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "institution" */
export type Institution_Sum_Order_By = {
  area?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
};

/** update columns of table "institution" */
export enum Institution_Update_Column {
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
  FeeDivision = 'fee_division',
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
  Note = 'note',
  /** column name */
  TokyoWard = 'tokyo_ward',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  WebsiteUrl = 'website_url',
  /** column name */
  WeekdayUsageFee = 'weekday_usage_fee'
}

/** aggregate var_pop on columns */
export type Institution_Var_Pop_Fields = {
  __typename?: 'institution_var_pop_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "institution" */
export type Institution_Var_Pop_Order_By = {
  area?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Institution_Var_Samp_Fields = {
  __typename?: 'institution_var_samp_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "institution" */
export type Institution_Var_Samp_Order_By = {
  area?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
};

/** aggregate variance on columns */
export type Institution_Variance_Fields = {
  __typename?: 'institution_variance_fields';
  area?: Maybe<Scalars['Float']>;
  capacity?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "institution" */
export type Institution_Variance_Order_By = {
  area?: Maybe<Order_By>;
  capacity?: Maybe<Order_By>;
};


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

/** mutation root */
export type Mutation_Root = {
  __typename?: 'mutation_root';
  /** delete data from the table: "institution" */
  delete_institution?: Maybe<Institution_Mutation_Response>;
  /** delete single row from the table: "institution" */
  delete_institution_by_pk?: Maybe<Institution>;
  /** delete data from the table: "reservation" */
  delete_reservation?: Maybe<Reservation_Mutation_Response>;
  /** delete single row from the table: "reservation" */
  delete_reservation_by_pk?: Maybe<Reservation>;
  /** delete data from the table: "users" */
  delete_users?: Maybe<Users_Mutation_Response>;
  /** delete single row from the table: "users" */
  delete_users_by_pk?: Maybe<Users>;
  /** insert data into the table: "institution" */
  insert_institution?: Maybe<Institution_Mutation_Response>;
  /** insert a single row into the table: "institution" */
  insert_institution_one?: Maybe<Institution>;
  /** insert data into the table: "reservation" */
  insert_reservation?: Maybe<Reservation_Mutation_Response>;
  /** insert a single row into the table: "reservation" */
  insert_reservation_one?: Maybe<Reservation>;
  /** insert data into the table: "users" */
  insert_users?: Maybe<Users_Mutation_Response>;
  /** insert a single row into the table: "users" */
  insert_users_one?: Maybe<Users>;
  /** update data of the table: "institution" */
  update_institution?: Maybe<Institution_Mutation_Response>;
  /** update single row of the table: "institution" */
  update_institution_by_pk?: Maybe<Institution>;
  /** update data of the table: "reservation" */
  update_reservation?: Maybe<Reservation_Mutation_Response>;
  /** update single row of the table: "reservation" */
  update_reservation_by_pk?: Maybe<Reservation>;
  /** update data of the table: "users" */
  update_users?: Maybe<Users_Mutation_Response>;
  /** update single row of the table: "users" */
  update_users_by_pk?: Maybe<Users>;
};


/** mutation root */
export type Mutation_RootDelete_InstitutionArgs = {
  where: Institution_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Institution_By_PkArgs = {
  id: Scalars['uuid'];
};


/** mutation root */
export type Mutation_RootDelete_ReservationArgs = {
  where: Reservation_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Reservation_By_PkArgs = {
  id: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_UsersArgs = {
  where: Users_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Users_By_PkArgs = {
  id: Scalars['uuid'];
};


/** mutation root */
export type Mutation_RootInsert_InstitutionArgs = {
  objects: Array<Institution_Insert_Input>;
  on_conflict?: Maybe<Institution_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Institution_OneArgs = {
  object: Institution_Insert_Input;
  on_conflict?: Maybe<Institution_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_ReservationArgs = {
  objects: Array<Reservation_Insert_Input>;
  on_conflict?: Maybe<Reservation_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Reservation_OneArgs = {
  object: Reservation_Insert_Input;
  on_conflict?: Maybe<Reservation_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_UsersArgs = {
  objects: Array<Users_Insert_Input>;
  on_conflict?: Maybe<Users_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Users_OneArgs = {
  object: Users_Insert_Input;
  on_conflict?: Maybe<Users_On_Conflict>;
};


/** mutation root */
export type Mutation_RootUpdate_InstitutionArgs = {
  _append?: Maybe<Institution_Append_Input>;
  _delete_at_path?: Maybe<Institution_Delete_At_Path_Input>;
  _delete_elem?: Maybe<Institution_Delete_Elem_Input>;
  _delete_key?: Maybe<Institution_Delete_Key_Input>;
  _inc?: Maybe<Institution_Inc_Input>;
  _prepend?: Maybe<Institution_Prepend_Input>;
  _set?: Maybe<Institution_Set_Input>;
  where: Institution_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Institution_By_PkArgs = {
  _append?: Maybe<Institution_Append_Input>;
  _delete_at_path?: Maybe<Institution_Delete_At_Path_Input>;
  _delete_elem?: Maybe<Institution_Delete_Elem_Input>;
  _delete_key?: Maybe<Institution_Delete_Key_Input>;
  _inc?: Maybe<Institution_Inc_Input>;
  _prepend?: Maybe<Institution_Prepend_Input>;
  _set?: Maybe<Institution_Set_Input>;
  pk_columns: Institution_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_ReservationArgs = {
  _append?: Maybe<Reservation_Append_Input>;
  _delete_at_path?: Maybe<Reservation_Delete_At_Path_Input>;
  _delete_elem?: Maybe<Reservation_Delete_Elem_Input>;
  _delete_key?: Maybe<Reservation_Delete_Key_Input>;
  _inc?: Maybe<Reservation_Inc_Input>;
  _prepend?: Maybe<Reservation_Prepend_Input>;
  _set?: Maybe<Reservation_Set_Input>;
  where: Reservation_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Reservation_By_PkArgs = {
  _append?: Maybe<Reservation_Append_Input>;
  _delete_at_path?: Maybe<Reservation_Delete_At_Path_Input>;
  _delete_elem?: Maybe<Reservation_Delete_Elem_Input>;
  _delete_key?: Maybe<Reservation_Delete_Key_Input>;
  _inc?: Maybe<Reservation_Inc_Input>;
  _prepend?: Maybe<Reservation_Prepend_Input>;
  _set?: Maybe<Reservation_Set_Input>;
  pk_columns: Reservation_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_UsersArgs = {
  _set?: Maybe<Users_Set_Input>;
  where: Users_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Users_By_PkArgs = {
  _set?: Maybe<Users_Set_Input>;
  pk_columns: Users_Pk_Columns_Input;
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
  /** fetch data from the table: "users" */
  users: Array<Users>;
  /** fetch aggregated fields from the table: "users" */
  users_aggregate: Users_Aggregate;
  /** fetch data from the table: "users" using primary key columns */
  users_by_pk?: Maybe<Users>;
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


/** query root */
export type Query_RootUsersArgs = {
  distinct_on?: Maybe<Array<Users_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Users_Order_By>>;
  where?: Maybe<Users_Bool_Exp>;
};


/** query root */
export type Query_RootUsers_AggregateArgs = {
  distinct_on?: Maybe<Array<Users_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Users_Order_By>>;
  where?: Maybe<Users_Bool_Exp>;
};


/** query root */
export type Query_RootUsers_By_PkArgs = {
  id: Scalars['uuid'];
};

/** columns and relationships of "reservation" */
export type Reservation = {
  __typename?: 'reservation';
  building: Scalars['String'];
  created_at: Scalars['timestamp'];
  date: Scalars['date'];
  day_of_week: Scalars['day_of_week'];
  id: Scalars['Int'];
  institution: Scalars['String'];
  institution_id?: Maybe<Scalars['uuid']>;
  reservation: Scalars['jsonb'];
  tokyo_ward: Scalars['tokyo_ward'];
  updated_at: Scalars['timestamp'];
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

/** append existing jsonb value of filtered columns with new jsonb value */
export type Reservation_Append_Input = {
  reservation?: Maybe<Scalars['jsonb']>;
};

/** input type for inserting array relation for remote table "reservation" */
export type Reservation_Arr_Rel_Insert_Input = {
  data: Array<Reservation_Insert_Input>;
  on_conflict?: Maybe<Reservation_On_Conflict>;
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
  created_at?: Maybe<Timestamp_Comparison_Exp>;
  date?: Maybe<Date_Comparison_Exp>;
  day_of_week?: Maybe<Day_Of_Week_Comparison_Exp>;
  id?: Maybe<Int_Comparison_Exp>;
  institution?: Maybe<String_Comparison_Exp>;
  institution_id?: Maybe<Uuid_Comparison_Exp>;
  reservation?: Maybe<Jsonb_Comparison_Exp>;
  tokyo_ward?: Maybe<Tokyo_Ward_Comparison_Exp>;
  updated_at?: Maybe<Timestamp_Comparison_Exp>;
};

/** unique or primary key constraints on table "reservation" */
export enum Reservation_Constraint {
  /** unique or primary key constraint */
  ReservationPkey = 'reservation_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Reservation_Delete_At_Path_Input = {
  reservation?: Maybe<Array<Maybe<Scalars['String']>>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Reservation_Delete_Elem_Input = {
  reservation?: Maybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Reservation_Delete_Key_Input = {
  reservation?: Maybe<Scalars['String']>;
};

/** input type for incrementing integer column in table "reservation" */
export type Reservation_Inc_Input = {
  id?: Maybe<Scalars['Int']>;
};

/** input type for inserting data into table "reservation" */
export type Reservation_Insert_Input = {
  building?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamp']>;
  date?: Maybe<Scalars['date']>;
  day_of_week?: Maybe<Scalars['day_of_week']>;
  id?: Maybe<Scalars['Int']>;
  institution?: Maybe<Scalars['String']>;
  institution_id?: Maybe<Scalars['uuid']>;
  reservation?: Maybe<Scalars['jsonb']>;
  tokyo_ward?: Maybe<Scalars['tokyo_ward']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** aggregate max on columns */
export type Reservation_Max_Fields = {
  __typename?: 'reservation_max_fields';
  building?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamp']>;
  date?: Maybe<Scalars['date']>;
  id?: Maybe<Scalars['Int']>;
  institution?: Maybe<Scalars['String']>;
  institution_id?: Maybe<Scalars['uuid']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** order by max() on columns of table "reservation" */
export type Reservation_Max_Order_By = {
  building?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  date?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  institution_id?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Reservation_Min_Fields = {
  __typename?: 'reservation_min_fields';
  building?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamp']>;
  date?: Maybe<Scalars['date']>;
  id?: Maybe<Scalars['Int']>;
  institution?: Maybe<Scalars['String']>;
  institution_id?: Maybe<Scalars['uuid']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** order by min() on columns of table "reservation" */
export type Reservation_Min_Order_By = {
  building?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  date?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  institution?: Maybe<Order_By>;
  institution_id?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** response of any mutation on the table "reservation" */
export type Reservation_Mutation_Response = {
  __typename?: 'reservation_mutation_response';
  /** number of affected rows by the mutation */
  affected_rows: Scalars['Int'];
  /** data of the affected rows by the mutation */
  returning: Array<Reservation>;
};

/** input type for inserting object relation for remote table "reservation" */
export type Reservation_Obj_Rel_Insert_Input = {
  data: Reservation_Insert_Input;
  on_conflict?: Maybe<Reservation_On_Conflict>;
};

/** on conflict condition type for table "reservation" */
export type Reservation_On_Conflict = {
  constraint: Reservation_Constraint;
  update_columns: Array<Reservation_Update_Column>;
  where?: Maybe<Reservation_Bool_Exp>;
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
  tokyo_ward?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** primary key columns input for table: "reservation" */
export type Reservation_Pk_Columns_Input = {
  id: Scalars['Int'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Reservation_Prepend_Input = {
  reservation?: Maybe<Scalars['jsonb']>;
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
  Reservation = 'reservation',
  /** column name */
  TokyoWard = 'tokyo_ward',
  /** column name */
  UpdatedAt = 'updated_at'
}

/** input type for updating data in table "reservation" */
export type Reservation_Set_Input = {
  building?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamp']>;
  date?: Maybe<Scalars['date']>;
  day_of_week?: Maybe<Scalars['day_of_week']>;
  id?: Maybe<Scalars['Int']>;
  institution?: Maybe<Scalars['String']>;
  institution_id?: Maybe<Scalars['uuid']>;
  reservation?: Maybe<Scalars['jsonb']>;
  tokyo_ward?: Maybe<Scalars['tokyo_ward']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

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

/** update columns of table "reservation" */
export enum Reservation_Update_Column {
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
  Reservation = 'reservation',
  /** column name */
  TokyoWard = 'tokyo_ward',
  /** column name */
  UpdatedAt = 'updated_at'
}

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
  /** fetch data from the table: "users" */
  users: Array<Users>;
  /** fetch aggregated fields from the table: "users" */
  users_aggregate: Users_Aggregate;
  /** fetch data from the table: "users" using primary key columns */
  users_by_pk?: Maybe<Users>;
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


/** subscription root */
export type Subscription_RootUsersArgs = {
  distinct_on?: Maybe<Array<Users_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Users_Order_By>>;
  where?: Maybe<Users_Bool_Exp>;
};


/** subscription root */
export type Subscription_RootUsers_AggregateArgs = {
  distinct_on?: Maybe<Array<Users_Select_Column>>;
  limit?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  order_by?: Maybe<Array<Users_Order_By>>;
  where?: Maybe<Users_Bool_Exp>;
};


/** subscription root */
export type Subscription_RootUsers_By_PkArgs = {
  id: Scalars['uuid'];
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


/** expression to compare columns of type tokyo_ward. All fields are combined with logical 'AND'. */
export type Tokyo_Ward_Comparison_Exp = {
  _eq?: Maybe<Scalars['tokyo_ward']>;
  _gt?: Maybe<Scalars['tokyo_ward']>;
  _gte?: Maybe<Scalars['tokyo_ward']>;
  _in?: Maybe<Array<Scalars['tokyo_ward']>>;
  _is_null?: Maybe<Scalars['Boolean']>;
  _lt?: Maybe<Scalars['tokyo_ward']>;
  _lte?: Maybe<Scalars['tokyo_ward']>;
  _neq?: Maybe<Scalars['tokyo_ward']>;
  _nin?: Maybe<Array<Scalars['tokyo_ward']>>;
};

/** columns and relationships of "users" */
export type Users = {
  __typename?: 'users';
  created_at: Scalars['timestamp'];
  id: Scalars['uuid'];
  name: Scalars['String'];
  updated_at: Scalars['timestamp'];
};

/** aggregated selection of "users" */
export type Users_Aggregate = {
  __typename?: 'users_aggregate';
  aggregate?: Maybe<Users_Aggregate_Fields>;
  nodes: Array<Users>;
};

/** aggregate fields of "users" */
export type Users_Aggregate_Fields = {
  __typename?: 'users_aggregate_fields';
  count?: Maybe<Scalars['Int']>;
  max?: Maybe<Users_Max_Fields>;
  min?: Maybe<Users_Min_Fields>;
};


/** aggregate fields of "users" */
export type Users_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Users_Select_Column>>;
  distinct?: Maybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "users" */
export type Users_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<Users_Max_Order_By>;
  min?: Maybe<Users_Min_Order_By>;
};

/** input type for inserting array relation for remote table "users" */
export type Users_Arr_Rel_Insert_Input = {
  data: Array<Users_Insert_Input>;
  on_conflict?: Maybe<Users_On_Conflict>;
};

/** Boolean expression to filter rows from the table "users". All fields are combined with a logical 'AND'. */
export type Users_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Users_Bool_Exp>>>;
  _not?: Maybe<Users_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Users_Bool_Exp>>>;
  created_at?: Maybe<Timestamp_Comparison_Exp>;
  id?: Maybe<Uuid_Comparison_Exp>;
  name?: Maybe<String_Comparison_Exp>;
  updated_at?: Maybe<Timestamp_Comparison_Exp>;
};

/** unique or primary key constraints on table "users" */
export enum Users_Constraint {
  /** unique or primary key constraint */
  UsersPkey = 'users_pkey'
}

/** input type for inserting data into table "users" */
export type Users_Insert_Input = {
  created_at?: Maybe<Scalars['timestamp']>;
  id?: Maybe<Scalars['uuid']>;
  name?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** aggregate max on columns */
export type Users_Max_Fields = {
  __typename?: 'users_max_fields';
  created_at?: Maybe<Scalars['timestamp']>;
  id?: Maybe<Scalars['uuid']>;
  name?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** order by max() on columns of table "users" */
export type Users_Max_Order_By = {
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Users_Min_Fields = {
  __typename?: 'users_min_fields';
  created_at?: Maybe<Scalars['timestamp']>;
  id?: Maybe<Scalars['uuid']>;
  name?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** order by min() on columns of table "users" */
export type Users_Min_Order_By = {
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** response of any mutation on the table "users" */
export type Users_Mutation_Response = {
  __typename?: 'users_mutation_response';
  /** number of affected rows by the mutation */
  affected_rows: Scalars['Int'];
  /** data of the affected rows by the mutation */
  returning: Array<Users>;
};

/** input type for inserting object relation for remote table "users" */
export type Users_Obj_Rel_Insert_Input = {
  data: Users_Insert_Input;
  on_conflict?: Maybe<Users_On_Conflict>;
};

/** on conflict condition type for table "users" */
export type Users_On_Conflict = {
  constraint: Users_Constraint;
  update_columns: Array<Users_Update_Column>;
  where?: Maybe<Users_Bool_Exp>;
};

/** ordering options when selecting data from "users" */
export type Users_Order_By = {
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** primary key columns input for table: "users" */
export type Users_Pk_Columns_Input = {
  id: Scalars['uuid'];
};

/** select columns of table "users" */
export enum Users_Select_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Id = 'id',
  /** column name */
  Name = 'name',
  /** column name */
  UpdatedAt = 'updated_at'
}

/** input type for updating data in table "users" */
export type Users_Set_Input = {
  created_at?: Maybe<Scalars['timestamp']>;
  id?: Maybe<Scalars['uuid']>;
  name?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** update columns of table "users" */
export enum Users_Update_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Id = 'id',
  /** column name */
  Name = 'name',
  /** column name */
  UpdatedAt = 'updated_at'
}


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

export type Detail_InstitutionQueryVariables = Exact<{
  id: Scalars['uuid'];
}>;


export type Detail_InstitutionQuery = { __typename?: 'query_root', institution_by_pk?: Maybe<{ __typename?: 'institution', tokyo_ward: any, building: string, institution: string, capacity?: Maybe<number>, area?: Maybe<number>, fee_division: any, weekday_usage_fee: any, holiday_usage_fee: any, address: string, is_available_strings: any, is_available_woodwind: any, is_available_brass: any, is_available_percussion: any, is_equipped_music_stand: any, is_equipped_piano: any, website_url: string, layout_image_url: string, lottery_period: string, note: string }>, reservation_aggregate: { __typename?: 'reservation_aggregate', aggregate?: Maybe<{ __typename?: 'reservation_aggregate_fields', count?: Maybe<number>, max?: Maybe<{ __typename?: 'reservation_max_fields', date?: Maybe<any> }>, min?: Maybe<{ __typename?: 'reservation_min_fields', date?: Maybe<any> }> }> } };

export type Detail_ReservationQueryVariables = Exact<{
  id: Scalars['uuid'];
  startDate?: Maybe<Scalars['date']>;
  endDate?: Maybe<Scalars['date']>;
}>;


export type Detail_ReservationQuery = { __typename?: 'query_root', reservation: Array<{ __typename?: 'reservation', id: number, date: any, reservation: any, updated_at: any }> };

export type InstitutionQueryVariables = Exact<{
  offset?: Maybe<Scalars['Int']>;
  limit?: Maybe<Scalars['Int']>;
  tokyoWard?: Maybe<Array<Scalars['tokyo_ward']> | Scalars['tokyo_ward']>;
  isAvailableStrings?: Maybe<Scalars['availavility_division']>;
  isAvailableWoodwind?: Maybe<Scalars['availavility_division']>;
  isAvailableBrass?: Maybe<Scalars['availavility_division']>;
  isAvailablePercussion?: Maybe<Scalars['availavility_division']>;
  isEquippedMusicStand?: Maybe<Scalars['equipment_division']>;
  isEquippedPiano?: Maybe<Scalars['equipment_division']>;
}>;


export type InstitutionQuery = { __typename?: 'query_root', institution: Array<{ __typename?: 'institution', id: any, tokyo_ward: any, building: string, institution: string, capacity?: Maybe<number>, area?: Maybe<number>, weekday_usage_fee: any, holiday_usage_fee: any, address: string, is_available_strings: any, is_available_woodwind: any, is_available_brass: any, is_available_percussion: any, is_equipped_music_stand: any, is_equipped_piano: any, website_url: string, layout_image_url: string, lottery_period: string, note: string, updated_at: any }>, institution_aggregate: { __typename?: 'institution_aggregate', aggregate?: Maybe<{ __typename?: 'institution_aggregate_fields', count?: Maybe<number> }> } };

export type ReservationQueryVariables = Exact<{
  offset?: Maybe<Scalars['Int']>;
  limit?: Maybe<Scalars['Int']>;
  tokyoWard?: Maybe<Array<Scalars['tokyo_ward']> | Scalars['tokyo_ward']>;
  startDate?: Maybe<Scalars['date']>;
  endDate?: Maybe<Scalars['date']>;
  dayOfWeek?: Maybe<Array<Scalars['day_of_week']> | Scalars['day_of_week']>;
  reservationStatus1?: Maybe<Scalars['jsonb']>;
  reservationStatus2?: Maybe<Scalars['jsonb']>;
  reservationStatus3?: Maybe<Scalars['jsonb']>;
  reservationStatus4?: Maybe<Scalars['jsonb']>;
}>;


export type ReservationQuery = { __typename?: 'query_root', reservation: Array<{ __typename?: 'reservation', id: number, institution_id?: Maybe<any>, tokyo_ward: any, building: string, institution: string, date: any, reservation: any, updated_at: any }>, reservation_aggregate: { __typename?: 'reservation_aggregate', aggregate?: Maybe<{ __typename?: 'reservation_aggregate_fields', count?: Maybe<number> }> } };


export const Detail_InstitutionDocument = gql`
    query detail_institution($id: uuid!) {
  institution_by_pk(id: $id) {
    tokyo_ward
    building
    institution
    capacity
    area
    fee_division
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
  reservation_aggregate(where: {institution_id: {_eq: $id}}) {
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
export const Detail_ReservationDocument = gql`
    query detail_reservation($id: uuid!, $startDate: date, $endDate: date) {
  reservation(
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
 * __useDetail_ReservationQuery__
 *
 * To run a query within a React component, call `useDetail_ReservationQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetail_ReservationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetail_ReservationQuery({
 *   variables: {
 *      id: // value for 'id'
 *      startDate: // value for 'startDate'
 *      endDate: // value for 'endDate'
 *   },
 * });
 */
export function useDetail_ReservationQuery(baseOptions: Apollo.QueryHookOptions<Detail_ReservationQuery, Detail_ReservationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Detail_ReservationQuery, Detail_ReservationQueryVariables>(Detail_ReservationDocument, options);
      }
export function useDetail_ReservationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Detail_ReservationQuery, Detail_ReservationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Detail_ReservationQuery, Detail_ReservationQueryVariables>(Detail_ReservationDocument, options);
        }
export type Detail_ReservationQueryHookResult = ReturnType<typeof useDetail_ReservationQuery>;
export type Detail_ReservationLazyQueryHookResult = ReturnType<typeof useDetail_ReservationLazyQuery>;
export type Detail_ReservationQueryResult = Apollo.QueryResult<Detail_ReservationQuery, Detail_ReservationQueryVariables>;
export const InstitutionDocument = gql`
    query institution($offset: Int, $limit: Int, $tokyoWard: [tokyo_ward!] = null, $isAvailableStrings: availavility_division = null, $isAvailableWoodwind: availavility_division = null, $isAvailableBrass: availavility_division = null, $isAvailablePercussion: availavility_division = null, $isEquippedMusicStand: equipment_division = null, $isEquippedPiano: equipment_division = null) {
  institution(
    offset: $offset
    limit: $limit
    where: {tokyo_ward: {_in: $tokyoWard}, is_available_strings: {_eq: $isAvailableStrings}, is_available_woodwind: {_eq: $isAvailableWoodwind}, is_available_brass: {_eq: $isAvailableBrass}, is_available_percussion: {_eq: $isAvailablePercussion}}
  ) {
    id
    tokyo_ward
    building
    institution
    capacity
    area
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
    updated_at
  }
  institution_aggregate(
    where: {tokyo_ward: {_in: $tokyoWard}, is_available_strings: {_eq: $isAvailableStrings}, is_available_woodwind: {_eq: $isAvailableWoodwind}, is_available_brass: {_eq: $isAvailableBrass}, is_available_percussion: {_eq: $isAvailablePercussion}}
  ) {
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
 *      tokyoWard: // value for 'tokyoWard'
 *      isAvailableStrings: // value for 'isAvailableStrings'
 *      isAvailableWoodwind: // value for 'isAvailableWoodwind'
 *      isAvailableBrass: // value for 'isAvailableBrass'
 *      isAvailablePercussion: // value for 'isAvailablePercussion'
 *      isEquippedMusicStand: // value for 'isEquippedMusicStand'
 *      isEquippedPiano: // value for 'isEquippedPiano'
 *   },
 * });
 */
export function useInstitutionQuery(baseOptions?: Apollo.QueryHookOptions<InstitutionQuery, InstitutionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InstitutionQuery, InstitutionQueryVariables>(InstitutionDocument, options);
      }
export function useInstitutionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstitutionQuery, InstitutionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InstitutionQuery, InstitutionQueryVariables>(InstitutionDocument, options);
        }
export type InstitutionQueryHookResult = ReturnType<typeof useInstitutionQuery>;
export type InstitutionLazyQueryHookResult = ReturnType<typeof useInstitutionLazyQuery>;
export type InstitutionQueryResult = Apollo.QueryResult<InstitutionQuery, InstitutionQueryVariables>;
export const ReservationDocument = gql`
    query reservation($offset: Int, $limit: Int, $tokyoWard: [tokyo_ward!] = null, $startDate: date, $endDate: date, $dayOfWeek: [day_of_week!] = null, $reservationStatus1: jsonb = null, $reservationStatus2: jsonb = null, $reservationStatus3: jsonb = null, $reservationStatus4: jsonb = null) {
  reservation(
    offset: $offset
    limit: $limit
    where: {_or: [{tokyo_ward: {_in: $tokyoWard}, date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $dayOfWeek}, reservation: {_contains: $reservationStatus1}}, {tokyo_ward: {_in: $tokyoWard}, date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $dayOfWeek}, reservation: {_contains: $reservationStatus2}}, {tokyo_ward: {_in: $tokyoWard}, date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $dayOfWeek}, reservation: {_contains: $reservationStatus3}}, {tokyo_ward: {_in: $tokyoWard}, date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $dayOfWeek}, reservation: {_contains: $reservationStatus4}}]}
    order_by: {date: asc}
  ) {
    id
    institution_id
    tokyo_ward
    building
    institution
    date
    reservation
    updated_at
  }
  reservation_aggregate(
    where: {_or: [{tokyo_ward: {_in: $tokyoWard}, date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $dayOfWeek}, reservation: {_contains: $reservationStatus1}}, {tokyo_ward: {_in: $tokyoWard}, date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $dayOfWeek}, reservation: {_contains: $reservationStatus2}}, {tokyo_ward: {_in: $tokyoWard}, date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $dayOfWeek}, reservation: {_contains: $reservationStatus3}}, {tokyo_ward: {_in: $tokyoWard}, date: {_gte: $startDate, _lte: $endDate}, day_of_week: {_in: $dayOfWeek}, reservation: {_contains: $reservationStatus4}}]}
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
 *      tokyoWard: // value for 'tokyoWard'
 *      startDate: // value for 'startDate'
 *      endDate: // value for 'endDate'
 *      dayOfWeek: // value for 'dayOfWeek'
 *      reservationStatus1: // value for 'reservationStatus1'
 *      reservationStatus2: // value for 'reservationStatus2'
 *      reservationStatus3: // value for 'reservationStatus3'
 *      reservationStatus4: // value for 'reservationStatus4'
 *   },
 * });
 */
export function useReservationQuery(baseOptions?: Apollo.QueryHookOptions<ReservationQuery, ReservationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReservationQuery, ReservationQueryVariables>(ReservationDocument, options);
      }
export function useReservationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReservationQuery, ReservationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReservationQuery, ReservationQueryVariables>(ReservationDocument, options);
        }
export type ReservationQueryHookResult = ReturnType<typeof useReservationQuery>;
export type ReservationLazyQueryHookResult = ReturnType<typeof useReservationLazyQuery>;
export type ReservationQueryResult = Apollo.QueryResult<ReservationQuery, ReservationQueryVariables>;