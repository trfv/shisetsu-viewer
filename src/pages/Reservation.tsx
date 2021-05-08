import { useQuery } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import { addMonths, endOfMonth, isAfter, isBefore } from "date-fns";
import React, { ChangeEvent, FC, useCallback, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  ReservationDocument,
  ReservationQuery,
  ReservationQueryVariables,
} from "../api/graphql-client";
import { BaseBox } from "../components/Box";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import {
  DataGrid,
  GridColumns,
  GridPageChangeParams,
  GridValueFormatterParams,
  GridValueGetterParams,
} from "../components/DataGrid";
import { DateRangePicker } from "../components/DateRangePicker";
import { Select } from "../components/Select";
import { TokyoWardMap } from "../constants/enums";
import { ROUTES } from "../constants/routes";
import {
  END_DATE,
  PAGE,
  ROWS_PER_PAGE,
  ROWS_PER_PAGE_OPTIONS,
  START_DATE,
  TOKYO_WARD,
} from "../constants/search";
import { CONTAINER_WIDTH, INNER_WIDTH } from "../constants/styles";
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

const useStyles = makeStyles(({ palette, shape }) => ({
  pageBox: {
    width: "100%",
    minWidth: CONTAINER_WIDTH,
  },
  searchBox: {
    margin: "40px auto 0",
    display: "flex",
    width: INNER_WIDTH,
    background: palette.grey[300],
    borderRadius: shape.borderRadius,
    "& > *": {
      margin: "24px",
    },
  },
  resultBox: {
    margin: "40px auto 0",
    width: INNER_WIDTH,
    height: 640,
    "& .MuiDataGrid-row:hover": {
      cursor: "pointer",
    },
    "& .MuiDataGrid-cell:focus-within": {
      outline: "none",
    },
  },
}));

const minDate = new Date();
const maxDate = addMonths(endOfMonth(new Date()), 6);

const COLUMNS: GridColumns = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    width: 360,
    flex: 0,
    valueGetter: (params: GridValueGetterParams) =>
      `${params.row.building ?? ""} ${params.row.institution ?? ""}`,
  },
  {
    field: "tokyo_ward",
    headerName: "東京都区",
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
  const classes = useStyles();
  const history = useHistory();

  const urlSearchParams = useRef<URLSearchParams>(new URLSearchParams(history.location.search));
  const [resevationSearchParams, setReservationSearchParams] = useState(
    toReservationSearchParams(urlSearchParams.current, minDate, maxDate)
  );
  const { loading, data, error } = useQuery<ReservationQuery, ReservationQueryVariables>(
    ReservationDocument,
    {
      variables: toReservationQueryVariables(resevationSearchParams),
    }
  );

  const { page, rowsPerPage, tokyoWard, startDate, endDate, filter } = resevationSearchParams;

  const updateUrlSearchParams = useCallback((nextUrlSearchParams: URLSearchParams) => {
    history.replace({
      pathname: history.location.pathname,
      search: nextUrlSearchParams.toString(),
    });
    urlSearchParams.current = nextUrlSearchParams;
  }, []);

  const handleTokyoWardChange = useCallback((event: ChangeEvent<{ value: unknown }>): void => {
    const value = event.target.value as SupportedTokyoWard;
    setReservationSearchParams((prevState) => ({ ...prevState, page: 0, tokyoWard: value }));
    updateUrlSearchParams(
      setUrlSearchParams(
        urlSearchParams.current,
        [[TOKYO_WARD, convertTokyoWardToUrlParam(value)]],
        [PAGE]
      )
    );
  }, []);

  const handleStartDateChange = useCallback((date: Date | null): void => {
    const needsUpdateEndDate = date && endDate && isAfter(date, endDate);
    setReservationSearchParams((prevState) => ({
      ...prevState,
      page: 0,
      startDate: date,
      ...(needsUpdateEndDate ? { endDate: date } : {}),
    }));
    const appendParams: [string, string | undefined][] = [[START_DATE, date?.toLocaleDateString()]];
    updateUrlSearchParams(
      setUrlSearchParams(
        urlSearchParams.current,
        needsUpdateEndDate
          ? appendParams.concat([END_DATE, date?.toLocaleDateString()])
          : appendParams,
        [PAGE]
      )
    );
  }, []);

  const handleEndDateChange = useCallback((date: Date | null): void => {
    const needsUpdateStartDate = date && startDate && isBefore(date, startDate);
    setReservationSearchParams((prevState) => ({
      ...prevState,
      page: 0,
      endDate: date,
      ...(needsUpdateStartDate ? { endDate: date } : {}),
    }));
    const appendParams: [string, string | undefined][] = [[END_DATE, date?.toLocaleDateString()]];
    updateUrlSearchParams(
      setUrlSearchParams(
        urlSearchParams.current,
        needsUpdateStartDate
          ? appendParams.concat([START_DATE, date?.toLocaleDateString()])
          : appendParams,
        []
      )
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
        setUrlSearchParams(
          urlSearchParams.current,
          next.map((f) => [RESERVATION_SEARCH_FILTER, f]),
          [PAGE]
        )
      );
    },
    [filter]
  );

  const handleChangePage = useCallback((params: GridPageChangeParams): void => {
    setReservationSearchParams((prevState) => ({
      ...prevState,
      page: params.page,
    }));
    updateUrlSearchParams(
      setUrlSearchParams(urlSearchParams.current, [[PAGE, String(params.page)]], [PAGE])
    );
  }, []);

  const handleChangeRowsPerPage = useCallback((params: GridPageChangeParams): void => {
    setReservationSearchParams((prevState) => ({
      ...prevState,
      rowsPerPage: params.pageSize,
      page: 0,
    }));
    updateUrlSearchParams(
      setUrlSearchParams(
        urlSearchParams.current,
        [[ROWS_PER_PAGE, String(params.pageSize)]],
        [PAGE, ROWS_PER_PAGE]
      )
    );
  }, []);

  return (
    <main className={classes.pageBox}>
      <BaseBox className={classes.searchBox}>
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
      </BaseBox>
      <BaseBox className={classes.resultBox}>
        <DataGrid
          rows={data?.reservation ?? []}
          columns={COLUMNS}
          error={error}
          loading={loading}
          onRowClick={(params) =>
            history.push(ROUTES.institutionDetail.replace(":id", params.row.institution_id))
          }
          paginationMode="server"
          rowCount={data?.reservation_aggregate.aggregate?.count ?? undefined}
          page={page}
          pageSize={rowsPerPage}
          pagination={true}
          onPageChange={handleChangePage}
          onPageSizeChange={handleChangeRowsPerPage}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          // components={{
          //   Toolbar: CustomToolbar,
          // }}
          disableColumnMenu={true}
          disableSelectionOnClick={true}
          density="compact"
        />
      </BaseBox>
    </main>
  );
};
