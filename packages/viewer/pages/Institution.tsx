import type { InstitutionsQueryParams, InstitutionSummary } from "@shisetsu-viewer/shared";
import { useCallback, useDeferredValue, useMemo, type ChangeEvent } from "react";
import { useLocation, useSearch } from "wouter";

import { fetchInstitutions } from "../api/endpoints";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { type Columns, type RowParams } from "../components/DataTable";
import { MultiSelect } from "../components/MultiSelect";
import { SearchPageLayout, SearchResults } from "../components/SearchPageLayout";
import { ROUTES } from "../constants/routes";
import { usePages } from "../hooks/usePages";
import { ArrayParam, useQueryParams } from "../hooks/useQueryParams";
import { AvailabilityDivisionMap, EquipmentDivisionMap, InstitutionSizeMap } from "../utils/enums";
import {
  formatInstitutionName,
  toInstitutionQueryParams,
  toInstitutionSearchParams,
} from "../utils/institution";
import {
  SupportedMunicipalities,
  SupportedMunicipalityMap,
  toMunicipalityUrlParam,
  type SupportedMunicipality,
} from "../utils/municipality";
import {
  AVAILABLE_INSTRUMENT_MAP,
  INSTITUTION_SIZE_MAP,
  buildFilterChips,
  toggleArrayParam,
} from "../utils/search";

const MUNICIPALITY_OPTIONS = SupportedMunicipalities.map((k) => ({
  value: k,
  label: SupportedMunicipalityMap[k]!,
}));

export const COLUMNS: Columns<InstitutionSummary> = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    type: "getter",
    maxWidth: 400,
    wrap: true,
    valueGetter: (params) => formatInstitutionName(params.row),
  },
  {
    field: "institution_size",
    headerName: "施設サイズ",
    type: "getter",
    valueGetter: (params) => InstitutionSizeMap[params.value as string] || "",
  },
  {
    field: "is_available_strings",
    headerName: "弦楽器",
    type: "getter",
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string] || "",
  },
  {
    field: "is_available_woodwind",
    headerName: "木管楽器",
    type: "getter",
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string] || "",
  },
  {
    field: "is_available_brass",
    headerName: "金管楽器",
    type: "getter",
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string] || "",
  },
  {
    field: "is_available_percussion",
    headerName: "打楽器",
    type: "getter",
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string] || "",
  },
  {
    field: "is_equipped_music_stand",
    headerName: "譜面台",
    type: "getter",
    hide: true,
    valueGetter: (params) => EquipmentDivisionMap[params.value as string] || "",
  },
  {
    field: "is_equipped_piano",
    headerName: "ピアノ",
    type: "getter",
    hide: true,
    valueGetter: (params) => EquipmentDivisionMap[params.value as string] || "",
  },
  {
    field: "updated_at",
    headerName: "更新日時",
    type: "datetime",
  },
];

const InstitutionResults = ({
  params,
  onRowClick,
}: {
  params: InstitutionsQueryParams;
  onRowClick: (params: RowParams<InstitutionSummary>) => void;
}) => {
  const fetchPage = useCallback(
    (cursor: string | null) => fetchInstitutions(params, cursor),
    [params]
  );
  const { items, hasNextPage, fetchMore } = usePages(
    `institutions:${JSON.stringify(params)}`,
    fetchPage
  );

  return (
    <SearchResults
      columns={COLUMNS}
      fetchMore={fetchMore}
      hasNextPage={hasNextPage}
      onRowClick={onRowClick}
      rows={items}
    />
  );
};

const InstitutionPage = () => {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();

  const [values, setQueryParams] = useQueryParams(
    {
      m: ArrayParam,
      a: ArrayParam,
      i: ArrayParam,
    },
    setLocation,
    search,
    pathname
  );

  const institutionSearchParams = useMemo(
    () => toInstitutionSearchParams(values.m, values.a, values.i),
    [values]
  );

  const queryParams = useMemo(
    () => toInstitutionQueryParams(institutionSearchParams),
    [institutionSearchParams]
  );

  // values は毎 render 新しいオブジェクトになるので、文字列にしてから deferred にする。
  const queryKey = JSON.stringify(queryParams);
  const deferredQueryKey = useDeferredValue(queryKey);
  const deferredQueryParams = useMemo(
    () => JSON.parse(deferredQueryKey) as InstitutionsQueryParams,
    [deferredQueryKey]
  );

  const handleRowClick = useCallback(
    (params: RowParams<InstitutionSummary>) => {
      if (params.row.id) {
        setLocation(ROUTES.detail.replace(":id", params.row.id));
      }
    },
    [setLocation]
  );

  const { municipalities, availableInstruments, institutionSizes } = institutionSearchParams;

  const handleMunicipalitiesChange = useCallback(
    (next: string[]): void => {
      setQueryParams({
        m: toMunicipalityUrlParam(next as SupportedMunicipality[], SupportedMunicipalities),
      });
    },
    [setQueryParams]
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
    ...(municipalities.length === SupportedMunicipalities.length
      ? []
      : buildFilterChips(SupportedMunicipalityMap, municipalities, (next) =>
          setQueryParams({
            m: next.length > 0 ? toMunicipalityUrlParam(next, SupportedMunicipalities) : null,
          })
        )),
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
      <InstitutionResults
        key={deferredQueryKey}
        onRowClick={handleRowClick}
        params={deferredQueryParams}
      />
    </SearchPageLayout>
  );
};

export default InstitutionPage;
