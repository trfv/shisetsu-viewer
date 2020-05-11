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
import React, { FC, useMemo, useState } from "react";
import { SearchQueryType, SEARCH_QUERY } from "../../api/queries";
// eslint-disable-next-line
import { DayOfWeek, ReservationDivision, ReservationStatus, ReservationStatusMap } from "../../constants/enums";
import { formatDate, getEnumLabel } from "../../utils/format";
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
      minWidth: 1000,
    },
  })
);

const sortReservation = (reservation: {
  [key: string]: ReservationStatus;
}): { division: ReservationDivision; status: ReservationStatus }[] => {
  return [
    ...(reservation.RESERVATION_DIVISION_MORNING
      ? [
          {
            division: ReservationDivision.MORNING,
            status: reservation.RESERVATION_DIVISION_MORNING,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_AFTERNOON
      ? [
          {
            division: ReservationDivision.AFTERNOON,
            status: reservation.RESERVATION_DIVISION_AFTERNOON,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_EVENING
      ? [
          {
            division: ReservationDivision.EVENING,
            status: reservation.RESERVATION_DIVISION_EVENING,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_ONE
      ? [
          {
            division: ReservationDivision.ONE,
            status: reservation.RESERVATION_DIVISION_ONE,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_TWO
      ? [
          {
            division: ReservationDivision.TWO,
            status: reservation.RESERVATION_DIVISION_TWO,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_THREE
      ? [
          {
            division: ReservationDivision.THREE,
            status: reservation.RESERVATION_DIVISION_THREE,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_FOUR
      ? [
          {
            division: ReservationDivision.FOUR,
            status: reservation.RESERVATION_DIVISION_FOUR,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_FIVE
      ? [
          {
            division: ReservationDivision.FIVE,
            status: reservation.RESERVATION_DIVISION_FIVE,
          },
        ]
      : []),
    ...(reservation.RESERVATION_DIVISION_SIX
      ? [
          {
            division: ReservationDivision.SIX,
            status: reservation.RESERVATION_DIVISION_SIX,
          },
        ]
      : []),
  ];
};

const Reservation: FC = () => {
  const classes = useStyles();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const handleStartDateChange = (date: Date | null): void => {
    setStartDate(date);
  };
  const [endDate, setEndDate] = useState<Date | null>(null);
  const handleEndDateChange = (date: Date | null): void => {
    setEndDate(date);
  };
  const [checkboxOnlyHoliday, setCheckboxOnlyHoliday] = useState(false);
  const handleCheckboxOnlyHoliday = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setCheckboxOnlyHoliday(event.target.checked);
  };
  const [checkboxMorning, setCheckboxMorning] = useState(false);
  const handleCheckboxMorning = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setCheckboxMorning(event.target.checked);
  };
  const [checkboxAfternoon, setCheckboxAfternoon] = useState(false);
  const handleCheckboxAfternoon = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setCheckboxAfternoon(event.target.checked);
  };
  const [checkboxEvening, setCheckboxEvening] = useState(false);
  const handleCheckboxEvening = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setCheckboxEvening(event.target.checked);
  };
  const [reservationStatus, setReservationStatus] = useState<ReservationStatus>(
    ReservationStatus.VACANT
  );
  const handleReservationStatusChange = (event: React.ChangeEvent<{ value: unknown }>): void => {
    setReservationStatus(event.target.value as ReservationStatus);
  };

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
    maxDate.setDate(minDate.getDate() + 13);
    return (
      <Box p="16px" mb="16px" className={classes.searchBox}>
        <Grid container spacing={2}>
          <Grid item xs={5}>
            <DateRangePicker
              label="期間"
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
          <Grid item xs={2}>
            <CheckboxGroup
              label="休日のみ"
              checkboxItems={[
                {
                  label: "",
                  checked: checkboxOnlyHoliday,
                  onChange: handleCheckboxOnlyHoliday,
                },
              ]}
            />
          </Grid>
          <Grid item xs={3}>
            <CheckboxGroup
              label="予約区分"
              checkboxItems={[
                { label: "午前", checked: checkboxMorning, onChange: handleCheckboxMorning },
                { label: "午後", checked: checkboxAfternoon, onChange: handleCheckboxAfternoon },
                { label: "夜間", checked: checkboxEvening, onChange: handleCheckboxEvening },
              ]}
            />
          </Grid>
          <Grid item xs={2}>
            <Select
              label="予約状況"
              value={reservationStatus}
              onChange={handleReservationStatusChange}
              disabled={!checkboxMorning && !checkboxAfternoon && !checkboxEvening}
              selectOptions={ReservationStatusMap.filter(
                (option) => !option.value.includes("INVALID")
              )}
            />
          </Grid>
        </Grid>
      </Box>
    );
  }, [
    startDate,
    endDate,
    checkboxOnlyHoliday,
    checkboxMorning,
    checkboxAfternoon,
    checkboxEvening,
    reservationStatus,
    classes.searchBox,
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
                <TableCell variant="head">施設名</TableCell>
                <TableCell variant="head">部屋名</TableCell>
                <TableCell variant="head">日付</TableCell>
                <TableCell variant="head">予約状況</TableCell>
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
  }, [loading, data, error, classes.resultTable]);

  return (
    <Box p="16px">
      {renderSearchForm}
      {renderSearchResult}
    </Box>
  );
};

export default Reservation;
