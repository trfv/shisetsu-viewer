import {
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
} from "@material-ui/data-grid";
export { DataGrid } from "@material-ui/data-grid";
export type {
  GridCellParams,
  GridColumns,
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

// export const ExportToolbar = () => {
//   return (
//     <GridToolbarContainer>
//       <GridToolbarExport innerRef={null} buttonRef={null} />
//     </GridToolbarContainer>
//   );
// };
