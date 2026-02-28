import { useCallback, useMemo, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  INSTITUTIONS_QUERY,
  type InstitutionNode,
  type InstitutionsQueryData,
} from "../api/queries";
import { usePaginatedQuery } from "../hooks/usePaginatedQuery";
import { extractSinglePkFromRelayId } from "../utils/relay";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { DataTable, type Columns } from "../components/DataTable";
import { SearchForm } from "../components/SearchForm";
import { Select, type SelectChangeEvent } from "../components/Select";
import { Spinner } from "../components/Spinner";
import { ROUTES } from "../constants/routes";
import { ArrayParam, StringParam, useQueryParams } from "../hooks/useQueryParams";
import { AvailabilityDivisionMap, EquipmentDivisionMap, InstitutionSizeMap } from "../utils/enums";
import { toInstitutionQueryVariables, toInstitutionSearchParams } from "../utils/institution";
import {
  MunicipalityOptions,
  SupportedMunicipalityMap,
  convertMunicipalityToUrlParam,
} from "../utils/municipality";
import {
  AVAILABLE_INSTRUMENT_MAP,
  INSTUTITON_SIZE_MAP,
  type AvailableInstrument,
  type InstitutionSize,
} from "../utils/search";
import styles from "./Institution.module.css";

export const COLUMNS: Columns<InstitutionNode> = [
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

export default () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setQueryParams] = useQueryParams(
    {
      m: StringParam,
      a: ArrayParam,
      i: ArrayParam,
    },
    navigate,
    location
  );

  const institutionSearchParams = useMemo(
    () => toInstitutionSearchParams(values.m, values.a, values.i),
    [values]
  );

  const {
    data: institutions,
    loading,
    error,
    hasNextPage: hasMore,
    fetchMore,
    fetchingMore,
  } = usePaginatedQuery<InstitutionsQueryData, InstitutionNode>(
    INSTITUTIONS_QUERY,
    toInstitutionQueryVariables(institutionSearchParams),
    (d) => d.institutions_connection
  );

  if (error) {
    // TODO Snackbar を描画する
    throw new Error(error.message);
  }

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
        ) : !municipality || !institutions?.length ? (
          <div className={styles["resultBoxNoData"]}>表示するデータが存在しません</div>
        ) : (
          <DataTable
            columns={COLUMNS}
            fetchMore={fetchMore}
            hasNextPage={hasMore}
            onRowClick={(params) => {
              const institutionId = extractSinglePkFromRelayId(params.row.id);
              if (institutionId) {
                navigate(ROUTES.detail.replace(":id", institutionId as string));
              }
            }}
            rows={institutions}
          />
        )}
      </div>
    </main>
  );
};
