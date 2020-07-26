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
  InstitutionDocument,
  InstitutionQuery,
  InstitutionQueryVariables,
} from "../../api/graphql-client";
import { TokyoWard } from "../../constants/enums";
import { routePath } from "../../constants/routes";
import { ClientContext, getTokyoWard } from "../../utils/client";
import { fromEnumToUrlTokyoWard, SupportedTokyoWards } from "../../utils/enums";
import { formatUsageFee } from "../../utils/institution";
import NoResult from "../molucules/NoResult";
import Select from "../molucules/Select";

const useStyles = makeStyles((theme) =>
  createStyles({
    pageBox: {
      padding: 24,
    },
    searchBox: {
      padding: 24,
      marginBottom: 16,
      background: theme.palette.grey[200],
    },
    resultTable: {
      minWidth: 1080,
    },
  })
);

const Institution: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation("institution");
  const { clientNamespace, toggleClientNamespace } = useContext(ClientContext);
  const [tokyoWard, setTokyoWard] = useState<TokyoWard>(getTokyoWard(clientNamespace));
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const { loading, data, error } = useQuery<InstitutionQuery, InstitutionQueryVariables>(
    InstitutionDocument,
    {
      variables: {
        offset: page * rowsPerPage,
        limit: rowsPerPage,
      },
    }
  );

  const renderSearchForm = useMemo(() => {
    const handleTokyoWardChange = (event: React.ChangeEvent<{ value: unknown }>): void => {
      const newTokyoWard = event.target.value as TokyoWard;
      setTokyoWard(newTokyoWard);
      setPage(0);
      toggleClientNamespace(newTokyoWard);
    };
    return (
      <Box className={classes.searchBox}>
        <Grid container spacing={2}>
          <Grid item md={12} xs={12}>
            <Select
              label={t("区")}
              value={tokyoWard}
              onChange={handleTokyoWardChange}
              selectOptions={SupportedTokyoWards}
            />
          </Grid>
        </Grid>
      </Box>
    );
  }, [tokyoWard, classes.searchBox, t, toggleClientNamespace]);

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
          count={data?.institution_aggregate.aggregate?.count || 0}
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
                <TableCell variant="head" align="right">
                  {t("定員(人)")}
                </TableCell>
                <TableCell variant="head" align="right">
                  {t("面積(㎡)")}
                </TableCell>
                <TableCell variant="head">{t("利用料金")}</TableCell>
                <TableCell variant="head">{t("住所")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <>
                  {[...Array(10)].map((_, index) => (
                    <TableRow key={`row-${index}`}>
                      {[...Array(5)].map((_, i) => (
                        <TableCell key={`cell-${i}`} variant="body">
                          <Skeleton variant="text" height="40px" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : (
                <>
                  {data?.institution && data?.institution.length > 0 ? (
                    <>
                      {data.institution.map((info, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {info.id ? (
                              <Link
                                to={routePath.institutionDetail
                                  .replace(":tokyoWard", fromEnumToUrlTokyoWard(tokyoWard))
                                  .replace(":id", info.id)}
                              >
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
                              <p>
                                {t("平日", {
                                  usageFee: formatUsageFee(info.weekday_usage_fee),
                                })}
                              </p>
                            )}
                            {info.holiday_usage_fee && (
                              <p>
                                {t("休日", {
                                  usageFee: formatUsageFee(info.holiday_usage_fee),
                                })}
                              </p>
                            )}
                          </TableCell>
                          <TableCell variant="body">{info.address}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5}>
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
  }, [loading, error, data, classes.resultTable, t, page, rowsPerPage, tokyoWard]);

  return (
    <Box className={classes.pageBox}>
      {renderSearchForm}
      {renderSearchResult}
    </Box>
  );
};

export default Institution;
