import { useQuery } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import { addDays, addMonths, isAfter, isBefore, isValid } from "date-fns";
import React, { ChangeEvent, FC, MouseEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import {
  ReservationDocument,
  ReservationQuery,
  ReservationQueryVariables,
} from "../api/graphql-client";
import { BaseBox } from "../components/Box";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { DateRangePicker } from "../components/DateRangePicker";
import { Select } from "../components/Select";
import { Skeleton } from "../components/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "../components/Table";
import { TablePagination } from "../components/TablePagination";
import { DayOfWeek, ReservationDivision, ReservationStatus, TokyoWard } from "../constants/enums";
import { ROUTES } from "../constants/routes";
import { ROW_PER_PAGE_OPTION } from "../constants/search";
import { COLORS, CONTAINER_WIDTH, INNER_WIDTH } from "../constants/styles";
import { isValidUUID } from "../utils/common";
import {
  convertTokyoWardToUrlParam,
  getTokyoWardFromUrlParam,
  SupportedTokyoWards,
} from "../utils/enums";
import { formatDate, formatDatetime } from "../utils/format";
import { formatReservationMap } from "../utils/reservation";

const useStyles = makeStyles(() => ({
  pageBox: {
    width: "100%",
    minWidth: CONTAINER_WIDTH,
  },
  searchBox: {
    margin: "40px auto 0",
    width: INNER_WIDTH,
    background: COLORS.GRAY,
    borderRadius: "4px",
    "& > *": {
      margin: "24px",
    },
  },
  resultBox: {
    margin: "24px auto 40px",
    width: INNER_WIDTH,
  },
}));

const now = new Date();
const minDate = now;
const maxDate = addDays(now, 181);

const getInitialDateFromUrlParam = (date: string | null | undefined): Date | null => {
  if (!date || !isValid(new Date(date))) {
    return null;
  }
  const tmp = new Date(date);
  return isBefore(tmp, minDate) || isAfter(tmp, maxDate) ? null : tmp;
};

const getFilterFromUrlParam = (filters: string[]): string[] => {
  return filters
    .map((f) => {
      if (f === "oh") {
        return "onlyHoliday";
      }
      if (f === "m") {
        return ReservationDivision.MORNING;
      }
      if (f === "a") {
        return ReservationDivision.AFTERNOON;
      }
      if (f === "e") {
        return ReservationDivision.EVENING;
      }
      return "";
    })
    .filter((f) => !!f);
};

const convertFilterToUrlParam = (filter: string): string => {
  return filter === "onlyHoliday"
    ? "oh"
    : filter.replace("RESERVATION_DIVISION_", "").slice(0, 1).toLowerCase();
};

const getPageFromUrlParam = (page: string | null | undefined) => {
  return parseInt(page ?? "0", 10);
};

const getRowPerPageFromUrlParam = (rowPerPage: string | null | undefined) => {
  if (!rowPerPage) {
    return 10;
  }
  const tmp = parseInt(rowPerPage, 10);
  return ROW_PER_PAGE_OPTION.includes(tmp) ? tmp : 10;
};

export const Reservation: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const history = useHistory();
  const searchParams = new URLSearchParams(history.location.search);
  const [tokyoWard, setTokyoWard] = useState<TokyoWard>(
    getTokyoWardFromUrlParam(searchParams.get("w"))
  );
  const [startDate, setStartDate] = useState<Date | null>(
    getInitialDateFromUrlParam(searchParams.get("df")) ?? now
  );
  const [endDate, setEndDate] = useState<Date | null>(
    getInitialDateFromUrlParam(searchParams.get("dt")) ?? addMonths(now, 1)
  );
  const [filter, setFilter] = useState<(string | ReservationDivision)[]>(
    getFilterFromUrlParam(searchParams.getAll("f"))
  );
  const [page, setPage] = useState(getPageFromUrlParam(searchParams.get("p")));
  const [rowsPerPage, setRowsPerPage] = useState(getRowPerPageFromUrlParam(searchParams.get("r")));

  const { loading, data, error } = useQuery<ReservationQuery, ReservationQueryVariables>(
    ReservationDocument,
    {
      variables: {
        offset: page * rowsPerPage,
        limit: rowsPerPage,
        ...(tokyoWard !== TokyoWard.INVALID
          ? {
              tokyoWard,
            }
          : {}),
        startDate: startDate?.toDateString(),
        endDate: endDate?.toDateString(),
        dayOfWeek: filter.includes("onlyHoliday") ? [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] : null,
        reservationStatus1: {
          ...(filter.includes(ReservationDivision.MORNING)
            ? { [ReservationDivision.MORNING]: ReservationStatus.VACANT }
            : {}),
          ...(filter.includes(ReservationDivision.AFTERNOON)
            ? {
                [ReservationDivision.AFTERNOON]: ReservationStatus.VACANT,
              }
            : {}),
          ...(filter.includes(ReservationDivision.EVENING)
            ? { [ReservationDivision.EVENING]: ReservationStatus.VACANT }
            : {}),
        },
        reservationStatus2: {
          ...(filter.includes(ReservationDivision.MORNING)
            ? {
                [ReservationDivision.ONE]: ReservationStatus.VACANT,
                [ReservationDivision.TWO]: ReservationStatus.VACANT,
              }
            : {}),
          ...(filter.includes(ReservationDivision.AFTERNOON)
            ? {
                [ReservationDivision.THREE]: ReservationStatus.VACANT,
                [ReservationDivision.FOUR]: ReservationStatus.VACANT,
              }
            : {}),
          ...(filter.includes(ReservationDivision.EVENING)
            ? {
                [ReservationDivision.FIVE]: ReservationStatus.VACANT,
                [ReservationDivision.SIX]: ReservationStatus.VACANT,
              }
            : {}),
        },
        reservationStatus3: {
          ...(filter.includes(ReservationDivision.MORNING)
            ? {
                [ReservationDivision.MORNING]: ReservationStatus.VACANT,
              }
            : {}),
          ...(filter.includes(ReservationDivision.AFTERNOON)
            ? {
                [ReservationDivision.AFTERNOON_ONE]: ReservationStatus.VACANT,
                [ReservationDivision.AFTERNOON_TWO]: ReservationStatus.VACANT,
              }
            : {}),
          ...(filter.includes(ReservationDivision.EVENING)
            ? {
                [ReservationDivision.EVENING]: ReservationStatus.VACANT,
              }
            : {}),
        },
      },
    }
  );

  const renderSearchForm = useMemo(() => {
    const handleTokyoWardChange = (event: ChangeEvent<{ value: unknown }>): void => {
      const value = event.target.value as TokyoWard;
      setTokyoWard(value);
      setPage(0);
      searchParams.delete("p");
      const urlParam = convertTokyoWardToUrlParam(value);
      urlParam ? searchParams.set("w", urlParam) : searchParams.delete("w");
      history.replace({ pathname: history.location.pathname, search: searchParams.toString() });
    };
    const handleStartDateChange = (date: Date | null): void => {
      setStartDate(date);
      setPage(0);
      searchParams.delete("p");
      date ? searchParams.set("df", date.toLocaleDateString()) : searchParams.delete("df");
      if (date && endDate && isAfter(date, endDate)) {
        setEndDate(date);
        searchParams.set("dt", date.toLocaleDateString());
      }
      history.replace({ pathname: history.location.pathname, search: searchParams.toString() });
    };
    const handleEndDateChange = (date: Date | null): void => {
      setEndDate(date);
      setPage(0);
      searchParams.delete("p");
      date ? searchParams.set("dt", date.toLocaleDateString()) : searchParams.delete("dt");
      if (date && startDate && isBefore(date, startDate)) {
        setStartDate(date);
        searchParams.set("df", date.toLocaleDateString());
      }
      history.replace({ pathname: history.location.pathname, search: searchParams.toString() });
    };
    const handleFilterChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const next = event.target.checked
        ? [...filter, event.target.value]
        : filter.filter((v) => v !== event.target.value);
      setFilter(next);
      searchParams.delete("f");
      next.forEach((f) => searchParams.append("f", convertFilterToUrlParam(f)));
      setPage(0);
      searchParams.delete("p");
      history.replace({ pathname: history.location.pathname, search: searchParams.toString() });
    };
    return (
      <BaseBox className={classes.searchBox} display="flex">
        <Select
          label={t("区")}
          value={tokyoWard}
          size="small"
          onChange={handleTokyoWardChange}
          selectOptions={SupportedTokyoWards}
        />
        <DateRangePicker
          label={t("期間指定")}
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
        <CheckboxGroup label={t("絞り込み")} values={filter} onChange={handleFilterChange}>
          <Checkbox label={t("休日のみ")} value="onlyHoliday" />
          <Checkbox label={t("午前空き")} value={ReservationDivision.MORNING} />
          <Checkbox label={t("午後空き")} value={ReservationDivision.AFTERNOON} />
          <Checkbox label={t("夜間空き")} value={ReservationDivision.EVENING} />
        </CheckboxGroup>
      </BaseBox>
    );
  }, [tokyoWard, startDate, endDate, filter]);

  const renderSearchResult = useMemo(() => {
    const handleChangePage = (_: MouseEvent<HTMLButtonElement> | null, newPage: number): void => {
      setPage(newPage);
      searchParams.set("p", String(newPage));
      history.replace({ pathname: history.location.pathname, search: searchParams.toString() });
    };
    const handleChangeRowsPerPage = (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ): void => {
      setRowsPerPage(parseInt(event.target.value, 10));
      searchParams.set("r", event.target.value);
      setPage(0);
      searchParams.delete("p");
      history.replace({ pathname: history.location.pathname, search: searchParams.toString() });
    };

    if (error) {
      throw new Error(error.message);
    }

    const existsData = !loading && !!data?.reservation.length;

    return (
      <BaseBox className={classes.resultBox}>
        <TablePagination
          count={data?.reservation_aggregate.aggregate?.count ?? 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onChangePage={handleChangePage}
          onChangeRowsPerPage={handleChangeRowsPerPage}
          loading={loading}
        />
        <TableContainer>
          <Table>
            {existsData && (
              <TableHead>
                <TableRow>
                  <TableCell variant="head">{t("施設名")}</TableCell>
                  <TableCell variant="head">{t("日付")}</TableCell>
                  <TableCell variant="head">{t("予約状況")}</TableCell>
                  <TableCell variant="head">{t("更新日時")}</TableCell>
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {existsData &&
                data?.reservation.map((info) => (
                  <TableRow key={info.id}>
                    <TableCell>
                      {isValidUUID(info.institution_id) ? (
                        <Link to={ROUTES.institutionDetail.replace(":id", info.institution_id)}>
                          {`${info.building} ${info.institution}`}
                        </Link>
                      ) : (
                        `${info.building} ${info.institution}`
                      )}
                    </TableCell>
                    <TableCell>{formatDate(info.date)}</TableCell>
                    <TableCell>{formatReservationMap(info.reservation)}</TableCell>
                    <TableCell>{formatDatetime(info.updated_at)}</TableCell>
                  </TableRow>
                ))}
              {!existsData && (
                <>
                  {loading ? (
                    <>
                      <TableRow>
                        <TableCell variant="head" colSpan={5}>
                          <Skeleton variant="text" height="24px" />
                        </TableCell>
                      </TableRow>
                      {[...Array(rowsPerPage)].map((_, index) => (
                        <TableRow key={`skeleton-row-${index}`}>
                          <TableCell variant="body" colSpan={5}>
                            <Skeleton variant="text" height="20px" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell variant="body" colSpan={5}>
                        {t("該当するデータがありません。")}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </BaseBox>
    );
  }, [loading, data, error]);

  return (
    <BaseBox className={classes.pageBox}>
      {renderSearchForm}
      {renderSearchResult}
    </BaseBox>
  );
};
