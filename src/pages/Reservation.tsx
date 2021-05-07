import { useQuery } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import { addMonths, endOfMonth, isAfter, isBefore } from "date-fns";
import React, { ChangeEvent, FC, MouseEvent, useRef, useState } from "react";
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
import { ROUTES } from "../constants/routes";
import { END_DATE, PAGE, ROWS_PER_PAGE, START_DATE, TOKYO_WARD } from "../constants/search";
import { COLORS, CONTAINER_WIDTH, INNER_WIDTH } from "../constants/styles";
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

const minDate = new Date();
const maxDate = addMonths(endOfMonth(new Date()), 6);

export const Reservation: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation();
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

  const renderSearchForm = () => {
    const handleTokyoWardChange = (event: ChangeEvent<{ value: unknown }>): void => {
      const value = event.target.value as SupportedTokyoWard;
      setReservationSearchParams((prevState) => ({ ...prevState, page: 0, tokyoWard: value }));
      const nextUrlSearchParams = setUrlSearchParams(
        urlSearchParams.current,
        [[TOKYO_WARD, convertTokyoWardToUrlParam(value)]],
        [PAGE]
      );
      history.replace({
        pathname: history.location.pathname,
        search: nextUrlSearchParams.toString(),
      });
      urlSearchParams.current = nextUrlSearchParams;
    };
    const handleStartDateChange = (date: Date | null): void => {
      const needsUpdateEndDate = date && endDate && isAfter(date, endDate);
      setReservationSearchParams((prevState) => ({
        ...prevState,
        page: 0,
        startDate: date,
        ...(needsUpdateEndDate ? { endDate: date } : {}),
      }));
      const appendParams: [string, string | undefined][] = [
        [START_DATE, date?.toLocaleDateString()],
      ];
      const nextUrlSearchParams = setUrlSearchParams(
        urlSearchParams.current,
        needsUpdateEndDate
          ? appendParams.concat([END_DATE, date?.toLocaleDateString()])
          : appendParams,
        [PAGE]
      );
      history.replace({
        pathname: history.location.pathname,
        search: nextUrlSearchParams.toString(),
      });
      urlSearchParams.current = nextUrlSearchParams;
    };
    const handleEndDateChange = (date: Date | null): void => {
      const needsUpdateStartDate = date && startDate && isBefore(date, startDate);
      setReservationSearchParams((prevState) => ({
        ...prevState,
        page: 0,
        endDate: date,
        ...(needsUpdateStartDate ? { endDate: date } : {}),
      }));
      const appendParams: [string, string | undefined][] = [[END_DATE, date?.toLocaleDateString()]];
      const nextUrlSearchParams = setUrlSearchParams(
        urlSearchParams.current,
        needsUpdateStartDate
          ? appendParams.concat([START_DATE, date?.toLocaleDateString()])
          : appendParams,
        [PAGE]
      );
      history.replace({
        pathname: history.location.pathname,
        search: nextUrlSearchParams.toString(),
      });
      urlSearchParams.current = nextUrlSearchParams;
    };
    const handleFilterChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? filter.concat(value as ReservationSearchFilter)
        : filter.filter((v) => v !== value);
      setReservationSearchParams((prevState) => ({
        ...prevState,
        page: 0,
        filter: next,
      }));
      const nextUrlSearchParams = setUrlSearchParams(
        urlSearchParams.current,
        next.map((f) => [RESERVATION_SEARCH_FILTER, f]),
        [PAGE, RESERVATION_SEARCH_FILTER]
      );
      history.replace({
        pathname: history.location.pathname,
        search: nextUrlSearchParams.toString(),
      });
      urlSearchParams.current = nextUrlSearchParams;
    };

    return (
      <BaseBox className={classes.searchBox} display="flex">
        <Select
          label={t("区")}
          value={tokyoWard}
          size="small"
          onChange={handleTokyoWardChange}
          selectOptions={TokyoWardOptions}
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
          <Checkbox label={t("休日のみ")} value={IS_ONLY_HOLIDAY} />
          <Checkbox label={t("午前空き")} value={IS_ONLY_MORNING_VACANT} />
          <Checkbox label={t("午後空き")} value={IS_ONLY_AFTERNOON_VACANT} />
          <Checkbox label={t("夜間空き")} value={IS_ONLY_EVENING_VACANT} />
        </CheckboxGroup>
      </BaseBox>
    );
  };

  const renderSearchResult = () => {
    const handleChangePage = (_: MouseEvent<HTMLButtonElement> | null, newPage: number): void => {
      setReservationSearchParams((prevState) => ({
        ...prevState,
        page: newPage,
      }));
      const nextUrlSearchParams = setUrlSearchParams(
        urlSearchParams.current,
        [[PAGE, String(newPage)]],
        []
      );
      history.replace({
        pathname: history.location.pathname,
        search: nextUrlSearchParams.toString(),
      });
      urlSearchParams.current = nextUrlSearchParams;
    };
    const handleChangeRowsPerPage = (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ): void => {
      const value = event.target.value;
      setReservationSearchParams((prevState) => ({
        ...prevState,
        rowsPerPage: parseInt(value, 10),
        page: 0,
      }));
      const nextUrlSearchParams = setUrlSearchParams(
        urlSearchParams.current,
        [[ROWS_PER_PAGE, value]],
        [PAGE]
      );
      history.replace({
        pathname: history.location.pathname,
        search: nextUrlSearchParams.toString(),
      });
      urlSearchParams.current = nextUrlSearchParams;
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
                      {info.institution_id ? (
                        <Link to={ROUTES.institutionDetail.replace(":id", info.institution_id)}>
                          {`${info.building} ${info.institution}`}
                        </Link>
                      ) : (
                        `${info.building} ${info.institution}`
                      )}
                    </TableCell>
                    <TableCell>{formatDate(info.date)}</TableCell>
                    <TableCell style={{ whiteSpace: "pre-line" }}>
                      {formatReservationMap(info.tokyo_ward, info.reservation)}
                    </TableCell>
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
  };

  return (
    <BaseBox className={classes.pageBox} component="main">
      {renderSearchForm()}
      {renderSearchResult()}
    </BaseBox>
  );
};
