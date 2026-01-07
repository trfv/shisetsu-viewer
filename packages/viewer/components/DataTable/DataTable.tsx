import { useEffect, useRef } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
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
  hideIfMobile?: boolean;
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
  const isMobile = useIsMobile();
  const target = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    const element = target && target.current;
    if (!element) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && fetchMore?.()
    );
    observer.observe(element);
    return () => {
      observer.unobserve(element);
    };
  }, [fetchMore]);

  const cols = columns.filter((column) => !(column.hide || (isMobile && column.hideIfMobile)));

  return (
    <TableContainer>
      <Table stickyHeader={true}>
        <TableHead>
          <TableRow>
            {cols.map((col) => (
              <TableCell
                align={col.type === "number" ? "right" : "left"}
                key={col.field}
                size="small"
                sx={{
                  maxWidth: col.maxWidth,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                variant="head"
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
                hover={true}
                key={`${row.id}-${index}`} // FIXME
                onClick={() => onRowClick?.(rowParams)}
                ref={index === rows.length - 50 ? target : undefined}
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
                      align={col.type === "number" ? "right" : "left"}
                      key={`${row.id}-${col.field}`}
                      size="small"
                      sx={{
                        maxWidth: col.maxWidth,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      variant="body"
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
  );
};
