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
import { type Columns } from "../components/DataTable";
import { DateRangePicker } from "../components/DateRangePicker";
import { Select, type SelectChangeEvent } from "../components/Select";
import { SearchPageLayout } from "../components/SearchPageLayout";
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
} from "../utils/reservation";
import {
  AVAILABLE_INSTRUMENT_MAP,
  INSTITUTION_SIZE_MAP,
  buildFilterChips,
  toggleArrayParam,
} from "../utils/search";

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
  },
  {
    field: "updated_at",
    headerName: "取得日時",
    type: "getter",
    valueGetter: (params) => formatDatetime(params.row.reservation?.updated_at),
  },
];

const ReservationPage = () => {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();

  // 「今」はモジュール読み込み時ではなくページ表示時点で確定させる（長寿命タブでの日付ずれ防止）。
  const minDate = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => addMonths(endOfMonth(new Date()), 6), []);

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

  const reservationSearchParams = useMemo(
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
    [values, minDate, maxDate]
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
    toReservationQueryVariables(reservationSearchParams),
    (d) => d.searchable_reservations_connection
  );

  const { municipality, startDate, endDate, filter, availableInstruments, institutionSizes } =
    reservationSearchParams;

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
    [setQueryParams, endDate, maxDate]
  );

  const handleEndDateChange = useCallback(
    (date: Date | null): void => {
      /* istanbul ignore next -- date is always provided by DatePicker onChange */
      setQueryParams({ df: max([minDate, min([date ?? startDate, startDate])]), dt: date });
    },
    [setQueryParams, startDate, minDate]
  );

  const handleFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      setQueryParams({ f: toggleArrayParam(filter, value, checked) });
    },
    [setQueryParams, filter]
  );

  const handleAvailableInstrumentsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      setQueryParams({ a: toggleArrayParam(availableInstruments, value, checked) });
    },
    [setQueryParams, availableInstruments]
  );

  const handleInstitutionSizesChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      setQueryParams({ i: toggleArrayParam(institutionSizes, value, checked) });
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
    ...buildFilterChips(RESERVATION_SEARCH_FILTER_MAP, filter, (next) =>
      setQueryParams({ f: next })
    ),
    ...buildFilterChips(AVAILABLE_INSTRUMENT_MAP, availableInstruments, (next) =>
      setQueryParams({ a: next })
    ),
    ...buildFilterChips(INSTITUTION_SIZE_MAP, institutionSizes, (next) =>
      setQueryParams({ i: next })
    ),
  ];

  return (
    <SearchPageLayout
      chips={chips}
      columns={COLUMNS}
      controls={
        <>
          <Select
            label="地区"
            onChange={handleMunicipalityChange}
            selectOptions={MunicipalityOptions.filter(
              (m) => !RESERVATION_EXCLUDED_MUNICIPALITIES.includes(m.value as SupportedMunicipality)
            )}
            size="small"
            value={municipality}
          />
          <DateRangePicker
            endDateProps={{ value: endDate, onChange: handleEndDateChange, minDate, maxDate }}
            label="期間指定"
            startDateProps={{ value: startDate, onChange: handleStartDateChange, minDate, maxDate }}
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
            onChange={handleInstitutionSizesChange}
            values={institutionSizes}
          >
            {Object.entries(INSTITUTION_SIZE_MAP).map(([value, label]) => (
              <Checkbox key={value} label={label} value={value} />
            ))}
          </CheckboxGroup>
        </>
      }
      empty={!municipality || !reservations?.length}
      error={error}
      fetchMore={fetchMore}
      fetchingMore={fetchingMore}
      hasNextPage={hasMore}
      loading={loading}
      onRowClick={(params) => {
        const institutionId =
          params.row.institution?.id && extractSinglePkFromRelayId(params.row.institution.id);
        if (institutionId) {
          setLocation(ROUTES.detail.replace(":id", institutionId as string));
        }
      }}
      rows={reservations ?? []}
    />
  );
};

export default ReservationPage;
