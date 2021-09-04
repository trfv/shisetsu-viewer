import {
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  DataGrid
} from "@mui/x-data-grid";
export { DataGrid } from "@mui/x-data-grid";
export type {
  GridCellParams,
  GridColumns,
  GridValueFormatterParams,
  GridValueGetterParams,
} from "@mui/x-data-grid";

export const CustomToolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  );
};

// export const ExportToolbar = () => {
//   return (
//     <GridToolbarContainer>
//       <GridToolbarExport innerRef={null} buttonRef={null} />
//     </GridToolbarContainer>
//   );
// };
