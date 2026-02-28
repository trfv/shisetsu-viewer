import { useEffect, useRef } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { formatDate, formatDatetime } from "../../utils/format";
import { Skeleton } from "../Skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../Table";
import styles from "./DataTable.module.css";

type Row = { id: string } & { [key: string]: unknown };

type RowParams<T> = {
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

const getCellValue = <T extends Row>(col: Column<T>, row: T, columns: Columns<T>): string => {
  const value = row[col.field];
  const rowParams = { id: row.id, value, row, columns };
  switch (col.type) {
    case "date":
      return formatDate(value as string);
    case "datetime":
      return formatDatetime(value as string);
    case "getter":
      return col.valueGetter?.(rowParams) ?? "";
    case "number":
      return isNaN(parseFloat(String(value))) ? "" : String(value);
    case "string":
    default:
      return String(value);
  }
};

const cellStyle = (col: Column<unknown>): React.CSSProperties => ({
  maxWidth: col.maxWidth,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const DataTable = <T extends Row>({
  columns,
  rows,
  onRowClick,
  fetchMore,
  hasNextPage,
}: Props<T>) => {
  const isMobile = useIsMobile();
  const target = useRef<HTMLTableRowElement | null>(null);
  const cardTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = isMobile ? cardTarget.current : target.current;
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
  }, [fetchMore, isMobile]);

  const tableCols = columns.filter((column) => !column.hide);
  const cardCols = columns.filter((column) => !column.hide);

  if (isMobile) {
    const titleCol = cardCols[0];
    const detailCols = cardCols.slice(1);

    return (
      <div className={styles["cardList"]}>
        {rows.map((row, index) => {
          const rowParams = { id: row.id, value: undefined, row, columns };
          return (
            <div
              className={styles["card"]}
              key={`${row.id}-${index}`}
              onClick={() => onRowClick?.(rowParams)}
              ref={index === rows.length - 50 ? cardTarget : undefined}
            >
              {titleCol && (
                <div className={styles["cardTitle"]}>{getCellValue(titleCol, row, columns)}</div>
              )}
              {detailCols.map((col) => (
                <div className={styles["cardRow"]} key={`${row.id}-${col.field}`}>
                  <span className={styles["cardLabel"]}>{col.headerName}</span>
                  <span className={styles["cardValue"]}>{getCellValue(col, row, columns)}</span>
                </div>
              ))}
            </div>
          );
        })}
        {hasNextPage && (
          <div className={styles["card"]} style={{ cursor: "default" }}>
            <Skeleton />
            <Skeleton width="60%" />
          </div>
        )}
      </div>
    );
  }

  return (
    <TableContainer>
      <Table stickyHeader={true}>
        <TableHead>
          <TableRow>
            {tableCols.map((col) => (
              <TableCell
                align={col.type === "number" ? "right" : "left"}
                key={col.field}
                size="small"
                style={{
                  ...cellStyle(col as Column<unknown>),
                  borderBottomColor: "var(--color-text-primary)",
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
                {tableCols.map((col) => (
                  <TableCell
                    align={col.type === "number" ? "right" : "left"}
                    key={`${row.id}-${col.field}`}
                    size="small"
                    style={{
                      ...cellStyle(col as Column<unknown>),
                      borderBottomColor: "var(--color-text-secondary)",
                    }}
                    variant="body"
                  >
                    {getCellValue(col, row, columns)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
          {hasNextPage && (
            <TableRow>
              {tableCols.map((_, index) => (
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
