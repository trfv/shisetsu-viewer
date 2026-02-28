import { formatISO } from "date-fns";
import { useCallback, useState, type ChangeEvent } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  INSTITUTION_DETAIL_QUERY,
  INSTITUTION_RESERVATIONS_QUERY,
  type InstitutionDetailNode,
  type InstitutionDetailQueryData,
  type InstitutionReservationsQueryData,
} from "../api/queries";
import { useGraphQLQuery } from "../hooks/useGraphQLQuery";
import { IconButton } from "../components/IconButton";
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
import { OpenInNewIcon } from "../components/icons";
import { ROUTES } from "../constants/routes";
import { WIDTHS } from "../constants/styles";
import { useAuth0 } from "../contexts/Auth0";
import { useIsMobile } from "../hooks/useIsMobile";
import { AvailabilityDivisionMap, EquipmentDivisionMap } from "../utils/enums";
import { formatDatetime, formatMonthDate } from "../utils/format";
import { isValidUuid } from "../utils/id";
import { formatUsageFee } from "../utils/institution";
import { ReservationDivisionMap, ReservationStatusMap } from "../utils/municipality";
import { sortByReservationDivision } from "../utils/reservation";
import styles from "./Detail.module.css";

const InstitutionTab = ({
  institution,
  loading,
}: {
  institution: InstitutionDetailNode | undefined;
  loading: boolean;
}) => {
  return (
    <div className={styles["institutionContainer"]}>
      <div className={styles["institutionLeftArea"]}>
        <div className={styles["institutionRow"]}>
          <Input
            label="定員（人）"
            loading={loading}
            readOnly={true}
            size="small"
            value={institution?.capacity}
          />
          <Input
            label="面積（㎡）"
            loading={loading}
            readOnly={true}
            size="small"
            value={institution?.area}
          />
        </div>
        <div className={styles["institutionRow"]}>
          <Input
            label="利用料金（平日）"
            loading={loading}
            readOnly={true}
            size="full"
            value={formatUsageFee(institution?.municipality, institution?.weekday_usage_fee)}
          />
        </div>
        <div className={styles["institutionRow"]}>
          <Input
            label="利用料金（休日）"
            loading={loading}
            readOnly={true}
            size="full"
            value={formatUsageFee(institution?.municipality, institution?.holiday_usage_fee)}
          />
        </div>
        <div className={styles["institutionRow"]}>
          <Input
            label="弦楽器"
            loading={loading}
            readOnly={true}
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_strings]}
          />
          <Input
            label="木管楽器"
            loading={loading}
            readOnly={true}
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_woodwind]}
          />
          <Input
            label="金管楽器"
            loading={loading}
            readOnly={true}
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_brass]}
          />
          <Input
            label="打楽器"
            loading={loading}
            readOnly={true}
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_percussion]}
          />
        </div>
        <div className={styles["institutionRow"]}>
          <Input
            label="譜面台"
            loading={loading}
            readOnly={true}
            size="small"
            value={EquipmentDivisionMap[institution?.is_equipped_music_stand]}
          />
          <Input
            label="ピアノ"
            loading={loading}
            readOnly={true}
            size="small"
            value={EquipmentDivisionMap[institution?.is_equipped_piano]}
          />
        </div>
        <div className={styles["institutionRow"]}>
          <Input
            label="住所"
            loading={loading}
            readOnly={true}
            size="medium"
            value={institution?.address}
          />
          <Input
            label="抽選期間"
            loading={loading}
            readOnly={true}
            size="large"
            value={institution?.lottery_period}
          />
        </div>
        <div className={styles["institutionRow"]}>
          <Input
            label="備考"
            loading={loading}
            multiline={true}
            readOnly={true}
            size="full"
            value={institution?.note}
          />
        </div>
      </div>
      <div className={styles["institutionRightArea"]}>{/** TODO */}</div>
    </div>
  );
};

const ReservationTab = ({ id, municipality }: { id: string; municipality: string }) => {
  /* istanbul ignore next -- municipality is always defined */
  if (!municipality) {
    throw new Error("municipality is undefined");
  }

  const isMobile = useIsMobile();
  const { loading, data, error } = useGraphQLQuery<InstitutionReservationsQueryData>(
    INSTITUTION_RESERVATIONS_QUERY,
    { id, startDate: formatISO(today, { representation: "date" }) }
  );

  if (error) {
    throw new Error(error.message);
  }

  const reservations = data?.reservations_connection.edges.map((e) => e.node) ?? [];

  return (
    <div className={styles["reservationContainer"]}>
      {loading ? (
        <div className={styles["reservationNoData"]}>
          <Spinner />
        </div>
      ) : !reservations?.length ||
        MUNICIPALITIES_WITHOUT_RESERVATION_DATA.includes(municipality) ? (
        <div className={styles["reservationNoData"]}>表示するデータが存在しません</div>
      ) : isMobile ? (
        <div className={styles["reservationCardList"]}>
          {reservations.map((row, index) => (
            <div className={styles["reservationCard"]} key={index}>
              <div className={styles["reservationCardDate"]}>{formatMonthDate(row.date)}</div>
              <div className={styles["reservationCardDivisions"]}>
                {sortByReservationDivision(row.reservation).map(([division, status], i) => (
                  <div className={styles["reservationCardDivisionItem"]} key={i}>
                    <span>{ReservationDivisionMap[municipality]?.[division]}</span>
                    <span>{ReservationStatusMap[municipality]?.[status]}</span>
                  </div>
                ))}
              </div>
              <div className={styles["reservationCardUpdatedAt"]}>
                {formatDatetime(row.updated_at)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <TableContainer>
          <Table stickyHeader={true}>
            <TableHead>
              <TableRow>
                <TableCell className={styles["reservationTableCell"]} size="small" variant="head">
                  日付
                </TableCell>
                {sortByReservationDivision(reservations[0]?.reservation).map(([division]) => (
                  <TableCell
                    className={styles["reservationTableCell"]}
                    key={division}
                    size="small"
                    variant="head"
                  >
                    {ReservationDivisionMap[municipality]?.[division]}
                  </TableCell>
                ))}
                <TableCell className={styles["reservationTableCell"]} size="small" variant="head">
                  取得日時
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className={styles["reservationTableCell"]} size="small">
                    {formatMonthDate(row.date)}
                  </TableCell>
                  {sortByReservationDivision(row.reservation).map(([, status], i) => (
                    <TableCell className={styles["reservationTableCell"]} key={i} size="small">
                      {ReservationStatusMap[municipality]?.[status]}
                    </TableCell>
                  ))}
                  <TableCell className={styles["reservationTableCell"]} size="small">
                    {formatDatetime(row.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};

type TabType = "institution" | "reservation";

const today = new Date();

// システムの改悪により更新困難な自治体
const MUNICIPALITIES_WITHOUT_RESERVATION_DATA = [
  "MUNICIPALITY_BUNKYO",
  "MUNICIPALITY_EDOGAWA",
  "MUNICIPALITY_TOSHIMA",
];

export default () => {
  const { id } = useParams<"id">();
  const [tab, setTab] = useState<TabType>("institution");
  const {
    userInfo: { anonymous, trial },
  } = useAuth0();

  const handleTabChange = useCallback(
    (_: ChangeEvent<unknown>, newValue: TabType) => setTab(newValue),
    []
  );

  if (!id || !isValidUuid(id)) {
    return <Navigate replace={true} to={ROUTES.top} />;
  }

  const { loading, data, error } = useGraphQLQuery<InstitutionDetailQueryData>(
    INSTITUTION_DETAIL_QUERY,
    { id }
  );

  if (error) {
    throw new Error(error.message);
  }

  const institution = data?.institutions_connection.edges[0]?.node;

  return (
    <main className={styles["pageBox"]}>
      <div className={styles["title"]}>
        {loading ? (
          <Skeleton height={40} width={WIDTHS.large} />
        ) : (
          <h2>
            {`${institution?.building ?? ""} ${institution?.institution ?? ""}`}
            {institution?.website_url && (
              <IconButton href={institution?.website_url} target="_blank">
                <OpenInNewIcon />
              </IconButton>
            )}
          </h2>
        )}
      </div>
      <TabGroup className={styles["tabGroup"]} onChange={handleTabChange} value={tab}>
        <Tab label="施設情報" value="institution" />
        <Tab disabled={anonymous || trial} label="予約状況" value="reservation" />
      </TabGroup>
      <TabPanel className={styles["tabPanel"]} currentValue={tab} tabValue="institution">
        <InstitutionTab institution={institution} loading={loading} />
      </TabPanel>
      <TabPanel className={styles["tabPanel"]} currentValue={tab} tabValue="reservation">
        {!(anonymous || trial) && (
          <ReservationTab id={id} municipality={institution?.municipality || ""} />
        )}
      </TabPanel>
    </main>
  );
};
