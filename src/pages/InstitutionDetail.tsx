import { useQuery } from "@apollo/client";
import { createStyles, makeStyles } from "@material-ui/core";
import { ChangeEvent, FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  InstitutionDetailDocument,
  InstitutionDetailQuery,
  InstitutionDetailQueryVariables,
} from "../api/graphql-client";
import Box from "../components/atoms/Box";
import Grid from "../components/atoms/Grid";
import Paper from "../components/atoms/Paper";
import Skeleton from "../components/atoms/Skeleton";
import Container from "../components/molecules/Container";
import { Tab, TabPanel, Tabs } from "../components/molecules/Tab";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "../components/molecules/Table";
import {
  AvailabilityDivision,
  EquipmentDivision,
  ReservationDivision,
  ReservationStatus,
  TokyoWard,
} from "../constants/enums";
import { APPOLO_CLIENTS, getClientNamespace } from "../utils/client";
import { isValidUUID } from "../utils/common";
import { fromUrlToEnumTokyoWard, getEnumLabel } from "../utils/enums";
import { formatDate } from "../utils/format";
import { formatUsageFee } from "../utils/institution";
import { sortByReservationDivision } from "../utils/reservation";

const useStyles = makeStyles((theme) =>
  createStyles({
    pageBox: {
      padding: 24,
    },
    rowValue: {
      wordBreak: "break-all",
    },
    reservationTable: {
      minWidth: 480,
      overflowX: "scroll",
    },
  })
);

type Tab = "institutionInfo" | "institutionReservation";

const InstitutionDetail: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation("institution");
  const { id, tokyoWard } = useParams<{ id: string; tokyoWard: string }>();
  const [tab, setTab] = useState<Tab>("institutionInfo");
  const handleTabChange = (_: ChangeEvent<{}>, newValue: Tab) => setTab(newValue);

  const options = {
    variables: {
      id,
    },
    client: APPOLO_CLIENTS[getClientNamespace(fromUrlToEnumTokyoWard(tokyoWard) as TokyoWard)],
  };

  const { loading, data, error } = useQuery<
    InstitutionDetailQuery,
    InstitutionDetailQueryVariables
  >(InstitutionDetailDocument, options);

  if (!isValidUUID(id)) {
    return null;
  }

  const { institution_by_pk, reservation } = data || {};

  const renderInstitutionRow = (label: string, value: string | JSX.Element | undefined) => {
    return (
      <Grid item md={6} xs={12}>
        <Grid>
          <strong>{label}</strong>
        </Grid>
        <Grid className={classes.rowValue}>{loading ? <Skeleton /> : value}</Grid>
      </Grid>
    );
  };

  return (
    <Container>
      <Box className={classes.pageBox}>
        {error ? (
          error.message
        ) : (
          <>
            <Tabs value={tab} onChange={handleTabChange}>
              <Tab value="institutionInfo" label={t("施設情報")} />
              <Tab
                value="institutionReservation"
                label={t("予約状況")}
                disabled={!reservation?.length}
              />
            </Tabs>
            <TabPanel tabValue="institutionInfo" currentValue={tab}>
              <Grid container spacing={2}>
                {renderInstitutionRow(t("建物名"), institution_by_pk?.building)}
                {renderInstitutionRow(t("施設名"), institution_by_pk?.institution)}
                {renderInstitutionRow(
                  t("定員"),
                  institution_by_pk?.capacity
                    ? `${institution_by_pk.capacity}${t("人")}`
                    : undefined
                )}
                {renderInstitutionRow(
                  t("面積"),
                  institution_by_pk?.area ? `${institution_by_pk.area}${t("㎡")}` : undefined
                )}
                {renderInstitutionRow(
                  t("時間帯"),
                  institution_by_pk?.reservation_division
                    ?.map((div: ReservationDivision) => getEnumLabel<ReservationDivision>(div))
                    .join(",")
                )}
                {renderInstitutionRow(
                  t("利用料金（平日）"),
                  formatUsageFee(institution_by_pk?.weekday_usage_fee)
                )}
                {renderInstitutionRow(
                  t("利用料金（休日）"),
                  formatUsageFee(institution_by_pk?.holiday_usage_fee)
                )}
                {renderInstitutionRow(t("住所"), institution_by_pk?.address)}
                {renderInstitutionRow(
                  t("弦楽器"),
                  getEnumLabel<AvailabilityDivision>(institution_by_pk?.is_available_strings)
                )}
                {renderInstitutionRow(
                  "木管楽器",
                  getEnumLabel<AvailabilityDivision>(institution_by_pk?.is_available_woodwind)
                )}
                {renderInstitutionRow(
                  t("金管楽器"),
                  getEnumLabel<AvailabilityDivision>(institution_by_pk?.is_available_brass)
                )}
                {renderInstitutionRow(
                  t("打楽器"),
                  getEnumLabel<AvailabilityDivision>(institution_by_pk?.is_available_percussion)
                )}
                {renderInstitutionRow(
                  t("譜面台"),
                  getEnumLabel<EquipmentDivision>(institution_by_pk?.is_equipped_music_stand)
                )}
                {renderInstitutionRow(
                  t("ピアノ"),
                  getEnumLabel<EquipmentDivision>(institution_by_pk?.is_equipped_piano)
                )}
                {renderInstitutionRow(
                  t("公式サイト"),
                  institution_by_pk?.website_url ? (
                    <a
                      href={institution_by_pk?.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {institution_by_pk.website_url}
                    </a>
                  ) : undefined
                )}
                {renderInstitutionRow(
                  t("レイアウト図"),
                  institution_by_pk?.layout_image_url ? (
                    <a
                      href={institution_by_pk.layout_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {institution_by_pk.layout_image_url}
                    </a>
                  ) : undefined
                )}
                {renderInstitutionRow(t("抽選期間"), institution_by_pk?.lottery_period)}
                {renderInstitutionRow(t("備考"), institution_by_pk?.note)}
              </Grid>
            </TabPanel>
            <TabPanel tabValue="institutionReservation" currentValue={tab}>
              {reservation && reservation.length > 0 && (
                <TableContainer component={Paper}>
                  <Table className={classes.reservationTable}>
                    <TableHead>
                      <TableRow>
                        <TableCell variant="head">{t("日付")}</TableCell>
                        {sortByReservationDivision(reservation[0].reservation).map(
                          ([division, _]) => (
                            <TableCell key={division} variant="head">
                              {getEnumLabel<ReservationDivision>(division)}
                            </TableCell>
                          )
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reservation.map((info, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(info.date)}</TableCell>
                          {sortByReservationDivision(info.reservation).map(([_, status], i) => (
                            <TableCell key={i}>{getEnumLabel<ReservationStatus>(status)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </>
        )}
      </Box>
    </Container>
  );
};

export default InstitutionDetail;
