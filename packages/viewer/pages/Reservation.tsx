import { addMonths, endOfMonth, max, min } from "date-fns";
import { useCallback, useMemo, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { NetworkStatus } from "@apollo/client";
import type { ReservationsQuery } from "../api/gql/graphql";
import { ReservationsDocument } from "../api/gql/graphql";
import { extractRelayParams, extractSinglePkFromRelayId } from "../utils/relay";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import { DataTable, type Columns } from "../components/DataTable";
import { DateRangePicker } from "../components/DateRangePicker";
import { SearchForm } from "../components/SearchForm";
import { Select, type SelectChangeEvent } from "../components/Select";
import { Spinner } from "../components/Spinner";
import { ROUTES } from "../constants/routes";
import { CONTAINER_WIDTH, SEARCH_TABLE_HEIGHT } from "../constants/styles";
import { ArrayParam, DateParam, StringParam, useQueryParams } from "../hooks/useQueryParams";
import { InstitutionSizeMap } from "../utils/enums";
import { formatDate, formatDatetime } from "../utils/format";
import {
  MunicipalityOptions,
  SupportedMunicipalityMap,
  convertMunicipalityToUrlParam,
  type SupportedMunicipality,
  RESERVATION_EXCLUDED_MUNICIPALITIES,
} from "../utils/municipality";
import {
  RESERVATION_SEARCH_FILTER_MAP,
  formatReservationMap,
  toReservationQueryVariables,
  toReservationSearchParams,
  type ReservationSearchFilter,
} from "../utils/reservation";
import {
  AVAILABLE_INSTRUMENT_MAP,
  INSTUTITON_SIZE_MAP,
  type AvailableInstrument,
  type InstitutionSize,
} from "../utils/search";
import { styled } from "../utils/theme";

const minDate = new Date();
const maxDate = addMonths(endOfMonth(new Date()), 6);

const COLUMNS: Columns<
  ReservationsQuery["searchable_reservations_connection"]["edges"][number]["node"]
> = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    type: "getter",
    valueGetter: (params) =>
      `${params.row.institution?.building ?? ""} ${params.row.institution?.institution ?? ""}`,
  },
  {
    field: "municipality",
    headerName: "地区",
    type: "getter",
    hide: true,
    valueGetter: (params) =>
      SupportedMunicipalityMap[params.row.institution?.municipality as string] || "",
  },
  {
    field: "institution_size",
    headerName: "施設サイズ",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) =>
      InstitutionSizeMap[params.row.institution?.institution_size ?? ""] || "",
  },
  {
    field: "date",
    headerName: "日付",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => formatDate(params.row.reservation?.date),
  },
  {
    field: "reservation",
    headerName: "予約状況",
    maxWidth: 480,
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => {
      const municipality = params.row.institution?.municipality as SupportedMunicipality;
      const obj = params.row.reservation?.reservation as Record<string, string>;
      return formatReservationMap(municipality, obj);
    },
    /** TODO hover したときに中身がすべて表示されるように修正する */
  },
  {
    field: "updated_at",
    headerName: "取得日時",
    type: "getter",
    hideIfMobile: true,
    valueGetter: (params) => formatDatetime(params.row.reservation?.updated_at),
  },
];

export default () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setQueryParams] = useQueryParams(
    {
      m: StringParam,
      df: DateParam,
      dt: DateParam,
      f: ArrayParam,
      a: ArrayParam,
      i: ArrayParam,
    },
    navigate,
    location
  );

  const resevationSearchParams = useMemo(
    () =>
      toReservationSearchParams(
        values.m,
        values.df,
        values.dt,
        values.f,
        values.a,
        values.i,
        minDate,
        maxDate
      ),
    [values]
  );

  const { loading, data, error, fetchMore, networkStatus } = useQuery(ReservationsDocument, {
    variables: toReservationQueryVariables(resevationSearchParams),
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });

  if (error) {
    // TODO Snackbar を描画する
    throw new Error(error.message);
  }

  const {
    edges: reservations,
    endCursor,
    hasNextPage: hasMore,
  } = extractRelayParams(data?.searchable_reservations_connection);

  const { municipality, startDate, endDate, filter, availableInstruments, institutionSizes } =
    resevationSearchParams;

  const handleMunicipalityChange = useCallback(
    (event: SelectChangeEvent<string>): void => {
      setQueryParams({ m: convertMunicipalityToUrlParam(event.target.value) });
    },
    [setQueryParams]
  );

  const handleStartDateChange = useCallback(
    (date: Date | null): void => {
      setQueryParams({ df: date, dt: min([maxDate, max([date ?? endDate, endDate])]) });
    },
    [setQueryParams, endDate]
  );

  const handleEndDateChange = useCallback(
    (date: Date | null): void => {
      setQueryParams({ df: max([minDate, min([date ?? startDate, startDate])]), dt: date });
    },
    [setQueryParams, startDate]
  );

  const handleFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? filter.concat(value as ReservationSearchFilter)
        : filter.filter((v) => v !== value);
      setQueryParams({ f: next });
    },
    [setQueryParams, filter]
  );

  const handleAvailableInstrumentsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? availableInstruments.concat(value as AvailableInstrument)
        : availableInstruments.filter((v) => v !== value);
      setQueryParams({ a: next });
    },
    [setQueryParams, availableInstruments]
  );

  const handleInstitutoinSizesChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? institutionSizes.concat(value as InstitutionSize)
        : institutionSizes.filter((v) => v !== value);
      setQueryParams({ i: next });
    },
    [setQueryParams, institutionSizes]
  );

  const chips = [
    ...(municipality === "all"
      ? []
      : [`${MunicipalityOptions.find((o) => o.value === municipality)?.label}`]),
    `${formatDate(startDate)} 〜 ${formatDate(endDate)}`,
    ...Object.entries(RESERVATION_SEARCH_FILTER_MAP)
      .filter(([v]) => filter.includes(v as ReservationSearchFilter))
      .map(([, label]) => label),
    ...Object.entries(AVAILABLE_INSTRUMENT_MAP)
      .filter(([v]) => availableInstruments.includes(v as AvailableInstrument))
      .map(([, label]) => label || ""),
    ...Object.entries(INSTUTITON_SIZE_MAP)
      .filter(([v]) => institutionSizes.includes(v as InstitutionSize))
      .map(([, label]) => label || ""),
  ];

  return (
    <StyledReservation className={classes.pageBox}>
      <div className={classes.searchBox}>
        <div className={classes.searchBoxForm}>
          <SearchForm chips={chips}>
            <Select
              label="地区"
              onChange={handleMunicipalityChange}
              selectOptions={MunicipalityOptions.filter(
                (m) =>
                  !RESERVATION_EXCLUDED_MUNICIPALITIES.includes(m.value as SupportedMunicipality)
              )}
              size="small"
              value={municipality}
            />
            <DateRangePicker
              endDateProps={{
                value: endDate,
                onChange: handleEndDateChange,
                minDate,
                maxDate,
              }}
              label="期間指定"
              startDateProps={{
                value: startDate,
                onChange: handleStartDateChange,
                minDate,
                maxDate,
              }}
            />
            <CheckboxGroup label="絞り込み" onChange={handleFilterChange} values={filter}>
              {Object.entries(RESERVATION_SEARCH_FILTER_MAP).map(([value, label]) => (
                <Checkbox key={value} label={label} value={value} />
              ))}
            </CheckboxGroup>
            <CheckboxGroup
              label="利用可能楽器"
              onChange={handleAvailableInstrumentsChange}
              values={availableInstruments}
            >
              {Object.entries(AVAILABLE_INSTRUMENT_MAP).map(([value, label]) => (
                <Checkbox key={value} label={label} value={value} />
              ))}
            </CheckboxGroup>
            <CheckboxGroup
              label="施設サイズ"
              onChange={handleInstitutoinSizesChange}
              values={institutionSizes}
            >
              {Object.entries(INSTUTITON_SIZE_MAP).map(([value, label]) => (
                <Checkbox key={value} label={label || ""} value={value} />
              ))}
            </CheckboxGroup>
          </SearchForm>
        </div>
      </div>
      <div className={classes.resultBox}>
        {loading && networkStatus !== NetworkStatus.fetchMore ? (
          <div className={classes.resultBoxNoData}>
            <Spinner />
          </div>
        ) : !municipality || !reservations?.length ? (
          <div className={classes.resultBoxNoData}>表示するデータが存在しません</div>
        ) : (
          <DataTable
            columns={COLUMNS}
            fetchMore={async () => {
              if (!hasMore || !endCursor) return;
              await fetchMore({
                variables: {
                  after: endCursor,
                },
              });
            }}
            hasNextPage={hasMore}
            onRowClick={(params) => {
              const institutionId =
                params.row.institution?.id && extractSinglePkFromRelayId(params.row.institution.id);
              if (institutionId) {
                navigate(ROUTES.detail.replace(":id", institutionId as string));
              }
            }}
            rows={reservations}
          />
        )}
      </div>
    </StyledReservation>
  );
};

const PREFIX = "Reservation";
const classes = {
  pageBox: `${PREFIX}-pageBox`,
  searchBox: `${PREFIX}-searchBox`,
  searchBoxForm: `${PREFIX}-searchBoxForm`,
  resultBox: `${PREFIX}-resultBox`,
  resultBoxNoData: `${PREFIX}-resultBoxNoData`,
};

const StyledReservation = styled("main")(({ theme }) => ({
  [`&.${classes.pageBox}`]: {
    padding: theme.spacing(5, 0),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(5),
    width: "100%",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(3, 0),
      gap: theme.spacing(3),
    },
  },
  [`.${classes.searchBox}`]: {
    marginInline: "auto",
    padding: theme.spacing(3),
    width: "100%",
    maxWidth: CONTAINER_WIDTH,
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    [theme.breakpoints.down("sm")]: {
      marginInline: 0,
      padding: theme.spacing(1),
      borderRadius: 0,
    },
  },
  [`.${classes.searchBoxForm}`]: {
    display: "flex",
    flexWrap: "nowrap",
    gap: theme.spacing(3, 5),
  },
  [`.${classes.resultBox}`]: {
    marginInline: "auto",
    width: "100%",
    maxWidth: CONTAINER_WIDTH,
    [theme.breakpoints.up("md")]: {
      height: SEARCH_TABLE_HEIGHT,
      ".MuiTableContainer-root": {
        maxHeight: SEARCH_TABLE_HEIGHT,
      },
    },
    [theme.breakpoints.down("sm")]: {
      marginInline: 0,
    },
  },
  [`.${classes.resultBoxNoData}`]: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}));
