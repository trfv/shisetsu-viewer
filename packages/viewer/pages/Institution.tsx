import type { InstitutionSummary } from "@shisetsu-viewer/shared";
import { useCallback, useMemo, type ChangeEvent } from "react";
import { useLocation, useSearch } from "wouter";

import { fetchInstitutions } from "../api/endpoints";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { type Columns } from "../components/DataTable";
import { SearchPageLayout } from "../components/SearchPageLayout";
import { Select, type SelectChangeEvent } from "../components/Select";
import { ROUTES } from "../constants/routes";
import { usePaginatedQuery } from "../hooks/usePaginatedQuery";
import { ArrayParam, StringParam, useQueryParams } from "../hooks/useQueryParams";
import { AvailabilityDivisionMap, EquipmentDivisionMap, InstitutionSizeMap } from "../utils/enums";
import { toInstitutionQueryParams, toInstitutionSearchParams } from "../utils/institution";
import {
  MunicipalityOptions,
  SupportedMunicipalityMap,
  convertMunicipalityToUrlParam,
} from "../utils/municipality";
import {
  AVAILABLE_INSTRUMENT_MAP,
  INSTITUTION_SIZE_MAP,
  buildFilterChips,
  toggleArrayParam,
} from "../utils/search";

export const COLUMNS: Columns<InstitutionSummary> = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    type: "getter",
    maxWidth: 400,
    valueGetter: (params) => `${params.row.building ?? ""} ${params.row.institution ?? ""}`,
  },
  {
    field: "municipality",
    headerName: "地区",
    type: "getter",
    hide: true,
    valueGetter: (params) => SupportedMunicipalityMap[params.value as string] || "",
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

const InstitutionPage = () => {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();

  const [values, setQueryParams] = useQueryParams(
    {
      m: StringParam,
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

  const {
    data: institutions,
    loading,
    error,
    hasNextPage: hasMore,
    fetchMore,
    fetchingMore,
  } = usePaginatedQuery<InstitutionSummary>(
    (_token, cursor) => fetchInstitutions(queryParams, cursor),
    JSON.stringify(queryParams)
  );

  const { municipality, availableInstruments, institutionSizes } = institutionSearchParams;

  const handleMunicipalityChange = useCallback(
    (event: SelectChangeEvent<string>): void => {
      setQueryParams({ m: convertMunicipalityToUrlParam(event.target.value) });
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
    ...(municipality === "all"
      ? []
      : [
          {
            label: `${MunicipalityOptions.find((o) => o.value === municipality)?.label}`,
            onDelete: () => setQueryParams({ m: null }),
          },
        ]),
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
            selectOptions={MunicipalityOptions}
            size="small"
            value={municipality}
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
      empty={!municipality || !institutions?.length}
      error={error}
      fetchMore={fetchMore}
      fetchingMore={fetchingMore}
      hasNextPage={hasMore}
      loading={loading}
      onRowClick={(params) => {
        if (params.row.id) {
          setLocation(ROUTES.detail.replace(":id", params.row.id));
        }
      }}
      rows={institutions ?? []}
    />
  );
};

export default InstitutionPage;
