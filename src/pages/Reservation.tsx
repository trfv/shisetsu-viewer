import { useQuery } from "@apollo/client";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import isAfter from "date-fns/isAfter";
import isBefore from "date-fns/isBefore";
import { ChangeEvent, FC, MouseEvent, ReactNode, useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ReservationDocument,
  ReservationQuery,
  ReservationQueryVariables,
} from "../api/graphql-client";
import Box from "../components/atoms/Box";
import Grid from "../components/atoms/Grid";
import Paper from "../components/atoms/Paper";
import Skeleton from "../components/atoms/Skeleton";
import CheckboxGroup from "../components/molecules/CheckboxGroup";
import DateRangePicker from "../components/molecules/DateRangePicker";
import Select from "../components/molecules/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from "../components/molecules/Table";
import { DayOfWeek, ReservationDivision, ReservationStatus, TokyoWard } from "../constants/enums";
import { routePath } from "../constants/routes";
import { ClientContext, getTokyoWard } from "../utils/client";
import { isValidUUID } from "../utils/common";
import { fromEnumToUrlTokyoWard, getEnumLabel, SupportedTokyoWards } from "../utils/enums";
import { formatDate } from "../utils/format";
import { getEachWardReservationStatus, sortByReservationDivision } from "../utils/reservation";

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
    reservationTable: {
      minWidth: 1080,
    },
  })
);

const now = new Date();

const Reservation: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation("reservation");
  const { clientNamespace, toggleClientNamespace } = useContext(ClientContext);
  const [tokyoWard, setTokyoWard] = useState<TokyoWard>(getTokyoWard(clientNamespace));
  const [startDate, setStartDate] = useState<Date | null>(now);
  const [endDate, setEndDate] = useState<Date | null>(
    new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  );
  const [checkboxOnlyHoliday, setCheckboxOnlyHoliday] = useState(true);
  const [checkboxMorning, setCheckboxMorning] = useState(false);
  const [checkboxAfternoon, setCheckboxAfternoon] = useState(false);
  const [checkboxEvening, setCheckboxEvening] = useState(false);
  const [reservationStatus, setReservationStatus] = useState<ReservationStatus>(
    ReservationStatus.VACANT
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
    const handleTokyoWardChange = (event: ChangeEvent<{ value: unknown }>): void => {
      const nextTokyoWard = event.target.value as TokyoWard;
      setTokyoWard(nextTokyoWard);
      setPage(0);
      toggleClientNamespace(nextTokyoWard);
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
    const handleCheckboxOnlyHoliday = (event: ChangeEvent<HTMLInputElement>): void => {
      setCheckboxOnlyHoliday(event.target.checked);
      setPage(0);
    };
    const handleCheckboxMorning = (event: ChangeEvent<HTMLInputElement>): void => {
      setCheckboxMorning(event.target.checked);
      setPage(0);
    };
    const handleCheckboxAfternoon = (event: ChangeEvent<HTMLInputElement>): void => {
      setCheckboxAfternoon(event.target.checked);
      setPage(0);
    };
    const handleCheckboxEvening = (event: ChangeEvent<HTMLInputElement>): void => {
      setCheckboxEvening(event.target.checked);
      setPage(0);
    };
    const handleReservationStatusChange = (event: ChangeEvent<{ value: unknown }>): void => {
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
                maxDate: maxDate,
              }}
              endDateProps={{
                value: endDate,
                onChange: handleEndDateChange,
                minDate: minDate,
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
          <Table className={classes.reservationTable}>
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
                      {[...Array(3)].map((_, i) => (
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
                                  .replace(":tokyoWard", fromEnumToUrlTokyoWard(tokyoWard))
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
                              .map(([division, status]) =>
                                [
                                  getEnumLabel<ReservationDivision>(division),
                                  getEnumLabel<ReservationStatus>(status),
                                ].join(": ")
                              )
                              .join(" ")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell>{t("該当するデータがありません。")}</TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  }, [loading, data, error, classes.reservationTable, t, page, rowsPerPage, tokyoWard]);

  return (
    <Box className={classes.pageBox}>
      {renderSearchForm}
      {renderSearchResult}
    </Box>
  );
};

export default Reservation;
