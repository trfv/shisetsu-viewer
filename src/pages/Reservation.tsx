import { max, min } from "date-fns";
import { addMonths, endOfMonth } from "date-fns/esm";
import { ChangeEvent, MouseEvent, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { useReservationsQuery } from "../api/graphql-client";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { Columns, DataTable } from "../components/DataTable";
import { DateRangePicker } from "../components/DateRangePicker";
import { Select, SelectChangeEvent } from "../components/Select";
import { Spinner } from "../components/Spinner";
import { ROUTES } from "../constants/routes";
import {
  CONTAINER_WIDTH,
  INNER_WIDTH,
  MAIN_HEIGHT,
  SEARCH_TABLE_HEIGHT,
} from "../constants/styles";
import {
  DateParam,
  NumberParam,
  StringParam,
  StringsParam,
  useQueryParams,
} from "../hooks/useQueryParams";
import {
  convertMunicipalityToUrlParam,
  MunicipalityOptions,
  SupportedMunicipality,
  SupportedMunicipalityMap,
} from "../utils/municipality";
import {
  formatReservationMap,
  IS_ONLY_AFTERNOON_VACANT,
  IS_ONLY_EVENING_VACANT,
  IS_ONLY_HOLIDAY,
  IS_ONLY_MORNING_VACANT,
  ReservationSearchFilter,
  toReservationQueryVariables,
  toReservationSearchParams,
} from "../utils/reservation";
import { styled } from "../utils/theme";

const minDate = new Date();
const maxDate = addMonths(endOfMonth(new Date()), 6);

const COLUMNS: Columns = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    width: 360,
    type: "getter",
    valueGetter: (params) =>
      `${params.row.building_system_name ?? ""} ${params.row.institution_system_name ?? ""}`,
  },
  {
    field: "municipality",
    headerName: "地区",
    width: 120,
    hide: true,
    type: "getter",
    valueGetter: (params) => SupportedMunicipalityMap[params.value as string],
  },
  {
    field: "date",
    headerName: "日付",
    width: 160,
    type: "date",
  },
  {
    field: "reservation",
    headerName: "予約状況",
    width: 520,
    type: "getter",
    valueGetter: (params) => {
      const municipality = params.row.municipality as SupportedMunicipality;
      const obj = params.row.reservation as Record<string, string>;
      return formatReservationMap(municipality, obj);
    },
    /** TODO hover したときに中身がすべて表示されるように修正する */
  },
  {
    field: "created_at",
    headerName: "取得日時",
    width: 200,
    type: "datetime",
  },
];

export default () => {
  const history = useHistory();

  const [values, setQueryParams] = useQueryParams(history, {
    p: NumberParam,
    m: StringParam,
    df: DateParam,
    dt: DateParam,
    f: StringsParam,
  });

  const resevationSearchParams = toReservationSearchParams(
    values.p,
    values.m,
    values.df,
    values.dt,
    values.f,
    minDate,
    maxDate
  );
  const { loading, data, error } = useReservationsQuery({
    variables: toReservationQueryVariables(resevationSearchParams),
  });

  if (error) {
    throw new Error(error.message);
  }

  const { page, municipality, startDate, endDate, filter } = resevationSearchParams;

  const handleMunicipalityChange = useCallback((event: SelectChangeEvent<string>): void => {
    setQueryParams({ p: 0, m: convertMunicipalityToUrlParam(event.target.value) });
  }, []);

  const handleStartDateChange = useCallback(
    (date: Date | null): void => {
      setQueryParams({ p: 0, df: date, dt: min([maxDate, max([date ?? endDate, endDate])]) });
    },
    [maxDate, endDate]
  );

  const handleEndDateChange = useCallback(
    (date: Date | null): void => {
      setQueryParams({ p: 0, df: max([minDate, min([date ?? startDate, startDate])]), dt: date });
    },
    [minDate, startDate]
  );

  const handleFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? filter.concat(value as ReservationSearchFilter)
        : filter.filter((v) => v !== value);
      setQueryParams({ p: 0, f: next });
    },
    [filter]
  );

  const handleChangePage = useCallback(
    (_: MouseEvent<HTMLButtonElement> | null, page: number): void => {
      setQueryParams({ p: page });
    },
    []
  );

  return (
    <StyledReservation className={classes.pageBox}>
      <div className={classes.searchBox}>
        <div className={classes.searchBoxForm}>
          <Select
            label="区"
            value={municipality}
            size="small"
            onChange={handleMunicipalityChange}
            selectOptions={MunicipalityOptions}
          />
          <DateRangePicker
            label="期間指定"
            startDateProps={{
              value: startDate,
              onChange: handleStartDateChange,
              minDate,
              maxDate,
            }}
            endDateProps={{
              value: endDate,
              onChange: handleEndDateChange,
              minDate,
              maxDate,
            }}
          />
          <CheckboxGroup label="絞り込み" values={filter} onChange={handleFilterChange}>
            <Checkbox label="休日のみ" value={IS_ONLY_HOLIDAY} />
            <Checkbox label="午前空き" value={IS_ONLY_MORNING_VACANT} />
            <Checkbox label="午後空き" value={IS_ONLY_AFTERNOON_VACANT} />
            <Checkbox label="夜間空き" value={IS_ONLY_EVENING_VACANT} />
          </CheckboxGroup>
        </div>
      </div>
      <div className={classes.resultBox}>
        {loading ? (
          <div className={classes.resultBoxNoData}>
            <Spinner />
          </div>
        ) : !municipality || !data?.reservations?.length ? (
          <div className={classes.resultBoxNoData} />
        ) : (
          <DataTable
            rows={data.reservations}
            columns={COLUMNS}
            onRowClick={(params) =>
              params.row.institution_id &&
              history.push(ROUTES.detail.replace(":id", params.row.institution_id as string))
            }
            rowCount={data?.reservations_aggregate.aggregate?.count ?? 0}
            page={page}
            onPageChange={handleChangePage}
          />
        )}
      </div>
    </StyledReservation>
  );
};

const PREFIX = "Reservation";
const classes = {
  pageBox: `${PREFIX}-pageBox`,
  searchBox: `${PREFIX}-searchBox`,
  searchBoxForm: `${PREFIX}-searchBoxForm`,
  resultBox: `${PREFIX}-resultBox`,
  resultBoxNoData: `${PREFIX}-resultBoxNoData`,
};

const StyledReservation = styled("main")(({ theme }) => ({
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
