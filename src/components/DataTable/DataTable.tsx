import { useEffect, useRef } from "react";
import { formatDate, formatDatetime } from "../../utils/format";
import { Skeleton } from "../Skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../Table";

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
  maxWidth?: number;
  hide?: boolean;
  valueGetter?: (row: RowParams<T>) => string; // type = getter の時に設定する
};

export type Columns<T> = Column<T>[];

type Props<T> = {
  columns: Columns<T>;
  rows: T[];
  onRowClick?: (params: RowParams<T>) => void;
  fetchMore?: () => Promise<void>;
  hasNextPage?: boolean;
};

export const DataTable = <T extends Row>({
  columns,
  rows,
  onRowClick,
  fetchMore,
  hasNextPage,
}: Props<T>) => {
  const target = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && fetchMore?.()
    );
    const element = target && target.current;
    if (!element) {
      return;
    }
    observer.observe(element);
    return () => {
      observer.unobserve(element);
    };
  }, [target.current, fetchMore]);

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
                  align={col.type === "number" ? "right" : "left"}
                  sx={{
                    maxWidth: col.maxWidth,
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
            {rows.map((row, index) => {
              const rowParams = { id: row.id, value: undefined, row, columns };
              return (
                <TableRow
                  ref={index === rows.length - 20 ? target : undefined}
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
                          maxWidth: col.maxWidth,
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
            {hasNextPage && (
              <TableRow>
                {cols.map((_, index) => (
                  <TableCell key={index} size="small">
                    <Skeleton />
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
