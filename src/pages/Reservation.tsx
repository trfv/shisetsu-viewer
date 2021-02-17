import { useQuery } from "@apollo/client";
import MuiPaper from "@material-ui/core/Paper";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import { isAfter, isBefore } from "date-fns";
import React, { ChangeEvent, FC, MouseEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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
  TablePagination,
  TableRow,
} from "../components/Table";
import { DayOfWeek, ReservationDivision, ReservationStatus, TokyoWard } from "../constants/enums";
import { routePath } from "../constants/routes";
import { isValidUUID } from "../utils/common";
import { SupportedTokyoWards } from "../utils/enums";
import { formatDate } from "../utils/format";
import { formatReservationMap } from "../utils/reservation";

const useStyles = makeStyles((theme) =>
  createStyles({
    pageBox: {
      width: "100%",
      minWidth: 1200,
    },
    searchBox: {
      margin: "40px auto 0",
      padding: "24px 0",
      width: 1200,
      background: theme.palette.grey[200],
    },
    resultBox: {
      margin: "24px auto 40px",
      width: 1200,
    },
  })
);

const now = new Date();

export const Reservation: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [tokyoWard, setTokyoWard] = useState<TokyoWard>(TokyoWard.INVALID);
  const [startDate, setStartDate] = useState<Date | null>(now);
  const [endDate, setEndDate] = useState<Date | null>(
    new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  );
  const [filter, setFilter] = useState<(string | ReservationDivision)[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setDate(minDate.getDate() + 181); // 26 weeks
    const handleTokyoWardChange = (event: ChangeEvent<{ value: unknown }>): void => {
      setTokyoWard(event.target.value as TokyoWard);
      setPage(0);
    };
    const handleStartDateChange = (date: Date | null): void => {
      setStartDate(date);
      date && endDate && isAfter(date, endDate) && setEndDate(date);
      setPage(0);
    };
    const handleEndDateChange = (date: Date | null): void => {
      setEndDate(date);
      date && startDate && isBefore(date, startDate) && setStartDate(date);
      setPage(0);
    };
    const handleFilterChange = (event: ChangeEvent<HTMLInputElement>): void => {
      setFilter((prev) =>
        event.target.checked
          ? [...prev, event.target.value]
          : prev.filter((v) => v !== event.target.value)
      );
      setPage(0);
    };
    return (
      <BaseBox className={classes.searchBox} display="flex" justifyContent="space-around">
        <Select
          label={t("区")}
          value={tokyoWard}
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
        <CheckboxGroup
          label={t("絞り込み")}
          values={filter}
          onChange={handleFilterChange}
          size="large"
        >
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
    };
    const handleChangeRowsPerPage = (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ): void => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    };
    if (error) {
      return <BaseBox>{error.message}</BaseBox>;
    }

    const existsData = !loading && !!data?.reservation.length;

    return (
      <BaseBox className={classes.resultBox}>
        <TablePagination
          component="div"
          rowsPerPageOptions={[10, 50, 100]}
          count={data?.reservation_aggregate.aggregate?.count || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onChangePage={handleChangePage}
          onChangeRowsPerPage={handleChangeRowsPerPage}
          labelRowsPerPage={t("表示件数")}
          labelDisplayedRows={({ from, to, count }) =>
            t("{{ from }}-{{ to }} / {{ count }}", { from, to, count })
          }
        />
        <TableContainer component={MuiPaper}>
          <Table>
            {existsData && (
              <TableHead>
                <TableRow>
                  <TableCell variant="head">{t("施設名")}</TableCell>
                  <TableCell variant="head">{t("日付")}</TableCell>
                  <TableCell variant="head">{t("予約状況")}</TableCell>
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {existsData &&
                data?.reservation.map((info) => (
                  <TableRow key={`${info.institution_id}-${info.date}`}>
                    <TableCell>
                      {isValidUUID(info.institution_id) ? (
                        <Link to={routePath.institutionDetail.replace(":id", info.institution_id)}>
                          {`${info.building} ${info.institution}`}
                        </Link>
                      ) : (
                        `${info.building} ${info.institution}`
                      )}
                    </TableCell>
                    <TableCell>{formatDate(info.date)}</TableCell>
                    <TableCell>{formatReservationMap(info.reservation)}</TableCell>
                  </TableRow>
                ))}
              {!existsData && (
                <>
                  {loading ? (
                    [...Array(rowsPerPage)].map((_, index) => (
                      <TableRow key={`skeleton-row-${index}`}>
                        {[...Array(5)].map((_, i) => (
                          <TableCell key={`skeleton-cell-${i}`} variant="body">
                            <Skeleton variant="text" height="40px" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell>
                        <TableCell>{t("該当するデータがありません。")}</TableCell>
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
