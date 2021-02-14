import { useQuery } from "@apollo/client";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import { ChangeEvent, FC, MouseEvent, ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  InstitutionDocument,
  InstitutionQuery,
  InstitutionQueryVariables,
} from "../api/graphql-client";
import Box from "../components/atoms/Box";
import Grid from "../components/atoms/Grid";
import Paper from "../components/atoms/Paper";
import Skeleton from "../components/atoms/Skeleton";
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
import { TokyoWard } from "../constants/enums";
import { routePath } from "../constants/routes";
import { SupportedTokyoWards } from "../utils/enums";
import { formatUsageFee } from "../utils/institution";

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
  const [tokyoWard, setTokyoWard] = useState<TokyoWard>(TokyoWard.KOUTOU);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { loading, data, error } = useQuery<InstitutionQuery, InstitutionQueryVariables>(
    InstitutionDocument,
    {
      variables: {
        offset: page * rowsPerPage,
        limit: rowsPerPage,
        tokyoWard,
      },
    }
  );

  const renderSearchForm = useMemo(() => {
    const handleTokyoWardChange = (event: ChangeEvent<{ value: unknown }>): void => {
      const newTokyoWard = event.target.value as TokyoWard;
      setTokyoWard(newTokyoWard);
      setPage(0);
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
  }, [tokyoWard, classes.searchBox, t]);

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
                              <Link to={routePath.institutionDetail.replace(":id", info.id)}>
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
