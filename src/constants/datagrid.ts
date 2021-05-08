import { getGridLocalization, GridLocaleText } from "@material-ui/data-grid";

// https://github.com/mui-org/material-ui-x/blob/master/packages/grid/_modules_/grid/locales/jaJP.ts
const jaJPGrid: Partial<GridLocaleText> = {
  rootGridLabel: "grid",
  noRowsLabel: "表示するデータがありません。",
  noResultsOverlayLabel: "表示するデータがありません。",
  errorOverlayDefaultLabel: "エラーが発生しました。",
  toolbarDensity: "行間隔",
  toolbarDensityLabel: "行間隔",
  toolbarDensityCompact: "コンパクト",
  toolbarDensityStandard: "標準",
  toolbarDensityComfortable: "ひろめ",
  toolbarColumns: "列一覧",
  toolbarColumnsLabel: "列選択",
  toolbarExport: "エクスポート",
  toolbarExportLabel: "エクスポート",
  toolbarExportCSV: "CSVダウンロード",
  columnsPanelTextFieldLabel: "列検索",
  columnsPanelTextFieldPlaceholder: "列名を入力",
  columnsPanelShowAllButton: "すべて表示",
  columnsPanelHideAllButton: "すべて非表示",
};

// https://github.com/mui-org/material-ui/blob/master/packages/material-ui/src/locale/index.ts
const jaJPCore = {
  props: {
    MuiTablePagination: {
      backIconButtonText: "前のページ",
      labelRowsPerPage: "表示件数",
      labelDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
        `${from}-${to} / ${count}`,
      nextIconButtonText: "次のページ",
    },
  },
};

export const jaJP = getGridLocalization(jaJPGrid, jaJPCore);
