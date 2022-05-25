import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { formatISO } from "date-fns";
import { ChangeEvent, useCallback, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  InstitutionDetailQuery,
  useInstitutionDetailQuery,
  useInstitutionReservationsQuery,
} from "../api/graphql-client";
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
  institution: InstitutionDetailQuery["institutions_by_pk"] | undefined;
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
            value={formatUsageFee(institution?.municipality, institution?.weekday_usage_fee)}
            loading={loading}
            readOnly={true}
          />
        </div>
        <div className={classes.institutionRow}>
          <Input
            label="利用料金（休日）"
            size="full"
            value={formatUsageFee(institution?.municipality, institution?.holiday_usage_fee)}
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

const ReservationTab = ({ id, municipality }: { id: string; municipality: string | undefined }) => {
  const startDate = formatDateIso(today);

  if (!municipality) {
    throw new Error("municipality is undefined");
  }

  const { loading, data, error } = useInstitutionReservationsQuery({
    variables: { id, startDate },
    fetchPolicy: "no-cache",
  });

  if (error) {
    throw new Error(error.message);
  }

  const reservations = data?.reservations;

  return (
    <div className={classes.reservationContainer}>
      {loading ? (
        <div className={classes.reservationNoData}>
          <Spinner />
        </div>
      ) : !reservations?.length ? (
        <div className={classes.reservationNoData}>表示するデータが存在しません</div>
      ) : (
        <TableContainer>
          <Table stickyHeader={true}>
            <TableHead>
              <TableRow>
                <TableCell className={classes.reservationTableCell} variant="head" size="small">
                  日付
                </TableCell>
                {sortByReservationDivision(reservations[0]?.reservation).map(([division]) => (
                  <TableCell
                    key={division}
                    className={classes.reservationTableCell}
                    variant="head"
                    size="small"
                  >
                    {ReservationDivisionMap[municipality]?.[division]}
                  </TableCell>
                ))}
                <TableCell className={classes.reservationTableCell} variant="head" size="small">
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
const formatDateIso = (value: Date) => formatISO(value, { representation: "date" });

export default () => {
  const { id } = useParams<"id">();
  const [tab, setTab] = useState<Tab>("institution");
  const { isAnonymous } = useAuth0();

  const handleTabChange = useCallback(
    (_: ChangeEvent<unknown>, newValue: Tab) => setTab(newValue),
    []
  );

  if (!id || !isValidUuid(id)) {
    return <Navigate to={ROUTES.top} replace={true} />;
  }

  const { loading, data, error } = useInstitutionDetailQuery({
    variables: { id },
    fetchPolicy: "no-cache",
  });

  if (error) {
    throw new Error(error.message);
  }

  const institution = data?.institutions_by_pk;

  return (
    <StyledInstitutionDetail className={classes.pageBox}>
      <div className={classes.title}>
        {loading ? (
          <Skeleton width={WIDTHS.large} height={40} />
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
      <TabGroup className={classes.tabGroup} value={tab} onChange={handleTabChange}>
        <Tab className={classes.tab} value="institution" label="施設情報" />
        <Tab className={classes.tab} value="reservation" label="予約状況" disabled={isAnonymous} />
      </TabGroup>
      <TabPanel className={classes.tabPanel} tabValue="institution" currentValue={tab}>
        <InstitutionTab institution={institution} loading={loading} />
      </TabPanel>
      <TabPanel className={classes.tabPanel} tabValue="reservation" currentValue={tab}>
        {!isAnonymous && <ReservationTab id={id} municipality={institution?.municipality} />}
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
  },
  [`.${classes.institutionRightArea}`]: {
    width: 384,
    [theme.breakpoints.down("sm")]: {
      width: 0, // TODO
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
  },
}));
