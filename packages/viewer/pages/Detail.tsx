import type { InstitutionDetail } from "@shisetsu-viewer/shared";
import { formatISO } from "date-fns";
import { Suspense, use, useCallback, useState, type ChangeEvent } from "react";
import { Redirect, useParams } from "wouter";

import { fetchInstitutionDetail, fetchInstitutionReservations } from "../api/endpoints";
import { IconButton } from "../components/IconButton";
import { OpenInNewIcon } from "../components/icons";
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
import { ROUTES } from "../constants/routes";
import { WIDTHS } from "../constants/styles";
import { useAuth } from "../contexts/Auth";
import { useCachedPromise } from "../hooks/useCachedPromise";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { useIsMobile } from "../hooks/useIsMobile";
import { usePages } from "../hooks/usePages";
import { useScrapeRuns } from "../hooks/useScrapeRuns";
import { AvailabilityDivisionMap, EquipmentDivisionMap } from "../utils/enums";
import { formatMonthDate, formatShortDatetime } from "../utils/format";
import { isValidUuid } from "../utils/id";
import { formatInstitutionName, formatUsageFee } from "../utils/institution";
import {
  RESERVATION_EXCLUDED_MUNICIPALITIES,
  getReservationDivisionLabel,
  ReservationStatusMap,
  SupportedMunicipality,
} from "../utils/municipality";
import { sortByReservationDivision } from "../utils/reservation";

import styles from "./Detail.module.css";

const InstitutionTab = ({
  institution,
  loading,
}: {
  institution: InstitutionDetail | undefined;
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
            value={institution?.capacity ?? undefined}
          />
          <Input
            label="面積（㎡）"
            loading={loading}
            readOnly={true}
            size="small"
            value={institution?.area ?? undefined}
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
            value={AvailabilityDivisionMap[institution?.is_available_strings ?? ""]}
          />
          <Input
            label="木管楽器"
            loading={loading}
            readOnly={true}
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_woodwind ?? ""]}
          />
          <Input
            label="金管楽器"
            loading={loading}
            readOnly={true}
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_brass ?? ""]}
          />
          <Input
            label="打楽器"
            loading={loading}
            readOnly={true}
            size="small"
            value={AvailabilityDivisionMap[institution?.is_available_percussion ?? ""]}
          />
        </div>
        <div className={styles["institutionRow"]}>
          <Input
            label="譜面台"
            loading={loading}
            readOnly={true}
            size="small"
            value={EquipmentDivisionMap[institution?.is_equipped_music_stand ?? ""]}
          />
          <Input
            label="ピアノ"
            loading={loading}
            readOnly={true}
            size="small"
            value={EquipmentDivisionMap[institution?.is_equipped_piano ?? ""]}
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
      <div className={styles["institutionRightArea"]} />
    </div>
  );
};

const InstitutionTabContent = ({ institution }: { institution: Promise<InstitutionDetail> }) => (
  <InstitutionTab institution={use(institution)} loading={false} />
);

const Title = ({ institution }: { institution: Promise<InstitutionDetail> }) => {
  const detail = use(institution);
  return (
    <h2>
      {formatInstitutionName(detail)}
      {detail.website_url && (
        <IconButton href={detail.website_url} target="_blank">
          <OpenInNewIcon />
        </IconButton>
      )}
    </h2>
  );
};

const ReservationLoading = () => (
  <div className={styles["reservationContainer"]}>
    <div className={styles["reservationNoData"]}>
      <Spinner />
    </div>
  </div>
);

const ReservationTabContent = ({
  id,
  institution,
}: {
  id: string;
  institution: Promise<InstitutionDetail>;
}) => {
  const detail = use(institution);
  return (
    <ReservationTab
      id={id}
      municipality={detail.municipality as SupportedMunicipality}
      divisionLabels={detail.division_labels}
    />
  );
};

const ReservationTab = ({
  id,
  municipality,
  divisionLabels,
}: {
  id: string;
  municipality: SupportedMunicipality;
  divisionLabels: Partial<Record<string, string>> | undefined;
}) => {
  const isMobile = useIsMobile();
  // モジュール読み込み時に確定させると、長寿命タブで日付がずれる。
  const [today] = useState(() => new Date());

  const startDate = formatISO(today, { representation: "date" });

  const scrapeRunsPromise = useScrapeRuns();
  const fetchPage = useCallback(
    (cursor: string | null) => fetchInstitutionReservations(id, { startDate }, cursor),
    [id, startDate]
  );
  const {
    items: reservations,
    hasNextPage,
    fetchMore,
  } = usePages(`institution-reservations:${id}:${startDate}`, fetchPage);
  const scrapeRuns = use(scrapeRunsPromise);

  const { sentinelRef, sentinelIndex } = useInfiniteScroll(fetchMore, reservations.length);

  const fetchedAt = formatShortDatetime(
    scrapeRuns.items.find((r) => r.municipality === municipality)?.fetched_at
  );

  return (
    <div className={styles["reservationContainer"]}>
      {!reservations.length || RESERVATION_EXCLUDED_MUNICIPALITIES.includes(municipality) ? (
        <div className={styles["reservationNoData"]}>表示するデータが存在しません</div>
      ) : isMobile ? (
        <div className={styles["reservationCardList"]}>
          {reservations.map((row, index) => (
            <div
              className={styles["reservationCard"]}
              // oxlint-disable-next-line react/no-array-index-key
              key={index}
              ref={index === sentinelIndex ? sentinelRef : undefined}
            >
              <div className={styles["reservationCardDate"]}>{formatMonthDate(row.date)}</div>
              <div className={styles["reservationCardDivisions"]}>
                {sortByReservationDivision(row.reservation).map(([division, status], i) => (
                  <div
                    className={styles["reservationCardDivisionItem"]}
                    // oxlint-disable-next-line react/no-array-index-key
                    key={i}
                  >
                    <span>
                      {getReservationDivisionLabel(municipality, division, divisionLabels)}
                    </span>
                    <span>{ReservationStatusMap[municipality]?.[status]}</span>
                  </div>
                ))}
              </div>
              <div className={styles["reservationCardTimestamps"]}>
                {fetchedAt && <span>取得 {fetchedAt}</span>}
                <span>更新 {formatShortDatetime(row.updated_at)}</span>
              </div>
            </div>
          ))}
          {hasNextPage && (
            <div className={styles["reservationCard"]}>
              <Skeleton />
              <Skeleton width="60%" />
            </div>
          )}
        </div>
      ) : (
        <TableContainer>
          <Table stickyHeader={true}>
            <TableHead>
              <TableRow>
                <TableCell
                  className={styles["reservationTableHeadCell"]}
                  size="small"
                  variant="head"
                >
                  日付
                </TableCell>
                {sortByReservationDivision(reservations[0]?.reservation ?? {}).map(([division]) => (
                  <TableCell
                    className={styles["reservationTableHeadCell"]}
                    key={division}
                    size="small"
                    variant="head"
                  >
                    {getReservationDivisionLabel(municipality, division, divisionLabels)}
                  </TableCell>
                ))}
                <TableCell
                  className={styles["reservationTableHeadCell"]}
                  size="small"
                  variant="head"
                >
                  取得日時
                </TableCell>
                <TableCell
                  className={styles["reservationTableHeadCell"]}
                  size="small"
                  variant="head"
                >
                  更新日時
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.map((row, index) => (
                <TableRow
                  hover={true}
                  // oxlint-disable-next-line react/no-array-index-key
                  key={index}
                  ref={index === sentinelIndex ? sentinelRef : undefined}
                >
                  <TableCell className={styles["reservationTableBodyCell"]} size="small">
                    {formatMonthDate(row.date)}
                  </TableCell>
                  {sortByReservationDivision(row.reservation).map(([, status], i) => (
                    <TableCell
                      className={styles["reservationTableBodyCell"]}
                      // oxlint-disable-next-line react/no-array-index-key
                      key={i}
                      size="small"
                    >
                      {ReservationStatusMap[municipality]?.[status]}
                    </TableCell>
                  ))}
                  <TableCell className={styles["reservationTableBodyCell"]} size="small">
                    {fetchedAt}
                  </TableCell>
                  <TableCell className={styles["reservationTableBodyCell"]} size="small">
                    {formatShortDatetime(row.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
              {hasNextPage && (
                <TableRow>
                  <TableCell size="small">
                    <Skeleton />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};

type TabType = "institution" | "reservation";

const DetailPage = () => {
  const { id } = useParams();
  if (!id || !isValidUuid(id)) {
    return <Redirect to={ROUTES.top} replace />;
  }
  return <DetailContent id={id} />;
};

const DetailContent = ({ id }: { id: string }) => {
  const [tab, setTab] = useState<TabType>("institution");
  const {
    userInfo: { anonymous, trial },
  } = useAuth();

  const handleTabChange = useCallback(
    (_: ChangeEvent<unknown>, newValue: string) => setTab(newValue as TabType),
    []
  );

  const institution = useCachedPromise(`institution:${id}`, () => fetchInstitutionDetail(id));

  return (
    <main className={styles["pageBox"]}>
      <div className={styles["title"]}>
        <Suspense fallback={<Skeleton height={40} width={WIDTHS.large} />}>
          <Title institution={institution} />
        </Suspense>
      </div>
      <TabGroup className={styles["tabGroup"] ?? ""} onChange={handleTabChange} value={tab}>
        <Tab label="施設情報" value="institution" />
        <Tab disabled={anonymous || trial} label="予約状況" value="reservation" />
      </TabGroup>
      <TabPanel className={styles["tabPanel"] ?? ""} currentValue={tab} tabValue="institution">
        <Suspense fallback={<InstitutionTab institution={undefined} loading={true} />}>
          <InstitutionTabContent institution={institution} />
        </Suspense>
      </TabPanel>
      <TabPanel className={styles["tabPanel"] ?? ""} currentValue={tab} tabValue="reservation">
        {!(anonymous || trial) && (
          <Suspense fallback={<ReservationLoading />}>
            <ReservationTabContent id={id} institution={institution} />
          </Suspense>
        )}
      </TabPanel>
    </main>
  );
};

export default DetailPage;
