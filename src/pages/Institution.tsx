import { useQuery } from "@apollo/client";
import React, { ChangeEvent, FC, useCallback, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  InstitutionDocument,
  InstitutionQuery,
  InstitutionQueryVariables,
} from "../api/graphql-client";
import { Checkbox } from "../components/Checkbox";
import { CheckboxGroup } from "../components/CheckboxGroup";
import {
  DataGrid,
  GridCellParams,
  GridColumns,
  GridValueFormatterParams,
  GridValueGetterParams,
} from "../components/DataGrid";
import { Select, SelectChangeEvent } from "../components/Select";
import { TOKEN } from "../components/utils/AuthGuardRoute";
import { AvailabilityDivisionMap, EquipmentDivisionMap, TokyoWardMap } from "../constants/enums";
import { ROUTES } from "../constants/routes";
import { PAGE, ROWS_PER_PAGE, TOKYO_WARD } from "../constants/search";
import { CONTAINER_WIDTH, INNER_WIDTH, MAIN_HEIGHT } from "../constants/styles";
import { SupportedTokyoWard, TokyoWardOptions } from "../utils/enums";
import { formatDatetime } from "../utils/format";
import {
  AvailableInstrument,
  AVAILABLE_INSTRUMENTS,
  BRASS,
  formatUsageFee,
  PERCUSSION,
  STRINGS,
  toInstitutionQueryVariables,
  toInstitutionSearchParams,
  WOODWIND,
} from "../utils/institution";
import { convertTokyoWardToUrlParam, setUrlSearchParams } from "../utils/search";
import { styled } from "../utils/theme";

const COLUMNS: GridColumns = [
  {
    field: "building_and_institution",
    headerName: "施設名",
    width: 360,
    flex: 0,
    sortable: false,
    valueGetter: (params: GridValueGetterParams) =>
      `${params.row.building ?? ""} ${params.row.institution ?? ""}`,
  },
  {
    field: "tokyo_ward",
    headerName: "区",
    width: 120,
    flex: 0,
    hide: true,
    valueFormatter: (params: GridValueFormatterParams) => TokyoWardMap[params.value as string],
  },
  { field: "capacity", headerName: "定員（人）", type: "number", width: 140, flex: 0 },
  { field: "area", headerName: "面積（㎡）", type: "number", width: 140, flex: 0 },
  {
    field: "weekday_usage_fee",
    headerName: "利用料金（平日）",
    width: 480,
    flex: 0,
    hide: true,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) =>
      formatUsageFee(params.row.tokyo_ward, params.row.weekday_usage_fee),
  },
  {
    field: "holiday_usage_fee",
    headerName: "利用料金（休日）",
    width: 480,
    flex: 0,
    hide: true,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) =>
      formatUsageFee(params.row.tokyo_ward, params.row.holiday_usage_fee),
  },
  { field: "address", headerName: "住所", width: 240, flex: 0, hide: true },
  {
    field: "is_available_strings",
    headerName: "弦楽器",
    width: 100,
    flex: 0,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) =>
      AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_available_woodwind",
    headerName: "木管楽器",
    width: 100,
    flex: 0,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) =>
      AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_available_brass",
    headerName: "金管楽器",
    width: 100,
    flex: 0,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) =>
      AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_available_percussion",
    headerName: "打楽器",
    width: 100,
    flex: 0,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) =>
      AvailabilityDivisionMap[params.value as string],
  },
  {
    field: "is_equipped_music_stand",
    headerName: "譜面台",
    width: 100,
    flex: 0,
    hide: true,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) =>
      EquipmentDivisionMap[params.value as string],
  },
  {
    field: "is_equipped_piano",
    headerName: "ピアノ",
    width: 100,
    flex: 0,
    hide: true,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) =>
      EquipmentDivisionMap[params.value as string],
  },
  {
    field: "website_url",
    headerName: "公式サイト",
    width: 160,
    flex: 0,
    hide: true,
    // disableClickEventBubbling: true,
    // eslint-disable-next-line react/display-name
    renderCell: (params: GridCellParams) => {
      const href = params.value as string;
      return href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {href}
        </a>
      ) : (
        <></>
      );
    },
  },
  {
    field: "layout_image_url",
    headerName: "レイアウト図",
    width: 160,
    flex: 0,
    hide: true,
    // disableClickEventBubbling: true,
    // eslint-disable-next-line react/display-name
    renderCell: (params: GridCellParams) => {
      const href = params.value as string;
      return href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {href}
        </a>
      ) : (
        <></>
      );
    },
  },
  { field: "lottery_period", headerName: "抽選期間", width: 240, flex: 0, hide: true },
  { field: "note", headerName: "備考", width: 240, flex: 0, hide: true },
  {
    field: "updated_at",
    headerName: "更新日時",
    width: 200,
    flex: 0,
    sortable: false,
    valueFormatter: (params: GridValueFormatterParams) => formatDatetime(params.value as string),
  },
];

export const Institution: FC = () => {
  const history = useHistory();

  const urlSearchParams = useRef<URLSearchParams>(new URLSearchParams(history.location.search));

  const [institutionSearchParams, setInstitutionSearchParams] = useState(
    toInstitutionSearchParams(urlSearchParams.current)
  );
  const { loading, data, error } = useQuery<InstitutionQuery, InstitutionQueryVariables>(
    InstitutionDocument,
    {
      variables: toInstitutionQueryVariables(institutionSearchParams),
      context: {
        headers: {
          Authorization: TOKEN ? `Bearer ${TOKEN}` : "",
        },
      },
    }
  );

  const { page, tokyoWard, availableInstruments } = institutionSearchParams;

  const updateUrlSearchParams = useCallback((nextUrlSearchParams: URLSearchParams) => {
    history.replace({
      pathname: history.location.pathname,
      search: nextUrlSearchParams.toString(),
    });
    urlSearchParams.current = nextUrlSearchParams;
  }, []);

  const handleTokyoWardChange = useCallback((event: SelectChangeEvent<unknown>): void => {
    const value = event.target.value as SupportedTokyoWard;
    setInstitutionSearchParams((prevState) => ({ ...prevState, page: 0, tokyoWard: value }));
    updateUrlSearchParams(
      setUrlSearchParams(
        urlSearchParams.current,
        { [TOKYO_WARD]: convertTokyoWardToUrlParam(value) },
        [PAGE]
      )
    );
  }, []);

  const handleAvailableInstrumentsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value, checked } = event.target;
      const next = checked
        ? availableInstruments.concat(value as AvailableInstrument)
        : availableInstruments.filter((v) => v !== value);
      setInstitutionSearchParams((prevState) => ({
        ...prevState,
        page: 0,
        availableInstruments: next,
      }));
      updateUrlSearchParams(
        setUrlSearchParams(urlSearchParams.current, { [AVAILABLE_INSTRUMENTS]: next }, [PAGE])
      );
    },
    [availableInstruments]
  );

  const handleChangePage = useCallback((page: number): void => {
    setInstitutionSearchParams((prevState) => ({
      ...prevState,
      page,
    }));
    updateUrlSearchParams(
      setUrlSearchParams(urlSearchParams.current, { [PAGE]: String(page) }, [PAGE])
    );
  }, []);

  return (
    <StyledInstitution className={classes.pageBox}>
      <div className={classes.searchBox}>
        <div className={classes.searchBoxForm}>
          <Select
            label="区"
            value={tokyoWard}
            size="small"
            onChange={handleTokyoWardChange}
            selectOptions={TokyoWardOptions}
          />
          {/* <Input label="定員下限（人）" defaultValue="" size="small" /> */}
          {/* <Input label="面積下限（㎡）" defaultValue="" size="small" /> */}
          <CheckboxGroup
            label="利用可能楽器"
            values={availableInstruments}
            onChange={handleAvailableInstrumentsChange}
          >
            <Checkbox label="弦楽器" value={STRINGS} />
            <Checkbox label="木管楽器" value={WOODWIND} />
            <Checkbox label="金管楽器" value={BRASS} />
            <Checkbox label="打楽器" value={PERCUSSION} />
          </CheckboxGroup>
        </div>
        {/* <div className={classes.searchBoxButtons}>
          <SmallButton color="primary" variant="contained">
            検索
          </SmallButton>
          <SmallButton>クリア</SmallButton>
        </div> */}
      </div>
      <div className={classes.resultBox}>
        <DataGrid
          rows={data?.institution ?? []}
          columns={COLUMNS}
          error={error}
          loading={loading}
          onRowClick={(params) =>
            history.push(ROUTES.institutionDetail.replace(":id", params.row.id))
          }
          paginationMode="server"
          rowCount={data?.institution_aggregate.aggregate?.count ?? undefined}
          page={page}
          pageSize={ROWS_PER_PAGE}
          pagination={true}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
          // components={{
          //   Toolbar: CustomToolbar,
          // }}
          disableColumnMenu={true}
          disableSelectionOnClick={true}
          density="compact"
        />
      </div>
    </StyledInstitution>
  );
};

const PREFIX = "Institution";
const classes = {
  pageBox: `${PREFIX}-pageBox`,
  searchBox: `${PREFIX}-searchBox`,
  searchBoxForm: `${PREFIX}-searchBoxForm`,
  resultBox: `${PREFIX}-resultBox`,
};

const StyledInstitution = styled("main")(({ theme }) => ({
  [`&.${classes.pageBox}`]: {
    paddingTop: 40,
    display: "flex",
    flexDirection: "column",
    gap: 40,
    width: "100%",
    minWidth: CONTAINER_WIDTH,
    height: MAIN_HEIGHT,
  },
  [`.${classes.searchBox}`]: {
    marginInline: "auto",
    padding: 24,
    width: INNER_WIDTH,
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
  },
  [`.${classes.searchBoxForm}`]: {
    display: "flex",
    gap: 40,
  },
  [`.${classes.resultBox}`]: {
    marginInline: "auto",
    width: INNER_WIDTH,
    height: "100%",
    ".MuiDataGrid-columnHeader:focus": {
      outline: "none",
    },
    ".MuiDataGrid-columnHeader:focus-within": {
      outline: "none",
    },
    ".MuiDataGrid-row:hover": {
      cursor: "pointer",
    },
    ".MuiDataGrid-cell:focus-within": {
      outline: "none",
    },
  },
}));
