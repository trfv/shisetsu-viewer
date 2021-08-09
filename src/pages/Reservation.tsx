import { useQuery } from "@apollo/client";
import { addMonths, endOfMonth } from "date-fns";
import React, { ChangeEvent, FC, useCallback, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  ReservationDocument,
  ReservationQuery,
  ReservationQueryVariables,
} from "../api/graphql-client";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import {
  DataGrid,
  GridColumns,
  GridValueFormatterParams,
  GridValueGetterParams,
} from "../components/DataGrid";
import { DateRangePicker } from "../components/DateRangePicker";
import { Select, SelectChangeEvent } from "../components/Select";
import { TOKEN } from "../components/utils/AuthGuardRoute";
import { TokyoWardMap } from "../constants/enums";
import { ROUTES } from "../constants/routes";
import { END_DATE, PAGE, ROWS_PER_PAGE, START_DATE, TOKYO_WARD } from "../constants/search";
import { CONTAINER_WIDTH, INNER_WIDTH, MAIN_HEIGHT } from "../constants/styles";
import { SupportedTokyoWard, TokyoWardOptions } from "../utils/enums";
import { formatDate, formatDatetime } from "../utils/format";
import {
  formatReservationMap,
  IS_ONLY_AFTERNOON_VACANT,
  IS_ONLY_EVENING_VACANT,
  IS_ONLY_HOLIDAY,
  IS_ONLY_MORNING_VACANT,
  ReservationSearchFilter,
  RESERVATION_SEARCH_FILTER,
  toReservationQueryVariables,
  toReservationSearchParams,
} from "../utils/reservation";
import { convertTokyoWardToUrlParam, setUrlSearchParams } from "../utils/search";
import { styled } from "../utils/theme";

const minDate = new Date();
const maxDate = addMonths(endOfMonth(new Date()), 6);

const COLUMNS: GridColumns = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    width: 360,
    flex: 0,
    sortable: false,
    valueGetter: (params: GridValueGetterParams) =>
      `${params.row.building ?? ""} ${params.row.institution ?? ""}`,
  },
  {
    field: "tokyo_ward",
    headerName: "区",
    width: 120,
    flex: 0,
    hide: true,
    valueFormatter: (params: GridValueFormatterParams) => TokyoWardMap[params.value as string],
  },
  {
    field: "date",
    headerName: "日付",
    width: 160,
    flex: 0,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) => formatDate(params.value as string),
  },
  {
    field: "reservation",
    headerName: "予約状況",
    width: 520,
    flex: 0,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) => {
      const tokyoWard = params.row.tokyo_ward;
      const obj = params.row.reservation;
      return formatReservationMap(tokyoWard, obj);
    },
    /** TODO hover したときに中身がすべて表示されるように修正する */
  },
  {
    field: "updated_at",
    headerName: "更新日時",
    width: 200,
    flex: 0,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) => formatDatetime(params.value as string),
  },
];

export const Reservation: FC = () => {
  const history = useHistory();

  const urlSearchParams = useRef<URLSearchParams>(new URLSearchParams(history.location.search));
  const [resevationSearchParams, setReservationSearchParams] = useState(
    toReservationSearchParams(urlSearchParams.current, minDate, maxDate)
  );
  const { loading, data, error } = useQuery<ReservationQuery, ReservationQueryVariables>(
    ReservationDocument,
    {
      variables: toReservationQueryVariables(resevationSearchParams),
      context: {
        headers: {
          Authorization: TOKEN ? `Bearer ${TOKEN}` : "",
        },
      },
    }
  );

  const { page, tokyoWard, startDate, endDate, filter } = resevationSearchParams;

  const updateUrlSearchParams = useCallback((nextUrlSearchParams: URLSearchParams) => {
    history.replace({
      pathname: history.location.pathname,
      search: nextUrlSearchParams.toString(),
    });
    urlSearchParams.current = nextUrlSearchParams;
  }, []);

  const handleTokyoWardChange = useCallback((event: SelectChangeEvent<unknown>): void => {
    const value = event.target.value as SupportedTokyoWard;
    setReservationSearchParams((prevState) => ({ ...prevState, page: 0, tokyoWard: value }));
    updateUrlSearchParams(
      setUrlSearchParams(
        urlSearchParams.current,
        { [TOKYO_WARD]: convertTokyoWardToUrlParam(value) },
        [PAGE]
      )
    );
  }, []);

  const handleStartDateChange = useCallback((date: Date | null): void => {
    setReservationSearchParams((prevState) => ({
      ...prevState,
      page: 0,
      startDate: date,
    }));
    updateUrlSearchParams(
      setUrlSearchParams(urlSearchParams.current, { [START_DATE]: date?.toLocaleDateString() }, [
        PAGE,
      ])
    );
  }, []);

  const handleEndDateChange = useCallback((date: Date | null): void => {
    setReservationSearchParams((prevState) => ({
      ...prevState,
      page: 0,
      endDate: date,
    }));
    updateUrlSearchParams(
      setUrlSearchParams(urlSearchParams.current, { [END_DATE]: date?.toLocaleDateString() }, [
        PAGE,
      ])
    );
  }, []);

  const handleFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? filter.concat(value as ReservationSearchFilter)
        : filter.filter((v) => v !== value);
      setReservationSearchParams((prevState) => ({
        ...prevState,
        page: 0,
        filter: next,
      }));
      updateUrlSearchParams(
        setUrlSearchParams(urlSearchParams.current, { [RESERVATION_SEARCH_FILTER]: next }, [
          PAGE,
          RESERVATION_SEARCH_FILTER,
        ])
      );
    },
    [filter]
  );

  const handleChangePage = useCallback((page: number): void => {
    setReservationSearchParams((prevState) => ({
      ...prevState,
      page,
    }));
    updateUrlSearchParams(
      setUrlSearchParams(urlSearchParams.current, { [PAGE]: String(page) }, [PAGE])
    );
  }, []);

  return (
    <StyledReservation className={classes.pageBox}>
      <div className={classes.searchBox}>
        <div className={classes.searchBoxForm}>
          <Select
            label="区"
            value={tokyoWard}
            size="small"
            onChange={handleTokyoWardChange}
            selectOptions={TokyoWardOptions}
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
        <DataGrid
          rows={data?.reservation ?? []}
          columns={COLUMNS}
          error={error}
          loading={loading}
          onRowClick={(params) =>
            params.row.institution_id &&
            history.push(ROUTES.institutionDetail.replace(":id", params.row.institution_id))
          }
          paginationMode="server"
          rowCount={data?.reservation_aggregate.aggregate?.count ?? undefined}
          page={page}
          pageSize={ROWS_PER_PAGE}
          pagination={true}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[]}
          // components={{
          //   Toolbar: CustomToolbar,
          // }}
          disableColumnMenu={true}
          disableSelectionOnClick={true}
          density="compact"
        />
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
    ".MuiDataGrid-columnHeader:focus": {
      outline: "none",
    },
    ".MuiDataGrid-columnHeader:focus-within": {
      outline: "none",
    },
    ".MuiDataGrid-row:hover": {
      cursor: "pointer",
    },
    ".MuiDataGrid-cell:focus-within": {
      outline: "none",
    },
  },
}));
