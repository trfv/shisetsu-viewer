import { ChangeEvent, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { InstitutionsQuery, useInstitutionsQuery } from "../api/graphql-client";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { Columns, DataTable } from "../components/DataTable";
import { SearchForm } from "../components/SearchForm";
import { Select, SelectChangeEvent } from "../components/Select";
import { Spinner } from "../components/Spinner";
import { ROUTES } from "../constants/routes";
import {
  CONTAINER_WIDTH,
  SEARCH_TABLE_HEIGHT,
  SEARCH_TABLE_HEIGHT_MOBILE,
} from "../constants/styles";
import { ArrayParam, StringParam, useQueryParams } from "../hooks/useQueryParams";
import { AvailabilityDivisionMap, EquipmentDivisionMap, InstitutionSizeMap } from "../utils/enums";
import { toInstitutionQueryVariables, toInstitutionSearchParams } from "../utils/institution";
import {
  convertMunicipalityToUrlParam,
  MunicipalityOptions,
  SupportedMunicipalityMap,
} from "../utils/municipality";
import {
  AvailableInstrument,
  AVAILABLE_INSTRUMENT_MAP,
  InstitutionSize,
  INSTUTITON_SIZE_MAP,
} from "../utils/search";
import { styled } from "../utils/theme";

const COLUMNS: Columns<InstitutionsQuery["institutions"][number]> = [
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
    valueGetter: (params) => SupportedMunicipalityMap[params.value as string],
  },
  {
    field: "institution_size",
    headerName: "施設サイズ",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => InstitutionSizeMap[params.value as string],
  },
  {
    field: "is_available_strings",
    headerName: "弦楽器",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_available_woodwind",
    headerName: "木管楽器",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_available_brass",
    headerName: "金管楽器",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_available_percussion",
    headerName: "打楽器",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_equipped_music_stand",
    headerName: "譜面台",
    type: "getter",
    hide: true,
    valueGetter: (params) => EquipmentDivisionMap[params.value as string],
  },
  {
    field: "is_equipped_piano",
    headerName: "ピアノ",
    type: "getter",
    hide: true,
    valueGetter: (params) => EquipmentDivisionMap[params.value as string],
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

  const [values, setQueryParams] = useQueryParams({
    m: StringParam,
    a: ArrayParam,
    i: ArrayParam,
  });

  const institutionSearchParams = useMemo(
    () => toInstitutionSearchParams(values.m, values.a, values.i),
    [values]
  );

  const { loading, data, error, fetchMore } = useInstitutionsQuery({
    variables: toInstitutionQueryVariables(institutionSearchParams),
  });

  if (error) {
    throw new Error(error.message);
  }

  const { municipality, availableInstruments, institutionSizes } = institutionSearchParams;

  const handleMunicipalityChange = useCallback((event: SelectChangeEvent<string>): void => {
    setQueryParams({ m: convertMunicipalityToUrlParam(event.target.value) });
  }, []);

  const handleAvailableInstrumentsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? availableInstruments.concat(value as AvailableInstrument)
        : availableInstruments.filter((v) => v !== value);
      setQueryParams({ a: next });
    },
    [availableInstruments]
  );

  const handleInstitutoinSizesChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? institutionSizes.concat(value as InstitutionSize)
        : institutionSizes.filter((v) => v !== value);
      setQueryParams({ i: next });
    },
    [institutionSizes]
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
              label="区"
              value={municipality}
              size="small"
              onChange={handleMunicipalityChange}
              selectOptions={MunicipalityOptions}
            />
            <CheckboxGroup
              label="利用可能楽器"
              values={availableInstruments}
              onChange={handleAvailableInstrumentsChange}
            >
              {Object.entries(AVAILABLE_INSTRUMENT_MAP).map(([value, label]) => (
                <Checkbox key={value} label={label} value={value} />
              ))}
            </CheckboxGroup>
            <CheckboxGroup
              label="施設サイズ"
              values={institutionSizes}
              onChange={handleInstitutoinSizesChange}
            >
              {Object.entries(INSTUTITON_SIZE_MAP).map(([value, label]) => (
                <Checkbox key={value} label={label} value={value} />
              ))}
            </CheckboxGroup>
          </SearchForm>
        </div>
      </div>
      <div className={classes.resultBox}>
        {loading ? (
          <div className={classes.resultBoxNoData}>
            <Spinner />
          </div>
        ) : !municipality || !data?.institutions?.length ? (
          <div className={classes.resultBoxNoData}>表示するデータが存在しません</div>
        ) : (
          <DataTable
            rows={data?.institutions ?? []}
            columns={COLUMNS}
            onRowClick={(params) =>
              params.row.id && navigate(ROUTES.detail.replace(":id", params.row.id as string))
            }
            fetchMore={async () => {
              fetchMore({
                variables: {
                  offset: data?.institutions.length,
                },
              });
            }}
            hasNextPage={data.institutions.length !== data?.institutions_aggregate.aggregate?.count} // Relay Styleにするときに直す
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
    height: SEARCH_TABLE_HEIGHT,
    maxWidth: CONTAINER_WIDTH,
    ".MuiTableContainer-root": {
      maxHeight: SEARCH_TABLE_HEIGHT,
    },
    [theme.breakpoints.down("sm")]: {
      marginInline: 0,
      height: SEARCH_TABLE_HEIGHT_MOBILE,
      ".MuiTableContainer-root": {
        maxHeight: SEARCH_TABLE_HEIGHT_MOBILE,
      },
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
