import type { MouseEvent } from "react";
import { ROWS_PER_PAGE } from "../../constants/datatable";
import { formatDate, formatDatetime } from "../../utils/format";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from "../Table";

type Row = { id: string } & { [key: string]: unknown };

export type RowParams<T> = {
  id: string;
  value: unknown;
  row: T;
  columns: Columns<T>;
};

type ColumnType = "string" | "number" | "date" | "datetime" | "getter";

type Column<T> = {
  field: string;
  headerName: string;
  type: ColumnType;
  description?: string;
  width: number;
  hide?: boolean;
  valueGetter?: (row: RowParams<T>) => string; // type = getter の時に設定する
};

export type Columns<T> = Column<T>[];

type Props<T> = {
  columns: Columns<T>;
  rows: T[];
  onRowClick?: (params: RowParams<T>) => void;
  rowCount: number;
  page: number;
  onPageChange: (event: MouseEvent<HTMLButtonElement> | null, page: number) => void;
};

export const DataTable = <T extends Row>({
  columns,
  rows,
  onRowClick,
  rowCount,
  page,
  onPageChange,
}: Props<T>) => {
  const cols = columns.filter((column) => !column.hide);

  return (
    <>
      <TableContainer>
        <Table stickyHeader={true}>
          <TableHead>
            <TableRow>
              {cols.map((col) => (
                <TableCell
                  key={col.field}
                  variant="head"
                  size="small"
                  width={col.width}
                  align={col.type === "number" ? "right" : "left"}
                  sx={{
                    maxWidth: col.width,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {col.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const rowParams = { id: row.id, value: undefined, row, columns };
              return (
                <TableRow
                  key={row.id}
                  hover={true}
                  onClick={() => onRowClick?.(rowParams)}
                  style={{ cursor: "pointer" }}
                >
                  {cols.map((col) => {
                    const value = row[col.field];
                    let cellValue = "";
                    switch (col.type) {
                      case "date":
                        cellValue = formatDate(value as string);
                        break;
                      case "datetime":
                        cellValue = formatDatetime(value as string);
                        break;
                      case "getter":
                        cellValue = col.valueGetter?.({ ...rowParams, value }) ?? "";
                        break;
                      case "number":
                        cellValue = isNaN(parseFloat(String(value))) ? "" : String(value);
                        break;
                      case "string":
                      default:
                        cellValue = String(value);
                        break;
                    }
                    return (
                      <TableCell
                        key={`${row.id}-${col.field}}`}
                        variant="body"
                        size="small"
                        align={col.type === "number" ? "right" : "left"}
                        sx={{
                          maxWidth: col.width,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {cellValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rowCount}
        rowsPerPageOptions={[ROWS_PER_PAGE]}
        rowsPerPage={ROWS_PER_PAGE}
        page={page}
        onPageChange={onPageChange}
        showFirstButton={true}
        showLastButton={true}
      />
    </>
  );
};
