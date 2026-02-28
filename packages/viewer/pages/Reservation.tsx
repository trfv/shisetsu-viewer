import { addMonths, endOfMonth, max, min } from "date-fns";
import { useCallback, useMemo, type ChangeEvent } from "react";
import { useLocation, useSearch } from "wouter";
import {
  RESERVATIONS_QUERY,
  type SearchableReservationNode,
  type ReservationsQueryData,
} from "../api/queries";
import { usePaginatedQuery } from "../hooks/usePaginatedQuery";
import { extractSinglePkFromRelayId } from "../utils/relay";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { DataTable, type Columns } from "../components/DataTable";
import { DateRangePicker } from "../components/DateRangePicker";
import { SearchForm } from "../components/SearchForm";
import { Select, type SelectChangeEvent } from "../components/Select";
import { Spinner } from "../components/Spinner";
import { ROUTES } from "../constants/routes";
import { ArrayParam, DateParam, StringParam, useQueryParams } from "../hooks/useQueryParams";
import { InstitutionSizeMap } from "../utils/enums";
import { formatDate, formatDatetime } from "../utils/format";
import {
  MunicipalityOptions,
  SupportedMunicipalityMap,
  convertMunicipalityToUrlParam,
  type SupportedMunicipality,
  RESERVATION_EXCLUDED_MUNICIPALITIES,
} from "../utils/municipality";
import {
  RESERVATION_SEARCH_FILTER_MAP,
  formatReservationMap,
  toReservationQueryVariables,
  toReservationSearchParams,
  type ReservationSearchFilter,
} from "../utils/reservation";
import {
  AVAILABLE_INSTRUMENT_MAP,
  INSTUTITON_SIZE_MAP,
  type AvailableInstrument,
  type InstitutionSize,
} from "../utils/search";
import styles from "./Reservation.module.css";

const minDate = new Date();
const maxDate = addMonths(endOfMonth(new Date()), 6);

export const COLUMNS: Columns<SearchableReservationNode> = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    type: "getter",
    maxWidth: 400,
    valueGetter: (params) =>
      `${params.row.institution?.building ?? ""} ${params.row.institution?.institution ?? ""}`,
  },
  {
    field: "municipality",
    headerName: "地区",
    type: "getter",
    hide: true,
    valueGetter: (params) =>
      SupportedMunicipalityMap[params.row.institution?.municipality as string] || "",
  },
  {
    field: "institution_size",
    headerName: "施設サイズ",
    type: "getter",
    valueGetter: (params) =>
      InstitutionSizeMap[params.row.institution?.institution_size ?? ""] || "",
  },
  {
    field: "date",
    headerName: "日付",
    type: "getter",
    valueGetter: (params) => formatDate(params.row.reservation?.date),
  },
  {
    field: "reservation",
    headerName: "予約状況",
    maxWidth: 400,
    type: "getter",
    valueGetter: (params) => {
      const municipality = params.row.institution?.municipality as SupportedMunicipality;
      const obj = params.row.reservation?.reservation as Record<string, string>;
      return formatReservationMap(municipality, obj);
    },
    /** TODO hover したときに中身がすべて表示されるように修正する */
  },
  {
    field: "updated_at",
    headerName: "取得日時",
    type: "getter",
    valueGetter: (params) => formatDatetime(params.row.reservation?.updated_at),
  },
];

export default () => {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();

  const [values, setQueryParams] = useQueryParams(
    {
      m: StringParam,
      df: DateParam,
      dt: DateParam,
      f: ArrayParam,
      a: ArrayParam,
      i: ArrayParam,
    },
    setLocation,
    search,
    pathname
  );

  const resevationSearchParams = useMemo(
    () =>
      toReservationSearchParams(
        values.m,
        values.df,
        values.dt,
        values.f,
        values.a,
        values.i,
        minDate,
        maxDate
      ),
    [values]
  );

  const {
    data: reservations,
    loading,
    error,
    hasNextPage: hasMore,
    fetchMore,
    fetchingMore,
  } = usePaginatedQuery<ReservationsQueryData, SearchableReservationNode>(
    RESERVATIONS_QUERY,
    toReservationQueryVariables(resevationSearchParams),
    (d) => d.searchable_reservations_connection
  );

  if (error) {
    // TODO Snackbar を描画する
    throw new Error(error.message);
  }

  const { municipality, startDate, endDate, filter, availableInstruments, institutionSizes } =
    resevationSearchParams;

  const handleMunicipalityChange = useCallback(
    (event: SelectChangeEvent<string>): void => {
      setQueryParams({ m: convertMunicipalityToUrlParam(event.target.value) });
    },
    [setQueryParams]
  );

  const handleStartDateChange = useCallback(
    (date: Date | null): void => {
      /* istanbul ignore next -- date is always provided by DatePicker onChange */
      setQueryParams({ df: date, dt: min([maxDate, max([date ?? endDate, endDate])]) });
    },
    [setQueryParams, endDate]
  );

  const handleEndDateChange = useCallback(
    (date: Date | null): void => {
      /* istanbul ignore next -- date is always provided by DatePicker onChange */
      setQueryParams({ df: max([minDate, min([date ?? startDate, startDate])]), dt: date });
    },
    [setQueryParams, startDate]
  );

  const handleFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? filter.concat(value as ReservationSearchFilter)
        : filter.filter((v) => v !== value);
      setQueryParams({ f: next });
    },
    [setQueryParams, filter]
  );

  const handleAvailableInstrumentsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? availableInstruments.concat(value as AvailableInstrument)
        : availableInstruments.filter((v) => v !== value);
      setQueryParams({ a: next });
    },
    [setQueryParams, availableInstruments]
  );

  const handleInstitutoinSizesChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? institutionSizes.concat(value as InstitutionSize)
        : institutionSizes.filter((v) => v !== value);
      setQueryParams({ i: next });
    },
    [setQueryParams, institutionSizes]
  );

  const chips = [
    ...(municipality === "all"
      ? []
      : [
          {
            label: `${MunicipalityOptions.find((o) => o.value === municipality)?.label}`,
            onDelete: () => setQueryParams({ m: null }),
          },
        ]),
    { label: `${formatDate(startDate)} 〜 ${formatDate(endDate)}` },
    ...Object.entries(RESERVATION_SEARCH_FILTER_MAP)
      .filter(([v]) => filter.includes(v as ReservationSearchFilter))
      .map(([v, label]) => ({
        label,
        onDelete: () => setQueryParams({ f: filter.filter((f) => f !== v) }),
      })),
    ...Object.entries(AVAILABLE_INSTRUMENT_MAP)
      .filter(([v]) => availableInstruments.includes(v as AvailableInstrument))
      .map(([v, label]) => ({
        label,
        onDelete: () => setQueryParams({ a: availableInstruments.filter((a) => a !== v) }),
      })),
    ...Object.entries(INSTUTITON_SIZE_MAP)
      .filter(([v]) => institutionSizes.includes(v as InstitutionSize))
      .map(([v, label]) => ({
        label,
        onDelete: () => setQueryParams({ i: institutionSizes.filter((i) => i !== v) }),
      })),
  ];

  return (
    <main className={styles["pageBox"]}>
      <div className={styles["searchBox"]}>
        <div className={styles["searchBoxForm"]}>
          <SearchForm chips={chips}>
            <Select
              label="地区"
              onChange={handleMunicipalityChange}
              selectOptions={MunicipalityOptions.filter(
                (m) =>
                  !RESERVATION_EXCLUDED_MUNICIPALITIES.includes(m.value as SupportedMunicipality)
              )}
              size="small"
              value={municipality}
            />
            <DateRangePicker
              endDateProps={{
                value: endDate,
                onChange: handleEndDateChange,
                minDate,
                maxDate,
              }}
              label="期間指定"
              startDateProps={{
                value: startDate,
                onChange: handleStartDateChange,
                minDate,
                maxDate,
              }}
            />
            <CheckboxGroup label="絞り込み" onChange={handleFilterChange} values={filter}>
              {Object.entries(RESERVATION_SEARCH_FILTER_MAP).map(([value, label]) => (
                <Checkbox key={value} label={label} value={value} />
              ))}
            </CheckboxGroup>
            <CheckboxGroup
              label="利用可能楽器"
              onChange={handleAvailableInstrumentsChange}
              values={availableInstruments}
            >
              {Object.entries(AVAILABLE_INSTRUMENT_MAP).map(([value, label]) => (
                <Checkbox key={value} label={label} value={value} />
              ))}
            </CheckboxGroup>
            <CheckboxGroup
              label="施設サイズ"
              onChange={handleInstitutoinSizesChange}
              values={institutionSizes}
            >
              {Object.entries(INSTUTITON_SIZE_MAP).map(([value, label]) => (
                <Checkbox key={value} label={label} value={value} />
              ))}
            </CheckboxGroup>
          </SearchForm>
        </div>
      </div>
      <div className={styles["resultBox"]}>
        {loading && !fetchingMore ? (
          <div className={styles["resultBoxNoData"]}>
            <Spinner />
          </div>
        ) : !municipality || !reservations?.length ? (
          <div className={styles["resultBoxNoData"]}>表示するデータが存在しません</div>
        ) : (
          <DataTable
            columns={COLUMNS}
            fetchMore={fetchMore}
            hasNextPage={hasMore}
            onRowClick={(params) => {
              const institutionId =
                params.row.institution?.id && extractSinglePkFromRelayId(params.row.institution.id);
              if (institutionId) {
                setLocation(ROUTES.detail.replace(":id", institutionId as string));
              }
            }}
            rows={reservations}
          />
        )}
      </div>
    </main>
  );
};
