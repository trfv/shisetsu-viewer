import { useQuery } from "@apollo/client";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import React, { ChangeEvent, FC, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  InstitutionDetailDocument,
  InstitutionDetailQuery,
  InstitutionDetailQueryVariables,
} from "../api/graphql-client";
import { BaseBox } from "../components/Box";
import { Skeleton } from "../components/Skeleton";
import { Tab } from "../components/Tab";
import { TabGroup, TabPanel } from "../components/TabGroup";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "../components/Table";
import {
  AvailabilityDivision,
  EquipmentDivision,
  ReservationDivision,
  ReservationStatus,
} from "../constants/enums";
import { CONTAINER_WIDTH, INNER_WIDTH } from "../constants/styles";
import { isValidUUID } from "../utils/common";
import { getEnumLabel } from "../utils/enums";
import { formatDate, formatDatetime } from "../utils/format";
import { formatUsageFee, getGoogleMapLink } from "../utils/institution";
import { sortByReservationDivision } from "../utils/reservation";

const useStyles = makeStyles(() =>
  createStyles({
    pageBox: {
      width: "100%",
      minWidth: CONTAINER_WIDTH,
    },
    tabGroup: {
      margin: "24px auto 0",
      width: INNER_WIDTH,
    },
    infoTabPanel: {
      margin: "24px auto 40px",
      width: INNER_WIDTH,
    },
    reservationTabPanel: {
      margin: "24px auto 40px",
      width: INNER_WIDTH,
    },
  })
);

type Tab = "info" | "reservation";

export const InstitutionDetail: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("info");
  const handleTabChange = (_: ChangeEvent<{}>, newValue: Tab) => setTab(newValue);

  const options = {
    variables: {
      id,
    },
  };

  const { loading, data, error } = useQuery<
    InstitutionDetailQuery,
    InstitutionDetailQueryVariables
  >(InstitutionDetailDocument, options);

  if (!isValidUUID(id)) {
    return null;
  }

  const { institution_by_pk, reservation } = data ?? {};

  const renderInstitutionRow = useCallback(
    (label: string, value: string | JSX.Element | undefined, width = "50%") => {
      return (
        <BaseBox width={width} padding="8px 0">
          <BaseBox component="label">
            <strong>{label}</strong>
          </BaseBox>
          <BaseBox component="div">{loading ? <Skeleton /> : value}</BaseBox>
        </BaseBox>
      );
    },
    [institution_by_pk]
  );

  if (error) {
    throw new Error(error.message);
  }

  return (
    <BaseBox className={classes.pageBox}>
      <TabGroup className={classes.tabGroup} value={tab} onChange={handleTabChange}>
        <Tab value="info" label={t("施設情報")} />
        <Tab value="reservation" label={t("予約状況")} disabled={!reservation?.length} />
      </TabGroup>
      <TabPanel className={classes.infoTabPanel} tabValue="info" currentValue={tab}>
        <BaseBox display="flex" flexWrap="wrap">
          {renderInstitutionRow(t("建物名"), institution_by_pk?.building)}
          {renderInstitutionRow(t("施設名"), institution_by_pk?.institution)}
          {renderInstitutionRow(
            t("定員"),
            institution_by_pk?.capacity ? `${institution_by_pk.capacity}${t("人")}` : undefined
          )}
          {renderInstitutionRow(
            t("面積"),
            institution_by_pk?.area ? `${institution_by_pk.area}${t("㎡")}` : undefined
          )}
          {renderInstitutionRow(
            t("利用料金（平日）"),
            formatUsageFee(institution_by_pk?.weekday_usage_fee)
          )}
          {renderInstitutionRow(
            t("利用料金（休日）"),
            formatUsageFee(institution_by_pk?.holiday_usage_fee)
          )}
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
              <a href={institution_by_pk?.website_url} target="_blank" rel="noopener noreferrer">
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
          {renderInstitutionRow(
            t("住所"),
            institution_by_pk?.address ? (
              <a
                href={getGoogleMapLink(institution_by_pk.address)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {institution_by_pk.address}
              </a>
            ) : undefined
          )}
          {renderInstitutionRow(t("抽選期間"), institution_by_pk?.lottery_period)}
          {renderInstitutionRow(t("備考"), institution_by_pk?.note, "100%")}
        </BaseBox>
      </TabPanel>
      <TabPanel className={classes.reservationTabPanel} tabValue="reservation" currentValue={tab}>
        {reservation && reservation.length > 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell variant="head">{t("日付")}</TableCell>
                  {sortByReservationDivision(reservation[0].reservation).map(([division, _]) => (
                    <TableCell key={division} variant="head">
                      {getEnumLabel<ReservationDivision>(division)}
                    </TableCell>
                  ))}
                  <TableCell variant="head">{t("更新日時")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservation.map((info, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDate(info.date)}</TableCell>
                    {sortByReservationDivision(info.reservation).map(([_, status], i) => (
                      <TableCell key={i}>{getEnumLabel<ReservationStatus>(status)}</TableCell>
                    ))}
                    <TableCell>{formatDatetime(info.updated_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
    </BaseBox>
  );
};
