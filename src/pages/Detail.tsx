import { useQuery } from "@apollo/client";
import { endOfMonth } from "date-fns/esm";
import { ChangeEvent, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Detail_InstitutionDocument,
  Detail_InstitutionQuery,
  Detail_InstitutionQueryVariables,
  Detail_ReservationDocument,
  Detail_ReservationQuery,
  Detail_ReservationQueryVariables,
} from "../api/graphql-client";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
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
import { YearMonthSelection } from "../components/YearMonthSelection";
import { AvailabilityDivisionMap, EquipmentDivisionMap, TokyoWard } from "../constants/enums";
import { CONTAINER_WIDTH, INNER_WIDTH, WIDTHS } from "../constants/styles";
import { ReservationDivisionMap, ReservationStatusMap } from "../utils/enums";
import { formatDate, formatDatetime } from "../utils/format";
import { isValidUUID } from "../utils/id";
import { formatUsageFee } from "../utils/institution";
import { sortByReservationDivision, toYearMonthChips } from "../utils/reservation";
import { styled } from "../utils/theme";

const InstitutionTab = ({
  institution,
  loading,
}: {
  institution: Detail_InstitutionQuery["institution_by_pk"] | undefined;
  loading: boolean;
}) => {
  return (
    <div className={classes.institutionContainer}>
      <div className={classes.institutionLeftArea}>
        <div className={classes.institutionRow}>
          <Input
            label="定員（人）"
            size="small"
            value={institution?.capacity}
            loading={loading}
            readOnly={true}
          />
          <Input
            label="面積（㎡）"
            size="small"
            value={institution?.area}
            loading={loading}
            readOnly={true}
          />
        </div>
        <div className={classes.institutionRow}>
          <Input
            label="利用料金（平日）"
            size="full"
            value={formatUsageFee(institution?.tokyo_ward, institution?.weekday_usage_fee)}
            loading={loading}
            readOnly={true}
          />
        </div>
        <div className={classes.institutionRow}>
          <Input
            label="利用料金（休日）"
            size="full"
            value={formatUsageFee(institution?.tokyo_ward, institution?.holiday_usage_fee)}
            loading={loading}
            readOnly={true}
          />
        </div>
        <div className={classes.institutionRow}>
          <Input
            label="弦楽器"
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_strings]}
            loading={loading}
            readOnly={true}
          />
          <Input
            label="木管楽器"
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_woodwind]}
            loading={loading}
            readOnly={true}
          />
          <Input
            label="金管楽器"
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_brass]}
            loading={loading}
            readOnly={true}
          />
          <Input
            label="打楽器"
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_percussion]}
            loading={loading}
            readOnly={true}
          />
        </div>
        <div className={classes.institutionRow}>
          <Input
            label="譜面台"
            size="small"
            value={EquipmentDivisionMap[institution?.is_equipped_music_stand]}
            loading={loading}
            readOnly={true}
          />
          <Input
            label="ピアノ"
            size="small"
            value={EquipmentDivisionMap[institution?.is_equipped_piano]}
            loading={loading}
            readOnly={true}
          />
        </div>
        <div className={classes.institutionRow}>
          <Input
            label="公式サイト"
            size="full"
            value={institution?.website_url}
            loading={loading}
            readOnly={true}
          />
        </div>
        <div className={classes.institutionRow}>
          <Input
            label="レイアウト図"
            size="full"
            value={institution?.layout_image_url}
            loading={loading}
            readOnly={true}
          />
        </div>
        <div className={classes.institutionRow}>
          <Input
            label="住所"
            size="medium"
            value={institution?.address}
            loading={loading}
            readOnly={true}
          />
          <Input
            label="抽選期間"
            size="large"
            value={institution?.lottery_period}
            loading={loading}
            readOnly={true}
          />
        </div>
        <div className={classes.institutionRow}>
          <Input
            size="full"
            label="備考"
            value={institution?.note}
            loading={loading}
            readOnly={true}
            multiline={true}
          />
        </div>
      </div>
      <div className={classes.institutionRightArea}>{/** TODO */}</div>
    </div>
  );
};

const today = new Date();

const ReservationTab = ({
  id,
  tokyoWard,
  minDate,
  maxDate,
}: {
  id: string;
  tokyoWard: TokyoWard | undefined;
  minDate: string | undefined;
  maxDate: string | undefined;
}) => {
  const yearMonthChips = useMemo(
    () => toYearMonthChips(new Date(minDate ?? today), new Date(maxDate ?? today)),
    [minDate, maxDate]
  );
  const [page, setPage] = useState(1);
  const startDate = `${yearMonthChips[page].value}-01`;
  const endDate = endOfMonth(new Date(startDate));

  const { loading, data, error } = useQuery<
    Detail_ReservationQuery,
    Detail_ReservationQueryVariables
  >(Detail_ReservationDocument, {
    variables: { id, startDate, endDate },
    context: {
      headers: {
        Authorization: TOKEN ? `Bearer ${TOKEN}` : "",
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const { reservation } = data || {};

  return (
    <>
      <YearMonthSelection page={page} yearMonthChips={yearMonthChips} handleChange={setPage} />
      <div className={classes.reservationContainer}>
        {loading ? (
          <div className={classes.reservationNoData}>
            <Spinner />
          </div>
        ) : !tokyoWard || !reservation?.length ? (
          <div className={classes.reservationNoData} />
        ) : (
          <TableContainer className={classes.reservationTableContainer}>
            <Table stickyHeader={true}>
              <TableHead>
                <TableRow>
                  <TableCell className={classes.reservationTableCell} variant="head" size="small">
                    日付
                  </TableCell>
                  {sortByReservationDivision(reservation[0]?.reservation).map(([division]) => (
                    <TableCell
                      key={division}
                      className={classes.reservationTableCell}
                      variant="head"
                      size="small"
                    >
                      {ReservationDivisionMap[tokyoWard]?.[division]}
                    </TableCell>
                  ))}
                  <TableCell className={classes.reservationTableCell} variant="head" size="small">
                    取得日時
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservation.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className={classes.reservationTableCell} size="small">
                      {formatDate(row.date)}
                    </TableCell>
                    {sortByReservationDivision(row.reservation).map(([, status], i) => (
                      <TableCell className={classes.reservationTableCell} key={i} size="small">
                        {ReservationStatusMap[tokyoWard]?.[status]}
                      </TableCell>
                    ))}
                    <TableCell className={classes.reservationTableCell} size="small">
                      {formatDatetime(row.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>
    </>
  );
};

type Tab = "institution" | "reservation";

export default () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("institution");
  const handleTabChange = (_: ChangeEvent<unknown>, newValue: Tab) => setTab(newValue);

  const { loading, data, error } = useQuery<
    Detail_InstitutionQuery,
    Detail_InstitutionQueryVariables
  >(Detail_InstitutionDocument, {
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

  if (error) {
    throw new Error(error.message);
  }

  const { institution_by_pk, reservation_aggregate } = data || {};

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
        <Tab value="institution" label="施設情報" />
        <Tab
          value="reservation"
          label="予約状況"
          disabled={!reservation_aggregate?.aggregate?.count}
        />
      </TabGroup>
      <TabPanel className={classes.tabPanel} tabValue="institution" currentValue={tab}>
        <InstitutionTab institution={institution_by_pk} loading={loading} />
      </TabPanel>
      <TabPanel className={classes.tabPanel} tabValue="reservation" currentValue={tab}>
        <ReservationTab
          id={id}
          tokyoWard={institution_by_pk?.tokyo_ward}
          minDate={reservation_aggregate?.aggregate?.min?.date}
          maxDate={reservation_aggregate?.aggregate?.max?.date}
        />
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
  institutionContainer: `${PREFIX}-institutionContainer`,
  institutionLeftArea: `${PREFIX}-institutionLeftArea`,
  institutionRow: `${PREFIX}-institutionRow`,
  institutionRightArea: `${PREFIX}-institutionRightArea`,
  reservationContainer: `${PREFIX}-reservationContainer`,
  reservationNoData: `${PREFIX}-reservationNoData`,
  reservationTableContainer: `${PREFIX}-reservationTableContainer`,
  reservationTableCell: `${PREFIX}-reservationTableCell`,
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
  [`.${classes.institutionContainer}`]: {
    display: "flex",
    justifyContent: "space-between",
  },
  [`.${classes.institutionLeftArea}`]: {
    width: 840,
  },
  [`.${classes.institutionRow}`]: {
    display: "flex",
    gap: 40,
    [`+ .${classes.institutionRow}`]: {
      marginTop: 24,
    },
  },
  [`.${classes.institutionRightArea}`]: {
    width: 384,
  },
  [`.${classes.reservationContainer}`]: {
    marginTop: 20,
    height: 520,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.palette.grey[300], // TODO dark mode
    borderRadius: theme.shape.borderRadius,
  },
  [`.${classes.reservationNoData}`]: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  [`.${classes.reservationTableContainer}`]: {
    maxHeight: 516,
    overflowX: "auto",
  },
  [`.${classes.reservationTableCell}`]: {
    whiteSpace: "nowrap",
  },
}));
