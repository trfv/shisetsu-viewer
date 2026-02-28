import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
import { ROUTES } from "../constants/routes";
import { CONTAINER_WIDTH, WIDTHS } from "../constants/styles";
import { useAuth0 } from "../contexts/Auth0";
import { useIsMobile } from "../hooks/useIsMobile";
import { AvailabilityDivisionMap, EquipmentDivisionMap } from "../utils/enums";
import { formatDatetime, formatMonthDate } from "../utils/format";
import { isValidUuid } from "../utils/id";
import { formatUsageFee } from "../utils/institution";
import { ReservationDivisionMap, ReservationStatusMap } from "../utils/municipality";
import { sortByReservationDivision } from "../utils/reservation";
import { styled } from "../utils/theme";

const InstitutionTab = ({
  institution,
  loading,
}: {
  institution: InstitutionDetailNode | undefined;
  loading: boolean;
}) => {
  return (
    <div className={classes.institutionContainer}>
      <div className={classes.institutionLeftArea}>
        <div className={classes.institutionRow}>
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
        <div className={classes.institutionRow}>
          <Input
            label="利用料金（平日）"
            loading={loading}
            readOnly={true}
            size="full"
            value={formatUsageFee(institution?.municipality, institution?.weekday_usage_fee)}
          />
        </div>
        <div className={classes.institutionRow}>
          <Input
            label="利用料金（休日）"
            loading={loading}
            readOnly={true}
            size="full"
            value={formatUsageFee(institution?.municipality, institution?.holiday_usage_fee)}
          />
        </div>
        <div className={classes.institutionRow}>
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
        <div className={classes.institutionRow}>
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
        <div className={classes.institutionRow}>
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
        <div className={classes.institutionRow}>
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
      <div className={classes.institutionRightArea}>{/** TODO */}</div>
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
    <div className={classes.reservationContainer}>
      {loading ? (
        <div className={classes.reservationNoData}>
          <Spinner />
        </div>
      ) : !reservations?.length ||
        MUNICIPALITIES_WITHOUT_RESERVATION_DATA.includes(municipality) ? (
        <div className={classes.reservationNoData}>表示するデータが存在しません</div>
      ) : isMobile ? (
        <div className={classes.reservationCardList}>
          {reservations.map((row, index) => (
            <div className={classes.reservationCard} key={index}>
              <div className={classes.reservationCardDate}>{formatMonthDate(row.date)}</div>
              <div className={classes.reservationCardDivisions}>
                {sortByReservationDivision(row.reservation).map(([division, status], i) => (
                  <div className={classes.reservationCardDivisionItem} key={i}>
                    <span>{ReservationDivisionMap[municipality]?.[division]}</span>
                    <span>{ReservationStatusMap[municipality]?.[status]}</span>
                  </div>
                ))}
              </div>
              <div className={classes.reservationCardUpdatedAt}>
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
                <TableCell className={classes.reservationTableCell} size="small" variant="head">
                  日付
                </TableCell>
                {sortByReservationDivision(reservations[0]?.reservation).map(([division]) => (
                  <TableCell
                    className={classes.reservationTableCell}
                    key={division}
                    size="small"
                    variant="head"
                  >
                    {ReservationDivisionMap[municipality]?.[division]}
                  </TableCell>
                ))}
                <TableCell className={classes.reservationTableCell} size="small" variant="head">
                  取得日時
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className={classes.reservationTableCell} size="small">
                    {formatMonthDate(row.date)}
                  </TableCell>
                  {sortByReservationDivision(row.reservation).map(([, status], i) => (
                    <TableCell className={classes.reservationTableCell} key={i} size="small">
                      {ReservationStatusMap[municipality]?.[status]}
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
  );
};

type Tab = "institution" | "reservation";

const today = new Date();

// システムの改悪により更新困難な自治体
const MUNICIPALITIES_WITHOUT_RESERVATION_DATA = [
  "MUNICIPALITY_BUNKYO",
  "MUNICIPALITY_EDOGAWA",
  "MUNICIPALITY_TOSHIMA",
];

export default () => {
  const { id } = useParams<"id">();
  const [tab, setTab] = useState<Tab>("institution");
  const {
    userInfo: { anonymous, trial },
  } = useAuth0();

  const handleTabChange = useCallback(
    (_: ChangeEvent<unknown>, newValue: Tab) => setTab(newValue),
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
    <StyledInstitutionDetail className={classes.pageBox}>
      <div className={classes.title}>
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
      <TabGroup className={classes.tabGroup} onChange={handleTabChange} value={tab}>
        <Tab className={classes.tab} label="施設情報" value="institution" />
        <Tab
          className={classes.tab}
          disabled={anonymous || trial}
          label="予約状況"
          value="reservation"
        />
      </TabGroup>
      <TabPanel className={classes.tabPanel} currentValue={tab} tabValue="institution">
        <InstitutionTab institution={institution} loading={loading} />
      </TabPanel>
      <TabPanel className={classes.tabPanel} currentValue={tab} tabValue="reservation">
        {!(anonymous || trial) && (
          <ReservationTab id={id} municipality={institution?.municipality || ""} />
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
  tab: `${PREFIX}-tab`,
  tabPanel: `${PREFIX}-tabPanel`,
  institutionContainer: `${PREFIX}-institutionContainer`,
  institutionLeftArea: `${PREFIX}-institutionLeftArea`,
  institutionRow: `${PREFIX}-institutionRow`,
  institutionRightArea: `${PREFIX}-institutionRightArea`,
  reservationContainer: `${PREFIX}-reservationContainer`,
  reservationNoData: `${PREFIX}-reservationNoData`,
  reservationTableCell: `${PREFIX}-reservationTableCell`,
  reservationCardList: `${PREFIX}-reservationCardList`,
  reservationCard: `${PREFIX}-reservationCard`,
  reservationCardDate: `${PREFIX}-reservationCardDate`,
  reservationCardDivisions: `${PREFIX}-reservationCardDivisions`,
  reservationCardDivisionItem: `${PREFIX}-reservationCardDivisionItem`,
  reservationCardUpdatedAt: `${PREFIX}-reservationCardUpdatedAt`,
};

const StyledInstitutionDetail = styled("main")(({ theme }) => ({
  [`&.${classes.pageBox}`]: {
    padding: theme.spacing(5, 0),
    display: "flex",
    flexDirection: "column",
    width: "100%",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(3, 0),
    },
  },
  [`.${classes.title}`]: {
    marginInline: "auto",
    padding: theme.spacing(0, 3),
    width: "100%",
    minHeight: 80,
    maxWidth: CONTAINER_WIDTH,
  },
  [`.${classes.tabGroup}`]: {
    marginInline: "auto",
    padding: theme.spacing(0, 3),
    width: "100%",
    maxWidth: CONTAINER_WIDTH,
    [theme.breakpoints.down("sm")]: {
      marginInline: 0,
      padding: 0,
      width: "100%",
      [`.${classes.tab}`]: {
        width: "50%",
      },
    },
  },
  [`.${classes.tabPanel}`]: {
    marginTop: theme.spacing(5),
    marginInline: "auto",
    width: "100%",
    maxWidth: CONTAINER_WIDTH,
    [theme.breakpoints.down("sm")]: {
      marginTop: theme.spacing(3),
    },
  },
  [`.${classes.institutionContainer}`]: {
    padding: theme.spacing(0, 3),
    display: "flex",
    justifyContent: "space-between",
  },
  [`.${classes.institutionLeftArea}`]: {
    maxWidth: 840,
    [theme.breakpoints.down("sm")]: {
      width: "100%",
    },
  },
  [`.${classes.institutionRow}`]: {
    display: "flex",
    gap: theme.spacing(5),
    [`+ .${classes.institutionRow}`]: {
      marginTop: 24,
      gap: theme.spacing(3),
    },
    [theme.breakpoints.down("sm")]: {
      flexWrap: "wrap",
      gap: theme.spacing(2),
      [`+ .${classes.institutionRow}`]: {
        marginTop: theme.spacing(2),
        gap: theme.spacing(2),
      },
    },
  },
  [`.${classes.institutionRightArea}`]: {
    width: 384,
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  [`.${classes.reservationContainer}`]: {
    padding: theme.spacing(0, 3),
    [theme.breakpoints.down("sm")]: {
      padding: 0,
    },
  },
  [`.${classes.reservationNoData}`]: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  [`.${classes.reservationTableCell}`]: {
    whiteSpace: "nowrap",
    borderBottomColor: theme.palette.text.primary,
  },
  [`.${classes.reservationCardList}`]: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    padding: theme.spacing(0, 2),
  },
  [`.${classes.reservationCard}`]: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
  },
  [`.${classes.reservationCardDate}`]: {
    fontWeight: "bold",
    fontSize: "1rem",
    marginBottom: theme.spacing(1),
  },
  [`.${classes.reservationCardDivisions}`]: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  [`.${classes.reservationCardDivisionItem}`]: {
    display: "flex",
    gap: theme.spacing(0.5),
    fontSize: "0.875rem",
    "& > span:first-of-type": {
      color: theme.palette.text.secondary,
      "&::after": {
        content: '":"',
      },
    },
  },
  [`.${classes.reservationCardUpdatedAt}`]: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    textAlign: "right",
  },
}));
