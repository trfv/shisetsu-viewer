import { useQuery } from "@apollo/client";
import React, { ChangeEvent, FC, useState } from "react";
import { useParams } from "react-router-dom";
import {
  InstitutionDetailDocument,
  InstitutionDetailQuery,
  InstitutionDetailQueryVariables,
} from "../api/graphql-client";
import { Input } from "../components/Input";
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
import { TOKEN } from "../components/utils/AuthGuardRoute";
import { AvailabilityDivisionMap, EquipmentDivisionMap } from "../constants/enums";
import { CONTAINER_WIDTH, INNER_WIDTH, WIDTHS } from "../constants/styles";
import { isValidUUID } from "../utils/common";
import { ReservationDivisionMap, ReservationStatusMap } from "../utils/enums";
import { formatDate, formatDatetime } from "../utils/format";
import { formatUsageFee } from "../utils/institution";
import { sortByReservationDivision } from "../utils/reservation";
import { styled } from "../utils/theme";

type Tab = "info" | "reservation";

export const InstitutionDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("info");
  const handleTabChange = (_: ChangeEvent<unknown>, newValue: Tab) => setTab(newValue);

  const { loading, data, error } = useQuery<
    InstitutionDetailQuery,
    InstitutionDetailQueryVariables
  >(InstitutionDetailDocument, {
    variables: { id },
    context: {
      headers: {
        Authorization: TOKEN ? `Bearer ${TOKEN}` : "",
      },
    },
  });

  if (!isValidUUID(id)) {
    return null;
  }

  const { institution_by_pk, reservation } = data ?? {};

  if (error) {
    throw new Error(error.message);
  }

  return (
    <StyledInstitutionDetail className={classes.pageBox}>
      <div className={classes.title}>
        {loading ? (
          <Skeleton width={WIDTHS.large} height={36} />
        ) : (
          <h2>{`${institution_by_pk?.building ?? ""} ${institution_by_pk?.institution ?? ""}`}</h2>
        )}
      </div>
      <TabGroup className={classes.tabGroup} value={tab} onChange={handleTabChange}>
        <Tab value="info" label="施設情報" />
        <Tab value="reservation" label="予約状況" disabled={!reservation?.length} />
      </TabGroup>
      <TabPanel className={classes.tabPanel} tabValue="info" currentValue={tab}>
        <div className={classes.infoContainer}>
          <div className={classes.infoLeftArea}>
            <div className={classes.infoRow}>
              <Input
                label="定員（人）"
                size="small"
                value={institution_by_pk?.capacity}
                loading={loading}
                readOnly={true}
              />
              <Input
                label="面積（㎡）"
                size="small"
                value={institution_by_pk?.area}
                loading={loading}
                readOnly={true}
              />
            </div>
            <div className={classes.infoRow}>
              <Input
                label="利用料金（平日）"
                size="full"
                value={formatUsageFee(
                  institution_by_pk?.tokyo_ward,
                  institution_by_pk?.weekday_usage_fee
                )}
                loading={loading}
                readOnly={true}
              />
            </div>
            <div className={classes.infoRow}>
              <Input
                label="利用料金（休日）"
                size="full"
                value={formatUsageFee(
                  institution_by_pk?.tokyo_ward,
                  institution_by_pk?.holiday_usage_fee
                )}
                loading={loading}
                readOnly={true}
              />
            </div>
            <div className={classes.infoRow}>
              <Input
                label="弦楽器"
                size="small"
                value={AvailabilityDivisionMap[institution_by_pk?.is_available_strings]}
                loading={loading}
                readOnly={true}
              />
              <Input
                label="木管楽器"
                size="small"
                value={AvailabilityDivisionMap[institution_by_pk?.is_available_woodwind]}
                loading={loading}
                readOnly={true}
              />
              <Input
                label="金管楽器"
                size="small"
                value={AvailabilityDivisionMap[institution_by_pk?.is_available_brass]}
                loading={loading}
                readOnly={true}
              />
              <Input
                label="打楽器"
                size="small"
                value={AvailabilityDivisionMap[institution_by_pk?.is_available_percussion]}
                loading={loading}
                readOnly={true}
              />
            </div>
            <div className={classes.infoRow}>
              <Input
                label="譜面台"
                size="small"
                value={EquipmentDivisionMap[institution_by_pk?.is_equipped_music_stand]}
                loading={loading}
                readOnly={true}
              />
              <Input
                label="ピアノ"
                size="small"
                value={EquipmentDivisionMap[institution_by_pk?.is_equipped_piano]}
                loading={loading}
                readOnly={true}
              />
            </div>
            <div className={classes.infoRow}>
              <Input
                label="公式サイト"
                size="full"
                value={institution_by_pk?.website_url}
                loading={loading}
                readOnly={true}
              />
            </div>
            <div className={classes.infoRow}>
              <Input
                label="レイアウト図"
                size="full"
                value={institution_by_pk?.layout_image_url}
                loading={loading}
                readOnly={true}
              />
            </div>
            <div className={classes.infoRow}>
              <Input
                label="住所"
                size="medium"
                value={institution_by_pk?.address}
                loading={loading}
                readOnly={true}
              />
              <Input
                label="抽選期間"
                size="large"
                value={institution_by_pk?.lottery_period}
                loading={loading}
                readOnly={true}
              />
            </div>
            <div className={classes.infoRow}>
              <Input
                size="full"
                label="備考"
                value={institution_by_pk?.note}
                loading={loading}
                readOnly={true}
                multiline={true}
              />
            </div>
          </div>
          <div className={classes.infoRightArea}>{/** TODO */}</div>
        </div>
      </TabPanel>
      <TabPanel className={classes.tabPanel} tabValue="reservation" currentValue={tab}>
        {!!reservation?.length && (
          <TableContainer className={classes.tableContainer}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell className={classes.tableCell} variant="head" size="small">
                    日付
                  </TableCell>
                  {sortByReservationDivision(reservation[0].reservation).map(([division]) => (
                    <TableCell
                      key={division}
                      className={classes.tableCell}
                      variant="head"
                      size="small"
                    >
                      {ReservationDivisionMap[institution_by_pk?.tokyo_ward]?.[division]}
                    </TableCell>
                  ))}
                  <TableCell className={classes.tableCell} variant="head" size="small">
                    更新日時
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservation.map((info, index) => (
                  <TableRow key={index}>
                    <TableCell className={classes.tableCell} size="small">
                      {formatDate(info.date)}
                    </TableCell>
                    {sortByReservationDivision(info.reservation).map(([, status], i) => (
                      <TableCell className={classes.tableCell} key={i} size="small">
                        {ReservationStatusMap[institution_by_pk?.tokyo_ward]?.[status]}
                      </TableCell>
                    ))}
                    <TableCell className={classes.tableCell} size="small">
                      {formatDatetime(info.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
    </StyledInstitutionDetail>
  );
};

const PREFIX = "InstitutionDetail";
const classes = {
  pageBox: `${PREFIX}-pageBox`,
  title: `${PREFIX}-title`,
  tabGroup: `${PREFIX}-tabGroup`,
  tabPanel: `${PREFIX}-tabPanel`,
  infoContainer: `${PREFIX}-infoContainer`,
  infoLeftArea: `${PREFIX}-infoLeftArea`,
  infoRow: `${PREFIX}-infoRow`,
  infoRightArea: `${PREFIX}-infoRightArea`,
  tableContainer: `${PREFIX}-tableContainer`,
  tableCell: `${PREFIX}-tableCell`,
};

const StyledInstitutionDetail = styled("main")(({ theme }) => ({
  [`&.${classes.pageBox}`]: {
    width: "100%",
    minWidth: CONTAINER_WIDTH,
  },
  [`.${classes.title}`]: {
    margin: "40px auto 0",
    width: INNER_WIDTH,
  },
  [`.${classes.tabGroup}`]: {
    margin: "24px auto 0",
    width: INNER_WIDTH,
  },
  [`.${classes.tabPanel}`]: {
    margin: "40px auto 0",
    width: INNER_WIDTH,
  },
  [`.${classes.infoContainer}`]: {
    display: "flex",
    justifyContent: "space-between",
  },
  [`.${classes.infoLeftArea}`]: {
    width: 840,
  },
  [`.${classes.infoRow}`]: {
    display: "flex",
    gap: 40,
    [`+ .${classes.infoRow}`]: {
      marginTop: 24,
    },
  },
  [`.${classes.infoRightArea}`]: {
    width: 384,
  },
  [`.${classes.tableContainer}`]: {
    overflowX: "auto",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.palette.grey[300], // TODO dark mode
    borderRadius: theme.shape.borderRadius,
  },
  [`.${classes.tableCell}`]: {
    whiteSpace: "nowrap",
  },
}));
