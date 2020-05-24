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
import TableRow from "@material-ui/core/TableRow";
import Skeleton from "@material-ui/lab/Skeleton";
import React, { FC, useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchQueryType, SEARCH_QUERY } from "../../api/queries";
import { ClientContext } from "../../App";
// eslint-disable-next-line
import { DayOfWeek, ReservationDivision, ReservationStatus, TokyoWard, TokyoWardMap } from "../../constants/enums";
import { getEnumLabel } from "../../utils/enums";
import { formatDate } from "../../utils/format";
import { getEachWardReservationStatus, sortReservation } from "../../utils/reservation";
import Select from "../atoms/Select";
import CheckboxGroup from "../molucules/CheckboxGroup";
import DateRangePicker from "../molucules/DateRangePicker";
import NoResult from "../templates/NoResult";

const useStyles = makeStyles((theme) =>
  createStyles({
    searchBox: {
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

  const { loading, data, error } = useQuery<SearchQueryType.SearchQuery>(SEARCH_QUERY, {
    variables: {
      startDate: startDate?.toDateString(),
      endDate: endDate?.toDateString(),
      daysOfWeek: checkboxOnlyHoliday ? [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] : null,
      contains1: {
        ...(checkboxMorning ? { RESERVATION_DIVISION_MORNING: reservationStatus } : {}),
        ...(checkboxAfternoon ? { RESERVATION_DIVISION_AFTERNOON: reservationStatus } : {}),
        ...(checkboxEvening ? { RESERVATION_DIVISION_EVENING: reservationStatus } : {}),
      },
      contains2: {
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
  });

  const renderSearchForm = useMemo(() => {
    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setDate(minDate.getDate() + 181); // 26 weeks
    const handleTokyoWardChange = (event: React.ChangeEvent<{ value: unknown }>): void => {
      const nextTokyoWard = event.target.value as TokyoWard;
      setTokyoWard(nextTokyoWard);
      // TODO
      toggleClientNamespace(nextTokyoWard === TokyoWard.KOUTOU ? "koutouClient" : "bunkyoClient");
    };
    const handleStartDateChange = (date: Date | null): void => {
      setStartDate(date);
    };
    const handleEndDateChange = (date: Date | null): void => {
      setEndDate(date);
    };
    const handleCheckboxOnlyHoliday = (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCheckboxOnlyHoliday(event.target.checked);
    };
    const handleCheckboxMorning = (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCheckboxMorning(event.target.checked);
    };
    const handleCheckboxAfternoon = (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCheckboxAfternoon(event.target.checked);
    };
    const handleCheckboxEvening = (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCheckboxEvening(event.target.checked);
    };
    const handleReservationStatusChange = (event: React.ChangeEvent<{ value: unknown }>): void => {
      setReservationStatus(event.target.value as ReservationStatus);
    };
    return (
      <Box p="16px" mb="16px" className={classes.searchBox}>
        <Grid container spacing={2}>
          <Grid item md={1} xs={12}>
            <Select
              label={t("区")}
              value={tokyoWard}
              onChange={handleTokyoWardChange}
              selectOptions={TokyoWardMap.filter((option) =>
                [TokyoWard.KOUTOU, TokyoWard.BUNKYO].includes(option.value)
              )}
            />
          </Grid>
          <Grid item md={4} xs={12}>
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
          <Grid item md={2} xs={12}>
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
          <Grid item md={3} xs={12}>
            <CheckboxGroup
              label={t("予約区分")}
              checkboxItems={[
                { label: t("午前"), checked: checkboxMorning, onChange: handleCheckboxMorning },
                { label: t("午後"), checked: checkboxAfternoon, onChange: handleCheckboxAfternoon },
                { label: t("夜間"), checked: checkboxEvening, onChange: handleCheckboxEvening },
              ]}
            />
          </Grid>
          <Grid item md={2} xs={12}>
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
    if (error) {
      return <Box>{error.message}</Box>;
    }
    return (
      <>
        <Box my="16px">{/** TODO 検索結果ラベル */}</Box>
        <TableContainer component={Paper}>
          <Table className={classes.resultTable}>
            <TableHead>
              <TableRow>
                <TableCell variant="head">{t("施設名")}</TableCell>
                <TableCell variant="head">{t("部屋名")}</TableCell>
                <TableCell variant="head">{t("日付")}</TableCell>
                <TableCell variant="head">{t("予約状況")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <>
                  {[...Array(15)].map((_, index) => (
                    <TableRow key={`row-${index}`}>
                      {[...Array(4)].map((_, i) => (
                        <TableCell key={`cell-${i}`} variant="body">
                          <Skeleton variant="text" height="24px" />
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
                          <TableCell>{info.building}</TableCell>
                          <TableCell>{info.institution}</TableCell>
                          <TableCell>{formatDate(info.date)}</TableCell>
                          <TableCell>
                            {sortReservation(info.reservation)
                              .map(
                                ({ division, status }) =>
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
  }, [loading, data, error, classes.resultTable, t]);

  return (
    <Box p="16px">
      {renderSearchForm}
      {renderSearchResult}
    </Box>
  );
};

export default Reservation;
