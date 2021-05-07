import { useQuery } from "@apollo/client";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import React, { ChangeEvent, FC, MouseEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import {
  InstitutionDocument,
  InstitutionQuery,
  InstitutionQueryVariables,
} from "../api/graphql-client";
import { BaseBox } from "../components/Box";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
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
import { PAGE, ROWS_PER_PAGE, TOKYO_WARD } from "../constants/search";
import { COLORS, CONTAINER_WIDTH, INNER_WIDTH } from "../constants/styles";
import { SupportedTokyoWard, TokyoWardOptions } from "../utils/enums";
import { formatDatetime } from "../utils/format";
import {
  AvailableInstrument,
  AVAILABLE_INSTRUMENTS,
  BRASS,
  formatUsageFee,
  PERCUSSION,
  STRINGS,
  toInstitutionQueryVariables,
  toInstitutionSearchParams,
  WOODWIND,
} from "../utils/institution";
import { convertTokyoWardToUrlParam, setUrlSearchParams } from "../utils/search";

const useStyles = makeStyles(() =>
  createStyles({
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
  })
);

export const Institution: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const history = useHistory();

  const urlSearchParams = useRef<URLSearchParams>(new URLSearchParams(history.location.search));

  const [institutionSearchParams, setInstitutionSearchParams] = useState(
    toInstitutionSearchParams(urlSearchParams.current)
  );
  const { loading, data, error } = useQuery<InstitutionQuery, InstitutionQueryVariables>(
    InstitutionDocument,
    {
      variables: toInstitutionQueryVariables(institutionSearchParams),
    }
  );

  const { page, rowsPerPage, tokyoWard, availableInstruments } = institutionSearchParams;

  const renderSearchForm = () => {
    const handleTokyoWardChange = (event: ChangeEvent<{ value: unknown }>): void => {
      const value = event.target.value as SupportedTokyoWard;
      setInstitutionSearchParams((prevState) => ({ ...prevState, page: 0, tokyoWard: value }));
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
    const handleAvailableInstrumentsChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? availableInstruments.concat(value as AvailableInstrument)
        : availableInstruments.filter((v) => v !== value);
      setInstitutionSearchParams((prevState) => ({
        ...prevState,
        page: 0,
        availableInstruments: next,
      }));
      const nextUrlSearchParams = setUrlSearchParams(
        urlSearchParams.current,
        next.map((f) => [AVAILABLE_INSTRUMENTS, f]),
        [PAGE, AVAILABLE_INSTRUMENTS]
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
        <CheckboxGroup
          label={t("利用可能楽器")}
          values={availableInstruments}
          onChange={handleAvailableInstrumentsChange}
        >
          <Checkbox label={t("弦楽器")} value={STRINGS} />
          <Checkbox label={t("木管楽器")} value={WOODWIND} />
          <Checkbox label={t("金管楽器")} value={BRASS} />
          <Checkbox label={t("打楽器")} value={PERCUSSION} />
        </CheckboxGroup>
      </BaseBox>
    );
  };

  const renderSearchResult = () => {
    const handleChangePage = (_: MouseEvent<HTMLButtonElement> | null, newPage: number): void => {
      setInstitutionSearchParams((prevState) => ({
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
      setInstitutionSearchParams((prevState) => ({
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

    const existsData = !loading && !!data?.institution.length;

    return (
      <BaseBox className={classes.resultBox}>
        <TablePagination
          count={data?.institution_aggregate.aggregate?.count ?? 0}
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
                  <TableCell variant="head" align="right">
                    {t("定員(人)")}
                  </TableCell>
                  <TableCell variant="head" align="right">
                    {t("面積(㎡)")}
                  </TableCell>
                  <TableCell variant="head">{t("利用料金")}</TableCell>
                  <TableCell variant="head">{t("更新日時")}</TableCell>
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {existsData &&
                data?.institution.map((info) => (
                  <TableRow key={info.id}>
                    <TableCell>
                      {info.id ? (
                        <Link to={ROUTES.institutionDetail.replace(":id", info.id)}>
                          {`${info.building} ${info.institution}`}
                        </Link>
                      ) : (
                        `${info.building} ${info.institution}`
                      )}
                    </TableCell>
                    <TableCell variant="body" align="right">
                      {info.capacity}
                    </TableCell>
                    <TableCell variant="body" align="right">
                      {info.area}
                    </TableCell>
                    <TableCell variant="body">
                      {info.weekday_usage_fee && (
                        <div>
                          {t("平日 {{ usageFee }}", {
                            usageFee: formatUsageFee(tokyoWard, info.weekday_usage_fee),
                          })}
                        </div>
                      )}
                      {info.holiday_usage_fee && (
                        <div>
                          {t("休日 {{ usageFee }}", {
                            usageFee: formatUsageFee(tokyoWard, info.holiday_usage_fee),
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell variant="body">{formatDatetime(info.updated_at)}</TableCell>
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
                            <Skeleton variant="text" height="40px" />
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
