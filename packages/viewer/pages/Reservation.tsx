import type { ReservationSearchHit } from "@shisetsu-viewer/shared";
import { addMonths, endOfMonth, isSameDay } from "date-fns";
import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { useLocation, useSearch } from "wouter";

import { searchReservations } from "../api/endpoints";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { type Columns } from "../components/DataTable";
import { DateRangePicker, type DateRangeValue } from "../components/DateRangePicker";
import { SearchPageLayout } from "../components/SearchPageLayout";
import { Select, type SelectChangeEvent } from "../components/Select";
import { ROUTES } from "../constants/routes";
import { usePaginatedQuery } from "../hooks/usePaginatedQuery";
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
  IS_ONLY_HOLIDAY,
  RESERVATION_SEARCH_FILTER_MAP,
  VACANCY_FILTERS,
  formatReservationMap,
  toReservationSearchParams,
  toReservationSearchQueryParams,
} from "../utils/reservation";
import {
  AVAILABLE_INSTRUMENT_MAP,
  INSTITUTION_SIZE_MAP,
  buildFilterChips,
  toggleArrayParam,
} from "../utils/search";

type ReservationSearchRow = ReservationSearchHit & { id: string; [key: string]: unknown };

export const COLUMNS: Columns<ReservationSearchRow> = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    type: "getter",
    maxWidth: 400,
    valueGetter: (params) =>
      `${params.row.institution.building} ${params.row.institution.institution}`,
  },
  {
    field: "municipality",
    headerName: "地区",
    type: "getter",
    hide: true,
    valueGetter: (params) => SupportedMunicipalityMap[params.row.institution.municipality] || "",
  },
  {
    field: "institution_size",
    headerName: "施設サイズ",
    type: "getter",
    valueGetter: (params) => InstitutionSizeMap[params.row.institution.institution_size] || "",
  },
  {
    field: "date",
    headerName: "日付",
    type: "getter",
    valueGetter: (params) => formatDate(params.row.reservation.date),
  },
  {
    field: "reservation",
    headerName: "予約状況",
    maxWidth: 400,
    type: "getter",
    valueGetter: (params) => {
      const municipality = params.row.institution.municipality as SupportedMunicipality;
      const obj = params.row.reservation.reservation;
      return formatReservationMap(municipality, obj, params.row.institution.division_labels);
    },
  },
  {
    field: "updated_at",
    headerName: "更新日時",
    type: "getter",
    valueGetter: (params) => formatDatetime(params.row.reservation.updated_at),
  },
];

const ReservationPage = () => {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();

  // 「今」はモジュール読み込み時ではなくページ表示時点で確定させる（長寿命タブでの日付ずれ防止）。
  const [minDate] = useState(() => new Date());
  const [maxDate] = useState(() => addMonths(endOfMonth(new Date()), 6));

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

  const queryParams = useMemo(
    () => toReservationSearchQueryParams(reservationSearchParams),
    [reservationSearchParams]
  );

  const {
    data: hits,
    loading,
    error,
    hasNextPage: hasMore,
    fetchMore,
    fetchingMore,
  } = usePaginatedQuery<ReservationSearchHit>(
    (token, cursor) => searchReservations(queryParams, cursor, token),
    JSON.stringify(queryParams)
  );

  const reservations = useMemo<ReservationSearchRow[]>(
    () =>
      (hits ?? []).map((hit) => ({
        id: `${hit.institution.id}_${hit.reservation.date}`,
        ...hit,
      })),
    [hits]
  );

  const { municipality, startDate, endDate, filter, availableInstruments, institutionSizes } =
    reservationSearchParams;

  const handleMunicipalityChange = useCallback(
    (event: SelectChangeEvent<string>): void => {
      setQueryParams({ m: convertMunicipalityToUrlParam(event.target.value) });
    },
    [setQueryParams]
  );

  const handleDateRangeChange = useCallback(
    ({ from, to }: DateRangeValue): void => {
      setQueryParams({ df: from, dt: to });
    },
    [setQueryParams]
  );

  const handleHolidayOnlyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setQueryParams({ f: toggleArrayParam(filter, IS_ONLY_HOLIDAY, event.target.checked) });
    },
    [setQueryParams, filter]
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
    {
      label: isSameDay(startDate, endDate)
        ? formatDate(startDate)
        : `${formatDate(startDate)} 〜 ${formatDate(endDate)}`,
    },
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
          <div>
            <DateRangePicker
              label="日付"
              maxDate={maxDate}
              minDate={minDate}
              onChange={handleDateRangeChange}
              value={{ from: startDate, to: endDate }}
            />
            <Checkbox
              checked={filter.includes(IS_ONLY_HOLIDAY)}
              label={RESERVATION_SEARCH_FILTER_MAP[IS_ONLY_HOLIDAY]}
              onChange={handleHolidayOnlyChange}
              value={IS_ONLY_HOLIDAY}
            />
          </div>
          <CheckboxGroup label="空き時間帯" onChange={handleFilterChange} values={filter}>
            {VACANCY_FILTERS.map((value) => (
              <Checkbox key={value} label={RESERVATION_SEARCH_FILTER_MAP[value]} value={value} />
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
      empty={!municipality || !reservations.length}
      error={error}
      fetchMore={fetchMore}
      fetchingMore={fetchingMore}
      hasNextPage={hasMore}
      loading={loading}
      onRowClick={(params) => {
        if (params.row.institution.id) {
          setLocation(ROUTES.detail.replace(":id", params.row.institution.id));
        }
      }}
      rows={reservations}
    />
  );
};

export default ReservationPage;
