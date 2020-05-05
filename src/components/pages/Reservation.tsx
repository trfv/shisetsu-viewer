import { useQuery } from "@apollo/react-hooks";
import DateFnsUtils from "@date-io/date-fns";
import Box from "@material-ui/core/Box";
import Checkbox from "@material-ui/core/Checkbox";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormGroup from "@material-ui/core/FormGroup";
import FormLabel from "@material-ui/core/FormLabel";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Skeleton from "@material-ui/lab/Skeleton";
import { KeyboardDatePicker, MuiPickersUtilsProvider } from "@material-ui/pickers";
import "date-fns";
import React, { FC, useMemo, useState } from "react";
import { SearchQueryType, SEARCH_QUERY } from "../../api/queries";
import { ReservationDivision, ReservationStatus } from "../../constants/enums";
import { getEnumLabel } from "../../utils/format";

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
  const [targetDate, setTargetDate] = useState<Date | null>(new Date());
  const handleTargetDateChange = (date: Date | null): void => {
    setTargetDate(date);
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
      targetDate: targetDate?.toDateString(),
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
    return (
      <Box py="16px" display="flex" justifyContent="space-evenly">
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <KeyboardDatePicker
            disableToolbar
            disablePast
            label="日付"
            variant="inline"
            format="yyyy/MM/dd"
            value={targetDate}
            onChange={handleTargetDateChange}
          />
        </MuiPickersUtilsProvider>
        <FormControl>
          <FormLabel>区分</FormLabel>
          <FormGroup row>
            <FormControlLabel
              control={<Checkbox checked={checkboxMorning} onChange={handleCheckboxMorning} />}
              label="午前"
            />
            <FormControlLabel
              control={<Checkbox checked={checkboxAfternoon} onChange={handleCheckboxAfternoon} />}
              label="午後"
            />
            <FormControlLabel
              control={<Checkbox checked={checkboxEvening} onChange={handleCheckboxEvening} />}
              label="夜間"
            />
          </FormGroup>
        </FormControl>
        <FormControl>
          <InputLabel>状態</InputLabel>
          <Select
            value={reservationStatus}
            onChange={handleReservationStatusChange}
            disabled={!checkboxMorning && !checkboxAfternoon && !checkboxEvening}
          >
            <MenuItem value={ReservationStatus.VACANT}>空き</MenuItem>
            <MenuItem value={ReservationStatus.OCCUPIED}>予約あり</MenuItem>
            <MenuItem value={ReservationStatus.CLOSED}>休館日</MenuItem>
            <MenuItem value={ReservationStatus.KEEP}>保守日</MenuItem>
            <MenuItem value={ReservationStatus.KIKANGAI}>期間外</MenuItem>
            <MenuItem value={ReservationStatus.SOUND}>音出予約</MenuItem>
          </Select>
        </FormControl>
      </Box>
    );
  }, [targetDate, checkboxMorning, checkboxAfternoon, checkboxEvening, reservationStatus]);

  const renderSearchResult = useMemo(() => {
    if (error) {
      return <Box>{error.message}</Box>;
    }
    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell variant="head">建物</TableCell>
              <TableCell variant="head">施設</TableCell>
              <TableCell variant="head">予約状況</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <>
                {[...Array(10)].map((index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton variant="text" height="120px" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" height="120px" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" height="120px" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : (
              <>
                {data?.reservation?.map((info) => (
                  <TableRow key={info.id}>
                    <TableCell>{info.building}</TableCell>
                    <TableCell>{info.institution}</TableCell>
                    <TableCell>
                      {sortReservation(info.reservation).map(({ division, status }) => (
                        <p key={division}>{`${getEnumLabel<ReservationDivision>(
                          division
                        )}: ${getEnumLabel<ReservationStatus>(status)}`}</p>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [loading, data, error]);

  return (
    <Box p="16px">
      {renderSearchForm}
      {renderSearchResult}
    </Box>
  );
};

export default Reservation;
