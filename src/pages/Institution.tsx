import { useQuery } from "@apollo/client";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import React, { ChangeEvent, FC, MouseEvent, useMemo, useState } from "react";
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
import { AvailabilityDivision, TokyoWard } from "../constants/enums";
import { ROUTES } from "../constants/routes";
import { ROW_PER_PAGE_OPTION } from "../constants/search";
import { COLORS, CONTAINER_WIDTH } from "../constants/styles";
import {
  convertTokyoWardToUrlParam,
  getTokyoWardFromUrlParam,
  SupportedTokyoWards,
} from "../utils/enums";
import { formatDatetime } from "../utils/format";
import { formatUsageFee } from "../utils/institution";

const useStyles = makeStyles(() =>
  createStyles({
    pageBox: {
      width: "100%",
      minWidth: CONTAINER_WIDTH,
    },
    searchBox: {
      margin: "40px auto 0",
      width: CONTAINER_WIDTH,
      background: COLORS.GRAY,
      borderRadius: "4px",
      "& > *": {
        margin: "24px",
      },
    },
    resultBox: {
      margin: "24px auto 40px",
      width: CONTAINER_WIDTH,
    },
  })
);

const getAvailableInstrumentFromUrlParam = (availableInstruments: string[]): string[] => {
  return availableInstruments
    .map((a) => {
      if (a === "s") {
        return "strings";
      }
      if (a === "w") {
        return "woodwind";
      }
      if (a === "b") {
        return "brass";
      }
      if (a === "e") {
        return "percussion";
      }
      return "";
    })
    .filter((f) => !!f);
};

const convertAvailableInstrumentToUrlParam = (availableInstrument: string): string => {
  return availableInstrument.slice(0, 1);
};

const getEquipmentFromUrlParam = (equipments: string[]): string[] => {
  return equipments
    .map((e) => {
      if (e === "m") {
        return "musicstand";
      }
      if (e === "p") {
        return "piano";
      }
      return "";
    })
    .filter((f) => !!f);
};

const convertEquipmentToUrlParam = (equipment: string): string => {
  return equipment.slice(0, 1);
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

export const Institution: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const history = useHistory();
  const searchParams = new URLSearchParams(history.location.search);

  const [tokyoWard, setTokyoWard] = useState<TokyoWard>(
    getTokyoWardFromUrlParam(searchParams.get("w"))
  );
  const [availableInstruments, setAvailableInstruments] = useState<string[]>(
    getAvailableInstrumentFromUrlParam(searchParams.getAll("a"))
  );

  const [page, setPage] = useState(getPageFromUrlParam(searchParams.get("p")));
  const [rowsPerPage, setRowsPerPage] = useState(getRowPerPageFromUrlParam(searchParams.get("r")));

  const { loading, data, error } = useQuery<InstitutionQuery, InstitutionQueryVariables>(
    InstitutionDocument,
    {
      variables: {
        offset: page * rowsPerPage,
        limit: rowsPerPage,
        ...(tokyoWard !== TokyoWard.INVALID
          ? {
              tokyoWard,
            }
          : {}),
        ...(availableInstruments.includes("strings")
          ? { isAvaliableStrings: AvailabilityDivision.AVAILABLE }
          : {}),
        ...(availableInstruments.includes("woodwind")
          ? { isAvailableWoodwind: AvailabilityDivision.AVAILABLE }
          : {}),
        ...(availableInstruments.includes("brass")
          ? { isAvailableBrass: AvailabilityDivision.AVAILABLE }
          : {}),
        ...(availableInstruments.includes("percussion")
          ? { isAvailablePercussion: AvailabilityDivision.AVAILABLE }
          : {}),
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
    const handleAvailableInstrumentsChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;

      const next = checked
        ? [...availableInstruments, value]
        : availableInstruments.filter((v) => v !== value);
      setAvailableInstruments(next);
      searchParams.delete("a");
      next.forEach((a) => searchParams.append("a", convertAvailableInstrumentToUrlParam(a)));

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
        <CheckboxGroup
          label={t("利用可能楽器")}
          values={availableInstruments}
          onChange={handleAvailableInstrumentsChange}
        >
          <Checkbox label={t("弦楽器")} value="strings" />
          <Checkbox label={t("木管楽器")} value="woodwind" />
          <Checkbox label={t("金管楽器")} value="brass" />
          <Checkbox label={t("打楽器")} value="percussion" />
        </CheckboxGroup>
      </BaseBox>
    );
  }, [tokyoWard, availableInstruments]);

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
      searchParams.set("p", "0");
      history.replace({ pathname: history.location.pathname, search: searchParams.toString() });
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
                            usageFee: formatUsageFee(info.weekday_usage_fee),
                          })}
                        </div>
                      )}
                      {info.holiday_usage_fee && (
                        <div>
                          {t("休日 {{ usageFee }}", {
                            usageFee: formatUsageFee(info.holiday_usage_fee),
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
  }, [loading, error, data]);

  return (
    <BaseBox className={classes.pageBox}>
      {renderSearchForm}
      {renderSearchResult}
    </BaseBox>
  );
};
