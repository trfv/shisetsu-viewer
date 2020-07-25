import { useQuery } from "@apollo/react-hooks";
import Box from "@material-ui/core/Box";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import Skeleton from "@material-ui/lab/Skeleton";
import React, { FC, ReactNode, useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ReservationDocument,
  ReservationQuery,
  ReservationQueryVariables,
} from "../../api/graphql-client";
import {
  DayOfWeek,
  ReservationDivision,
  ReservationStatus,
  TokyoWard,
} from "../../constants/enums";
import { routePath } from "../../constants/routes";
import { ClientContext } from "../../utils/client";
import { fromUpperSnakeToLowerKebab, isValidUUID } from "../../utils/common";
import { getEnumLabel, SupportedTokyoWards } from "../../utils/enums";
import { formatDate } from "../../utils/format";
import { getEachWardReservationStatus, sortByReservationDivision } from "../../utils/reservation";
import CheckboxGroup from "../molucules/CheckboxGroup";
import DateRangePicker from "../molucules/DateRangePicker";
import NoResult from "../molucules/NoResult";
import Select from "../molucules/Select";

const useStyles = makeStyles((theme) =>
  createStyles({
    pageBox: {
      padding: 24,
    },
    searchBox: {
      padding: 24,
      paddingBottom: 14,
      marginBottom: 16,
      background: theme.palette.grey[200],
    },
    resultTable: {
      minWidth: 1080,
    },
  })
);

const Reservation: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation("reservation");
  const { toggleClientNamespace } = useContext(ClientContext);
  const [tokyoWard, setTokyoWard] = useState<TokyoWard>(TokyoWard.KOUTOU);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [checkboxOnlyHoliday, setCheckboxOnlyHoliday] = useState(false);
  const [checkboxMorning, setCheckboxMorning] = useState(false);
  const [checkboxAfternoon, setCheckboxAfternoon] = useState(false);
  const [checkboxEvening, setCheckboxEvening] = useState(false);
  const [reservationStatus, setReservationStatus] = useState<ReservationStatus>(
    ReservationStatus.VACANT
  );
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const { loading, data, error } = useQuery<ReservationQuery, ReservationQueryVariables>(
    ReservationDocument,
    {
      variables: {
        offset: page * rowsPerPage,
        limit: rowsPerPage,
        startDate: startDate?.toDateString(),
        endDate: endDate?.toDateString(),
        daysOfWeek: checkboxOnlyHoliday ? [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] : null,
        reservationStatus1: {
          ...(checkboxMorning ? { RESERVATION_DIVISION_MORNING: reservationStatus } : {}),
          ...(checkboxAfternoon ? { RESERVATION_DIVISION_AFTERNOON: reservationStatus } : {}),
          ...(checkboxEvening ? { RESERVATION_DIVISION_EVENING: reservationStatus } : {}),
        },
        reservationStatus2: {
          ...(checkboxMorning
            ? {
                RESERVATION_DIVISION_ONE: reservationStatus,
                RESERVATION_DIVISION_TWO: reservationStatus,
              }
            : {}),
          ...(checkboxAfternoon
            ? {
                RESERVATION_DIVISION_THREE: reservationStatus,
                RESERVATION_DIVISION_FOUR: reservationStatus,
              }
            : {}),
          ...(checkboxEvening
            ? {
                RESERVATION_DIVISION_FIVE: reservationStatus,
                RESERVATION_DIVISION_SIX: reservationStatus,
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
    const handleTokyoWardChange = (event: React.ChangeEvent<{ value: unknown }>): void => {
      const nextTokyoWard = event.target.value as TokyoWard;
      setTokyoWard(nextTokyoWard);
      setPage(0);
      toggleClientNamespace(nextTokyoWard);
    };
    const handleStartDateChange = (date: Date | null): void => {
      setStartDate(date);
      setPage(0);
    };
    const handleEndDateChange = (date: Date | null): void => {
      setEndDate(date);
      setPage(0);
    };
    const handleCheckboxOnlyHoliday = (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCheckboxOnlyHoliday(event.target.checked);
      setPage(0);
    };
    const handleCheckboxMorning = (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCheckboxMorning(event.target.checked);
      setPage(0);
    };
    const handleCheckboxAfternoon = (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCheckboxAfternoon(event.target.checked);
      setPage(0);
    };
    const handleCheckboxEvening = (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCheckboxEvening(event.target.checked);
      setPage(0);
    };
    const handleReservationStatusChange = (event: React.ChangeEvent<{ value: unknown }>): void => {
      setReservationStatus(event.target.value as ReservationStatus);
      setPage(0);
    };
    return (
      <Box className={classes.searchBox}>
        <Grid container spacing={2}>
          <Grid item md={1} sm={2} xs={12}>
            <Select
              label={t("区")}
              value={tokyoWard}
              onChange={handleTokyoWardChange}
              selectOptions={SupportedTokyoWards}
            />
          </Grid>
          <Grid item md={3} sm={10} xs={12}>
            <DateRangePicker
              label={t("期間")}
              startDateProps={{
                value: startDate,
                onChange: handleStartDateChange,
                minDate: minDate,
                maxDate: endDate ?? maxDate,
              }}
              endDateProps={{
                value: endDate,
                onChange: handleEndDateChange,
                minDate: startDate ?? minDate,
                maxDate: maxDate,
              }}
            />
          </Grid>
          <Grid item md={1} sm={2} xs={12}>
            <CheckboxGroup
              label={t("休日のみ")}
              checkboxItems={[
                {
                  label: "",
                  checked: checkboxOnlyHoliday,
                  onChange: handleCheckboxOnlyHoliday,
                },
              ]}
            />
          </Grid>
          <Grid item md={3} sm={7} xs={12}>
            <CheckboxGroup
              label={t("予約区分")}
              checkboxItems={[
                { label: t("午前"), checked: checkboxMorning, onChange: handleCheckboxMorning },
                { label: t("午後"), checked: checkboxAfternoon, onChange: handleCheckboxAfternoon },
                { label: t("夜間"), checked: checkboxEvening, onChange: handleCheckboxEvening },
              ]}
            />
          </Grid>
          <Grid item md={1} sm={3} xs={12}>
            <Select
              label={t("予約状況")}
              value={reservationStatus}
              onChange={handleReservationStatusChange}
              disabled={!checkboxMorning && !checkboxAfternoon && !checkboxEvening}
              selectOptions={getEachWardReservationStatus(tokyoWard)}
            />
          </Grid>
        </Grid>
      </Box>
    );
  }, [
    tokyoWard,
    startDate,
    endDate,
    checkboxOnlyHoliday,
    checkboxMorning,
    checkboxAfternoon,
    checkboxEvening,
    reservationStatus,
    classes.searchBox,
    t,
    toggleClientNamespace,
  ]);

  const renderSearchResult = useMemo(() => {
    const handleChangePage = (
      _: React.MouseEvent<HTMLButtonElement> | null,
      newPage: number
    ): void => {
      setPage(newPage);
    };
    const handleChangeRowsPerPage = (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ): void => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    };
    if (error) {
      return <Box>{error.message}</Box>;
    }
    return (
      <>
        <TablePagination
          component="div"
          rowsPerPageOptions={[10, 50, 100]}
          count={data?.reservation_aggregate.aggregate?.count || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onChangePage={handleChangePage}
          onChangeRowsPerPage={handleChangeRowsPerPage}
          labelRowsPerPage={t("表示件数")}
          labelDisplayedRows={({ from, to, count }): ReactNode =>
            t("ページ件数", { from, to, count })
          }
        />
        <TableContainer component={Paper}>
          <Table className={classes.resultTable}>
            <TableHead>
              <TableRow>
                <TableCell variant="head">{t("施設名")}</TableCell>
                <TableCell variant="head">{t("日付")}</TableCell>
                <TableCell variant="head">{t("予約状況")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <>
                  {[...Array(rowsPerPage)].map((_, index) => (
                    <TableRow key={`row-${index}`}>
                      {[...Array(4)].map((_, i) => (
                        <TableCell key={`cell-${i}`} variant="body">
                          <Skeleton variant="text" height="20px" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : (
                <>
                  {data?.reservation && data?.reservation.length > 0 ? (
                    <>
                      {data.reservation.map((info, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {isValidUUID(info.institution_id) ? (
                              <Link
                                to={routePath.institutionDetail
                                  .replace(":tokyoWard", fromUpperSnakeToLowerKebab(tokyoWard))
                                  .replace(":id", info.institution_id)}
                              >
                                {`${info.building} ${info.institution}`}
                              </Link>
                            ) : (
                              `${info.building} ${info.institution}`
                            )}
                          </TableCell>
                          <TableCell>{formatDate(info.date)}</TableCell>
                          <TableCell>
                            {sortByReservationDivision(info.reservation)
                              .map(
                                ([division, status]) =>
                                  `${getEnumLabel<ReservationDivision>(division)}: ${getEnumLabel<
                                    ReservationStatus
                                  >(status)}`
                              )
                              .join(" ")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <NoResult />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  }, [loading, data, error, classes.resultTable, t, page, rowsPerPage, tokyoWard]);

  return (
    <Box className={classes.pageBox}>
      {renderSearchForm}
      {renderSearchResult}
    </Box>
  );
};

export default Reservation;
