import type { ReservationSearchHit, ReservationSearchQueryParams } from "@shisetsu-viewer/shared";
import { addMonths, endOfMonth, isSameDay } from "date-fns";
import { use, useCallback, useDeferredValue, useMemo, useState, type ChangeEvent } from "react";
import { useLocation, useSearch } from "wouter";

import { searchReservations } from "../api/endpoints";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { type Columns, type RowParams } from "../components/DataTable";
import { DateRangePicker, type DateRangeValue } from "../components/DateRangePicker";
import { MultiSelect } from "../components/MultiSelect";
import { SearchPageLayout, SearchResults } from "../components/SearchPageLayout";
import { ROUTES } from "../constants/routes";
import { usePages } from "../hooks/usePages";
import { ArrayParam, DateParam, useQueryParams } from "../hooks/useQueryParams";
import { useScrapeRuns } from "../hooks/useScrapeRuns";
import { InstitutionSizeMap } from "../utils/enums";
import { formatDate, formatShortDatetime } from "../utils/format";
import { formatInstitutionName } from "../utils/institution";
import {
  SupportedMunicipalityMap,
  toMunicipalityUrlParam,
  type SupportedMunicipality,
  RESERVATION_MUNICIPALITIES,
} from "../utils/municipality";
import {
  RESERVATION_SEARCH_FILTER_MAP,
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

type ReservationSearchRow = ReservationSearchHit & {
  id: string;
  fetched_at: string | undefined;
  [key: string]: unknown;
};

const MUNICIPALITY_OPTIONS = RESERVATION_MUNICIPALITIES.map((k) => ({
  value: k,
  label: SupportedMunicipalityMap[k]!,
}));

export const COLUMNS: Columns<ReservationSearchRow> = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    type: "getter",
    maxWidth: 400,
    wrap: true,
    valueGetter: (params) => formatInstitutionName(params.row.institution),
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
    wrap: true,
    type: "getter",
    valueGetter: (params) => {
      const municipality = params.row.institution.municipality as SupportedMunicipality;
      const obj = params.row.reservation.reservation;
      return formatReservationMap(municipality, obj, params.row.institution.division_labels);
    },
  },
  {
    field: "fetched_at",
    headerName: "取得日時",
    type: "getter",
    valueGetter: (params) => formatShortDatetime(params.row.fetched_at),
  },
  {
    field: "updated_at",
    headerName: "更新日時",
    type: "getter",
    valueGetter: (params) => formatShortDatetime(params.row.reservation.updated_at),
  },
];

const ReservationResults = ({
  params,
  onRowClick,
}: {
  params: ReservationSearchQueryParams;
  onRowClick: (params: RowParams<ReservationSearchRow>) => void;
}) => {
  // usePages の中で use() する前に作っておかないと、予約の取得を待ってから取得日時を取りに行く。
  const scrapeRunsPromise = useScrapeRuns();
  const fetchPage = useCallback(
    (cursor: string | null) => searchReservations(params, cursor),
    [params]
  );
  const { items, hasNextPage, fetchMore } = usePages(
    `reservations:${JSON.stringify(params)}`,
    fetchPage
  );
  const scrapeRuns = use(scrapeRunsPromise);

  const rows = useMemo<ReservationSearchRow[]>(() => {
    const fetchedAt = new Map(scrapeRuns.items.map((r) => [r.municipality, r.fetched_at]));
    return items.map((hit) => ({
      id: `${hit.institution.id}_${hit.reservation.date}`,
      fetched_at: fetchedAt.get(hit.institution.municipality),
      ...hit,
    }));
  }, [items, scrapeRuns]);

  return (
    <SearchResults
      columns={COLUMNS}
      fetchMore={fetchMore}
      hasNextPage={hasNextPage}
      onRowClick={onRowClick}
      rows={rows}
    />
  );
};

const ReservationPage = () => {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();

  // モジュール読み込み時に確定させると、長寿命タブで日付がずれる。
  const [minDate] = useState(() => new Date());
  const [maxDate] = useState(() => addMonths(endOfMonth(new Date()), 6));

  const [values, setQueryParams] = useQueryParams(
    {
      m: ArrayParam,
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

  // values は毎 render 新しいオブジェクトになるので、文字列にしてから deferred にする。
  const queryKey = JSON.stringify(queryParams);
  const deferredQueryKey = useDeferredValue(queryKey);
  const deferredQueryParams = useMemo(
    () => JSON.parse(deferredQueryKey) as ReservationSearchQueryParams,
    [deferredQueryKey]
  );

  const handleRowClick = useCallback(
    (params: RowParams<ReservationSearchRow>) => {
      if (params.row.institution.id) {
        setLocation(ROUTES.detail.replace(":id", params.row.institution.id));
      }
    },
    [setLocation]
  );

  const { municipalities, startDate, endDate, filter, availableInstruments, institutionSizes } =
    reservationSearchParams;

  const handleMunicipalitiesChange = useCallback(
    (next: string[]): void => {
      setQueryParams({
        m: toMunicipalityUrlParam(next as SupportedMunicipality[], RESERVATION_MUNICIPALITIES),
      });
    },
    [setQueryParams]
  );

  const handleDateRangeChange = useCallback(
    ({ from, to }: DateRangeValue): void => {
      setQueryParams({ df: from, dt: to });
    },
    [setQueryParams]
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
    ...(municipalities.length === RESERVATION_MUNICIPALITIES.length
      ? []
      : buildFilterChips(SupportedMunicipalityMap, municipalities, (next) =>
          setQueryParams({
            m: next.length > 0 ? toMunicipalityUrlParam(next, RESERVATION_MUNICIPALITIES) : null,
          })
        )),
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
      controls={
        <>
          <MultiSelect
            label="地区"
            onChange={handleMunicipalitiesChange}
            options={MUNICIPALITY_OPTIONS}
            allLabel="すべて"
            emptyLabel="選択なし"
            size="medium"
            values={municipalities}
          />
          <DateRangePicker
            label="期間指定"
            maxDate={maxDate}
            minDate={minDate}
            onChange={handleDateRangeChange}
            value={{ from: startDate, to: endDate }}
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
      pending={queryKey !== deferredQueryKey}
      resetKey={deferredQueryKey}
    >
      <ReservationResults
        key={deferredQueryKey}
        onRowClick={handleRowClick}
        params={deferredQueryParams}
      />
    </SearchPageLayout>
  );
};

export default ReservationPage;
