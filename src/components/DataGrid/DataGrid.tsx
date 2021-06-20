import {
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
} from "@material-ui/data-grid";
import React from "react";
export { DataGrid } from "@material-ui/data-grid";
export type {
  GridCellParams,
  GridColumns,
  GridPageChangeParams,
  GridValueFormatterParams,
  GridValueGetterParams,
} from "@material-ui/data-grid";

export const CustomToolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  );
};

export const ExportToolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarExport />
    </GridToolbarContainer>
  );
};
