import { useQuery } from "@apollo/client";
import MuiPaper from "@material-ui/core/Paper";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import React, { ChangeEvent, FC, MouseEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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
  TablePagination,
  TableRow,
} from "../components/Table";
import { AvailabilityDivision, EquipmentDivision, TokyoWard } from "../constants/enums";
import { routePath } from "../constants/routes";
import { SupportedTokyoWards } from "../utils/enums";
import { formatUsageFee } from "../utils/institution";

const useStyles = makeStyles((theme) =>
  createStyles({
    pageBox: {
      width: "100%",
      minWidth: 1200,
    },
    searchBox: {
      margin: "40px auto 0",
      padding: "24px 0",
      width: 1200,
      background: theme.palette.grey[200],
    },
    resultBox: {
      margin: "24px auto 40px",
      width: 1200,
    },
  })
);

export const Institution: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [tokyoWard, setTokyoWard] = useState<TokyoWard>(TokyoWard.INVALID);
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);
  const [equipments, setEquipments] = useState<string[]>([]);

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
        ...(equipments.includes("musicstand")
          ? { isEquippedMusicStand: EquipmentDivision.EQUIPPED }
          : {}),
        ...(equipments.includes("piano") ? { isEquippedPiano: EquipmentDivision.EQUIPPED } : {}),
      },
    }
  );

  const renderSearchForm = useMemo(() => {
    const handleTokyoWardChange = (event: ChangeEvent<{ value: unknown }>): void => {
      setTokyoWard(event.target.value as TokyoWard);
      setPage(0);
    };
    const handleAvailableInstrumentsChange = (event: ChangeEvent<HTMLInputElement>): void => {
      setAvailableInstruments((prev) =>
        event.target.checked
          ? [...prev, event.target.value]
          : prev.filter((v) => v !== event.target.value)
      );
      setPage(0);
    };
    const handleEquipmentsChange = (event: ChangeEvent<HTMLInputElement>): void => {
      setEquipments((prev) =>
        event.target.checked
          ? [...prev, event.target.value]
          : prev.filter((v) => v !== event.target.value)
      );
      setPage(0);
    };

    return (
      <BaseBox className={classes.searchBox} display="flex" justifyContent="space-around">
        <Select
          label={t("区")}
          value={tokyoWard}
          size="middle"
          onChange={handleTokyoWardChange}
          selectOptions={SupportedTokyoWards}
        />
        <CheckboxGroup
          label={t("利用可能楽器")}
          values={availableInstruments}
          onChange={handleAvailableInstrumentsChange}
          size="large"
        >
          <Checkbox label={t("弦楽器")} value="strings" />
          <Checkbox label={t("木管楽器")} value="woodwind" />
          <Checkbox label={t("金管楽器")} value="brass" />
          <Checkbox label={t("打楽器")} value="percussion" />
        </CheckboxGroup>
        <CheckboxGroup
          label={t("付帯設備")}
          values={equipments}
          onChange={handleEquipmentsChange}
          size="middle"
        >
          <Checkbox label={t("譜面台")} value="musicstand" />
          <Checkbox label={t("ピアノ")} value="piano" />
        </CheckboxGroup>
      </BaseBox>
    );
  }, [tokyoWard, availableInstruments, equipments]);

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
      return <BaseBox>{error.message}</BaseBox>;
    }

    const existsData = !loading && !!data?.institution.length;

    return (
      <BaseBox className={classes.resultBox}>
        <TablePagination
          component="div"
          rowsPerPageOptions={[10, 50, 100]}
          count={data?.institution_aggregate.aggregate?.count || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onChangePage={handleChangePage}
          onChangeRowsPerPage={handleChangeRowsPerPage}
          labelRowsPerPage={t("表示件数")}
          labelDisplayedRows={({ from, to, count }) =>
            t("{{ from }}-{{ to }} / {{ count }}", { from, to, count })
          }
        />
        <TableContainer component={MuiPaper}>
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
                  <TableCell variant="head">{t("住所")}</TableCell>
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {existsData &&
                data?.institution.map((info) => (
                  <TableRow key={info.id}>
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
                    <TableCell variant="body">{info.address}</TableCell>
                  </TableRow>
                ))}
              {!existsData && (
                <>
                  {loading ? (
                    [...Array(rowsPerPage)].map((_, index) => (
                      <TableRow key={`skeleton-row-${index}`}>
                        {[...Array(5)].map((_, i) => (
                          <TableCell key={`skeleton-cell-${i}`} variant="body">
                            <Skeleton variant="text" height="40px" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
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
