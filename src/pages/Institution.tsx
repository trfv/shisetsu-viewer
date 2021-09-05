import { ChangeEvent, MouseEvent, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { useInstitutionsQuery } from "../api/graphql-client";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { Columns, DataTable } from "../components/DataTable";
import { Select, SelectChangeEvent } from "../components/Select";
import { Spinner } from "../components/Spinner";
import { ROUTES } from "../constants/routes";
import {
  CONTAINER_WIDTH,
  INNER_WIDTH,
  MAIN_HEIGHT,
  SEARCH_TABLE_HEIGHT,
} from "../constants/styles";
import { NumberParam, StringParam, StringsParam, useQueryParams } from "../hooks/useQueryParams";
import { AvailabilityDivisionMap, EquipmentDivisionMap } from "../utils/enums";
import {
  AvailableInstrument,
  BRASS,
  formatUsageFee,
  PERCUSSION,
  STRINGS,
  toInstitutionQueryVariables,
  toInstitutionSearchParams,
  WOODWIND,
} from "../utils/institution";
import {
  convertMunicipalityToUrlParam,
  MunicipalityOptions,
  SupportedMunicipalityMap,
} from "../utils/municipality";
import { styled } from "../utils/theme";

const COLUMNS: Columns = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    width: 360,

    type: "getter",
    valueGetter: (params) => `${params.row.building ?? ""} ${params.row.institution ?? ""}`,
  },
  {
    field: "municipality",
    headerName: "区",
    width: 120,

    hide: true,
    type: "getter",
    valueGetter: (params) => SupportedMunicipalityMap[params.value as string],
  },
  {
    field: "capacity",
    headerName: "定員（人）",
    width: 140,

    type: "number",
  },
  {
    field: "area",
    headerName: "面積（㎡）",
    width: 140,

    type: "number",
  },
  {
    field: "weekday_usage_fee",
    headerName: "利用料金（平日）",
    width: 480,

    hide: true,
    type: "getter",
    valueGetter: (params) =>
      formatUsageFee(
        params.row.municipality as string,
        params.value as { division: string; fee: string }[]
      ),
  },
  {
    field: "holiday_usage_fee",
    headerName: "利用料金（休日）",
    width: 480,

    hide: true,
    type: "getter",
    valueGetter: (params) =>
      formatUsageFee(
        params.row.municipality as string,
        params.value as { division: string; fee: string }[]
      ),
  },
  { field: "address", headerName: "住所", width: 240, hide: true, type: "string" },
  {
    field: "is_available_strings",
    headerName: "弦楽器",
    width: 100,
    type: "getter",
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_available_woodwind",
    headerName: "木管楽器",
    width: 100,
    type: "getter",
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_available_brass",
    headerName: "金管楽器",
    width: 100,
    type: "getter",
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_available_percussion",
    headerName: "打楽器",
    width: 100,
    type: "getter",
    valueGetter: (params) => AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_equipped_music_stand",
    headerName: "譜面台",
    width: 100,
    hide: true,
    type: "getter",
    valueGetter: (params) => EquipmentDivisionMap[params.value as string],
  },
  {
    field: "is_equipped_piano",
    headerName: "ピアノ",
    width: 100,
    hide: true,
    type: "getter",
    valueGetter: (params) => EquipmentDivisionMap[params.value as string],
  },
  {
    field: "updated_at",
    headerName: "更新日時",
    width: 200,
    type: "datetime",
  },
];

export default () => {
  const history = useHistory();

  const [values, setQueryParams] = useQueryParams(history, {
    p: NumberParam,
    m: StringParam,
    a: StringsParam,
  });

  const institutionSearchParams = toInstitutionSearchParams(values.p, values.m, values.a);
  const { loading, data, error } = useInstitutionsQuery({
    variables: toInstitutionQueryVariables(institutionSearchParams),
  });

  if (error) {
    throw new Error(error.message);
  }

  const { page, municipality, availableInstruments } = institutionSearchParams;

  const handleMunicipalityChange = useCallback((event: SelectChangeEvent<string>): void => {
    setQueryParams({ p: 0, m: convertMunicipalityToUrlParam(event.target.value) });
  }, []);

  const handleAvailableInstrumentsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? availableInstruments.concat(value as AvailableInstrument)
        : availableInstruments.filter((v) => v !== value);
      setQueryParams({ p: 0, a: next });
    },
    [availableInstruments]
  );

  const handleChangePage = useCallback(
    (_: MouseEvent<HTMLButtonElement> | null, page: number): void => {
      setQueryParams({ p: page });
    },
    []
  );

  return (
    <StyledInstitution className={classes.pageBox}>
      <div className={classes.searchBox}>
        <div className={classes.searchBoxForm}>
          <Select
            label="区"
            value={municipality}
            size="small"
            onChange={handleMunicipalityChange}
            selectOptions={MunicipalityOptions}
          />
          {/* <Input label="定員下限（人）" defaultValue="" size="small" /> */}
          {/* <Input label="面積下限（㎡）" defaultValue="" size="small" /> */}
          <CheckboxGroup
            label="利用可能楽器"
            values={availableInstruments}
            onChange={handleAvailableInstrumentsChange}
          >
            <Checkbox label="弦楽器" value={STRINGS} />
            <Checkbox label="木管楽器" value={WOODWIND} />
            <Checkbox label="金管楽器" value={BRASS} />
            <Checkbox label="打楽器" value={PERCUSSION} />
          </CheckboxGroup>
        </div>
        {/* <div className={classes.searchBoxButtons}>
          <SmallButton color="primary" variant="contained">
            検索
          </SmallButton>
          <SmallButton>クリア</SmallButton>
        </div> */}
      </div>
      <div className={classes.resultBox}>
        {loading ? (
          <div className={classes.resultBoxNoData}>
            <Spinner />
          </div>
        ) : !municipality || !data?.institutions?.length ? (
          <div className={classes.resultBoxNoData} />
        ) : (
          <DataTable
            rows={data?.institutions ?? []}
            columns={COLUMNS}
            onRowClick={(params) =>
              params.row.id && history.push(ROUTES.detail.replace(":id", params.row.id as string))
            }
            rowCount={data?.institutions_aggregate.aggregate?.count ?? 0}
            page={page}
            onPageChange={handleChangePage}
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
    paddingTop: 40,
    display: "flex",
    flexDirection: "column",
    gap: 40,
    width: "100%",
    minWidth: CONTAINER_WIDTH,
    height: MAIN_HEIGHT,
  },
  [`.${classes.searchBox}`]: {
    marginInline: "auto",
    padding: 24,
    width: INNER_WIDTH,
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
  },
  [`.${classes.searchBoxForm}`]: {
    display: "flex",
    gap: 40,
  },
  [`.${classes.resultBox}`]: {
    marginInline: "auto",
    width: INNER_WIDTH,
    height: "100%",
    ".MuiTableContainer-root": {
      maxHeight: SEARCH_TABLE_HEIGHT,
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
