import { useCallback, useMemo, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { NetworkStatus } from "@apollo/client";
import type { InstitutionsQuery } from "../api/gql/graphql";
import { InstitutionsDocument } from "../api/gql/graphql";
import { extractRelayParams, extractSinglePkFromRelayId } from "../utils/relay";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { DataTable, type Columns } from "../components/DataTable";
import { SearchForm } from "../components/SearchForm";
import { Select, type SelectChangeEvent } from "../components/Select";
import { Spinner } from "../components/Spinner";
import { ROUTES } from "../constants/routes";
import { CONTAINER_WIDTH, SEARCH_TABLE_HEIGHT } from "../constants/styles";
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
import { styled } from "../utils/theme";

export const COLUMNS: Columns<
  InstitutionsQuery["institutions_connection"]["edges"][number]["node"]
> = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    type: "getter",
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
    hideIfMobile: true,
    valueGetter: (params) => InstitutionSizeMap[params.value as string] || "",
  },
  {
    field: "is_available_strings",
    headerName: "弦楽器",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string] || "",
  },
  {
    field: "is_available_woodwind",
    headerName: "木管楽器",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string] || "",
  },
  {
    field: "is_available_brass",
    headerName: "金管楽器",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string] || "",
  },
  {
    field: "is_available_percussion",
    headerName: "打楽器",
    type: "getter",
    hideIfMobile: true,
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
    hideIfMobile: true,
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

  const { loading, data, error, fetchMore, networkStatus } = useQuery(InstitutionsDocument, {
    variables: toInstitutionQueryVariables(institutionSearchParams),
    notifyOnNetworkStatusChange: true,
  });

  if (error) {
    // TODO Snackbar を描画する
    throw new Error(error.message);
  }

  const {
    edges: institutions,
    endCursor,
    hasNextPage: hasMore,
  } = extractRelayParams(data?.institutions_connection);

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
      : [`${MunicipalityOptions.find((o) => o.value === municipality)?.label}`]),
    ...Object.entries(AVAILABLE_INSTRUMENT_MAP)
      .filter(([v]) => availableInstruments.includes(v as AvailableInstrument))
      .map(([, label]) => label),
    ...Object.entries(INSTUTITON_SIZE_MAP)
      .filter(([v]) => institutionSizes.includes(v as InstitutionSize))
      .map(([, label]) => label),
  ];

  return (
    <StyledInstitution className={classes.pageBox}>
      <div className={classes.searchBox}>
        <div className={classes.searchBoxForm}>
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
      <div className={classes.resultBox}>
        {loading && networkStatus !== NetworkStatus.fetchMore ? (
          <div className={classes.resultBoxNoData}>
            <Spinner />
          </div>
        ) : !municipality || !institutions?.length ? (
          <div className={classes.resultBoxNoData}>表示するデータが存在しません</div>
        ) : (
          <DataTable
            columns={COLUMNS}
            fetchMore={async () => {
              /* istanbul ignore next -- endCursor is always set when hasMore is true */
              if (!hasMore || !endCursor) return;
              await fetchMore({
                variables: {
                  after: endCursor,
                },
              });
            }}
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
    </StyledInstitution>
  );
};

const PREFIX = "Institution";
const classes = {
  pageBox: `${PREFIX}-pageBox`,
  searchBox: `${PREFIX}-searchBox`,
  searchBoxForm: `${PREFIX}-searchBoxForm`,
  resultBox: `${PREFIX}-resultBox`,
  resultBoxNoData: `${PREFIX}-resultBoxNoData`,
};

const StyledInstitution = styled("main")(({ theme }) => ({
  [`&.${classes.pageBox}`]: {
    padding: theme.spacing(5, 0),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(5),
    width: "100%",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(3, 0),
      gap: theme.spacing(3),
    },
  },
  [`.${classes.searchBox}`]: {
    marginInline: "auto",
    padding: theme.spacing(3),
    width: "100%",
    maxWidth: CONTAINER_WIDTH,
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    [theme.breakpoints.down("sm")]: {
      marginInline: 0,
      padding: theme.spacing(1),
      borderRadius: 0,
    },
  },
  [`.${classes.searchBoxForm}`]: {
    display: "flex",
    flexWrap: "nowrap",
    gap: theme.spacing(3, 5),
  },
  [`.${classes.resultBox}`]: {
    marginInline: "auto",
    width: "100%",
    maxWidth: CONTAINER_WIDTH,
    [theme.breakpoints.up("md")]: {
      height: SEARCH_TABLE_HEIGHT,
      ".MuiTableContainer-root": {
        maxHeight: SEARCH_TABLE_HEIGHT,
      },
    },
    [theme.breakpoints.down("sm")]: {
      marginInline: 0,
    },
  },
  [`.${classes.resultBoxNoData}`]: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}));
