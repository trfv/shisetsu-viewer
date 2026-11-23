import {
  getReservationSystem,
  type BuildingDetail,
  type InstitutionSummary,
  type ReservationSearchHit,
} from "@shisetsu-viewer/shared";
import { addMonths, endOfMonth, formatISO } from "date-fns";
import {
  Suspense,
  use,
  useCallback,
  useMemo,
  useState,
  ViewTransition,
  type ChangeEvent,
} from "react";
import { Redirect, useLocation, useParams } from "wouter";

import { fetchBuildingDetail, searchReservations } from "../api/endpoints";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { DataTableSkeleton, type Columns, type RowParams } from "../components/DataTable";
import { IconButton } from "../components/IconButton";
import { OpenInNewIcon } from "../components/icons";
import { Input } from "../components/Input";
import { ReservationStatusList } from "../components/ReservationStatusList";
import { SearchResults } from "../components/SearchPageLayout";
import { Skeleton } from "../components/Skeleton";
import { Tab } from "../components/Tab";
import { TabGroup, TabPanel } from "../components/TabGroup";
import { ROUTES } from "../constants/routes";
import { WIDTHS } from "../constants/styles";
import { useAuth } from "../contexts/Auth";
import { useCachedPromise } from "../hooks/useCachedPromise";
import { FETCH_MORE, usePages } from "../hooks/usePages";
import { useScrapeRuns } from "../hooks/useScrapeRuns";
import { formatDate, formatShortDatetime } from "../utils/format";
import { isValidUuid } from "../utils/id";
import {
  RESERVATION_EXCLUDED_MUNICIPALITIES,
  SupportedMunicipalityMap,
  type SupportedMunicipality,
} from "../utils/municipality";
import { formatReservationMap, getNewlyVacantDivisions } from "../utils/reservation";
import { COLUMNS as INSTITUTION_COLUMNS } from "./Institution";

import styles from "./Building.module.css";

type ReservationRow = ReservationSearchHit & {
  id: string;
  fetched_at: string | undefined;
  [key: string]: unknown;
};

const ROOM_COLUMNS: Columns<InstitutionSummary> = [
  { field: "institution", headerName: "施設名", type: "string", maxWidth: 400, wrap: true },
  ...INSTITUTION_COLUMNS.slice(1),
];

const RESERVATION_COLUMNS: Columns<ReservationRow> = [
  {
    field: "date",
    headerName: "日付",
    type: "getter",
    valueGetter: (params) => formatDate(params.row.reservation.date),
  },
  {
    field: "institution",
    headerName: "施設名",
    type: "getter",
    maxWidth: 400,
    wrap: true,
    valueGetter: (params) => params.row.institution.institution,
  },
  {
    field: "reservation",
    headerName: "予約状況",
    maxWidth: 400,
    wrap: true,
    type: "getter",
    valueGetter: (params) =>
      formatReservationMap(
        params.row.institution.municipality as SupportedMunicipality,
        params.row.reservation.reservation,
        params.row.institution.division_labels
      ),
    renderCell: (params) => (
      <ReservationStatusList
        divisionLabels={params.row.institution.division_labels}
        municipality={params.row.institution.municipality as SupportedMunicipality}
        newlyVacantDivisions={getNewlyVacantDivisions(params.row.reservation)}
        reservation={params.row.reservation.reservation}
      />
    ),
  },
  {
    field: "fetched_at",
    headerName: "取得日時",
    type: "getter",
    valueGetter: (params) => formatShortDatetime(params.row.fetched_at),
  },
  {
    field: "updated_at",
    headerName: "更新日時",
    type: "getter",
    valueGetter: (params) => formatShortDatetime(params.row.reservation.updated_at),
  },
];

const Title = ({ building }: { building: Promise<BuildingDetail> }) => {
  const detail = use(building);
  const system = detail.reservation_system
    ? getReservationSystem(detail.reservation_system)
    : undefined;
  const municipality = SupportedMunicipalityMap[detail.municipality];
  return (
    <>
      <Breadcrumbs items={municipality ? [{ label: municipality }] : []} />
      <h2>
        {detail.name}
        {system?.url && (
          <IconButton aria-label={system.label} href={system.url} target="_blank">
            <OpenInNewIcon />
          </IconButton>
        )}
      </h2>
    </>
  );
};

const InfoFields = ({ building }: { building: BuildingDetail | undefined }) => {
  const loading = !building;
  const system = building?.reservation_system
    ? getReservationSystem(building.reservation_system)
    : undefined;
  return (
    <div className={styles["infoRow"]}>
      <Input
        label="住所"
        loading={loading}
        readOnly={true}
        size="medium"
        value={building?.address}
      />
      <Input
        label="予約システム"
        loading={loading}
        readOnly={true}
        size="large"
        value={system?.label}
      />
    </div>
  );
};

const InfoTabContent = ({ building }: { building: Promise<BuildingDetail> }) => {
  const detail = use(building);
  const [, setLocation] = useLocation();
  const handleRowClick = useCallback(
    (params: RowParams<InstitutionSummary>) =>
      setLocation(ROUTES.detail.replace(":id", params.row.id)),
    [setLocation]
  );
  return (
    <div className={styles["infoContainer"]}>
      <InfoFields building={detail} />
      <SearchResults
        columns={ROOM_COLUMNS}
        onRowClick={handleRowClick}
        rows={detail.institutions}
      />
    </div>
  );
};

const InfoLoading = () => (
  <div className={styles["infoContainer"]}>
    <InfoFields building={undefined} />
    <DataTableSkeleton columns={ROOM_COLUMNS} />
  </div>
);

const ReservationTabContent = ({
  id,
  building,
}: {
  id: string;
  building: Promise<BuildingDetail>;
}) => {
  const detail = use(building);
  // モジュール読み込み時に確定させると、長寿命タブで日付がずれる。
  const [today] = useState(() => new Date());
  const startDate = formatISO(today, { representation: "date" });
  const endDate = formatISO(endOfMonth(addMonths(today, 6)), { representation: "date" });

  const scrapeRunsPromise = useScrapeRuns();
  const fetchPage = useCallback(
    (cursor: string | null) => searchReservations({ buildingId: id, startDate, endDate }, cursor),
    [id, startDate, endDate]
  );
  const { items, hasNextPage, fetchMore } = usePages(
    `building-reservations:${id}:${startDate}`,
    fetchPage
  );
  const scrapeRuns = use(scrapeRunsPromise);

  const rows = useMemo<ReservationRow[]>(() => {
    const fetchedAt = scrapeRuns.items.find(
      (r) => r.municipality === detail.municipality
    )?.fetched_at;
    return items.map((hit) => ({
      id: `${hit.institution.id}_${hit.reservation.date}`,
      fetched_at: fetchedAt,
      ...hit,
    }));
  }, [items, scrapeRuns, detail.municipality]);

  const [, setLocation] = useLocation();
  const handleRowClick = useCallback(
    (params: RowParams<ReservationRow>) =>
      setLocation(ROUTES.detail.replace(":id", params.row.institution.id)),
    [setLocation]
  );

  const excluded = RESERVATION_EXCLUDED_MUNICIPALITIES.includes(
    detail.municipality as SupportedMunicipality
  );

  return (
    <div className={styles["reservationContainer"]}>
      <SearchResults
        columns={RESERVATION_COLUMNS}
        fetchMore={fetchMore}
        hasNextPage={hasNextPage}
        onRowClick={handleRowClick}
        rows={excluded ? [] : rows}
      />
    </div>
  );
};

type TabType = "institution" | "reservation";

const BuildingPage = () => {
  const { id } = useParams();
  if (!id || !isValidUuid(id)) {
    return <Redirect to={ROUTES.top} replace />;
  }
  return <BuildingContent id={id} />;
};

const BuildingContent = ({ id }: { id: string }) => {
  const [tab, setTab] = useState<TabType>("institution");
  const {
    userInfo: { anonymous, trial },
  } = useAuth();

  const handleTabChange = useCallback(
    (_: ChangeEvent<unknown>, newValue: string) => setTab(newValue as TabType),
    []
  );

  const building = useCachedPromise(`building:${id}`, () => fetchBuildingDetail(id));

  return (
    <main className={styles["pageBox"]}>
      <div className={styles["title"]}>
        <Suspense
          fallback={
            <ViewTransition>
              <Skeleton height={40} width={WIDTHS.large} />
            </ViewTransition>
          }
        >
          <ViewTransition>
            <Title building={building} />
          </ViewTransition>
        </Suspense>
      </div>
      <TabGroup className={styles["tabGroup"] ?? ""} onChange={handleTabChange} value={tab}>
        <Tab label="施設情報" value="institution" />
        <Tab disabled={anonymous || trial} label="予約状況" value="reservation" />
      </TabGroup>
      <TabPanel className={styles["tabPanel"] ?? ""} currentValue={tab} tabValue="institution">
        <Suspense
          fallback={
            <ViewTransition>
              <InfoLoading />
            </ViewTransition>
          }
        >
          <ViewTransition>
            <InfoTabContent building={building} />
          </ViewTransition>
        </Suspense>
      </TabPanel>
      <TabPanel className={styles["tabPanel"] ?? ""} currentValue={tab} tabValue="reservation">
        {!(anonymous || trial) && (
          <Suspense
            fallback={
              <ViewTransition>
                <div className={styles["reservationContainer"]}>
                  <DataTableSkeleton columns={RESERVATION_COLUMNS} />
                </div>
              </ViewTransition>
            }
          >
            <ViewTransition update={{ [FETCH_MORE]: "none", default: "auto" }}>
              <ReservationTabContent building={building} id={id} />
            </ViewTransition>
          </Suspense>
        )}
      </TabPanel>
    </main>
  );
};

export default BuildingPage;
