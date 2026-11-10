import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { useIsMobile } from "../../hooks/useIsMobile";
import { formatDate, formatDatetime } from "../../utils/format";
import { Skeleton } from "../Skeleton";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../Table";

import styles from "./DataTable.module.css";

export type Row = { id: string } & { [key: string]: unknown };

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
  wrap?: boolean;
  hide?: boolean;
  valueGetter?: (row: RowParams<T>) => string;
};

export type Columns<T> = Column<T>[];

type Props<T> = {
  columns: Columns<T>;
  rows: T[];
  onRowClick?: (params: RowParams<T>) => void;
  fetchMore?: () => void;
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

const cellStyle = (col: Column<unknown>): React.CSSProperties =>
  col.wrap
    ? { maxWidth: col.maxWidth, wordBreak: "keep-all" }
    : {
        maxWidth: col.maxWidth,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      };

export const DataTable = <T extends Row>({
  columns,
  rows,
  onRowClick,
  fetchMore,
  hasNextPage,
}: Props<T>) => {
  const isMobile = useIsMobile();
  const { sentinelRef, sentinelIndex } = useInfiniteScroll(fetchMore, rows.length);

  const visibleCols = columns.filter((column) => !column.hide);

  if (isMobile) {
    const titleCol = visibleCols[0];
    const detailCols = visibleCols.slice(1);

    return (
      <div className={styles["cardList"]}>
        {rows.map((row, index) => {
          const rowParams = { id: row.id, value: undefined, row, columns };
          return (
            <div
              className={styles["card"]}
              key={row.id}
              onClick={() => onRowClick?.(rowParams)}
              ref={index === sentinelIndex ? sentinelRef : undefined}
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
            {visibleCols.map((col) => (
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
                key={row.id}
                onClick={() => onRowClick?.(rowParams)}
                ref={index === sentinelIndex ? sentinelRef : undefined}
                style={{ cursor: "pointer" }}
              >
                {visibleCols.map((col) => {
                  const value = getCellValue(col, row, columns);
                  return (
                    <TableCell
                      align={col.type === "number" ? "right" : "left"}
                      key={`${row.id}-${col.field}`}
                      size="small"
                      style={{
                        ...cellStyle(col as Column<unknown>),
                        borderBottomColor: "var(--color-text-secondary)",
                      }}
                      title={value}
                      variant="body"
                    >
                      {value}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
          {hasNextPage && (
            <TableRow>
              {visibleCols.map((_, index) => (
                <TableCell
                  // oxlint-disable-next-line react/no-array-index-key
                  key={index}
                  size="small"
                >
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

const SKELETON_ROWS = Array.from({ length: 20 }, (_, i) => i);
const SKELETON_CARDS = Array.from({ length: 6 }, (_, i) => i);
const SKELETON_RATIOS = [0.8, 0.55, 0.7, 0.45];
const skeletonRatio = (index: number) => SKELETON_RATIOS[index % SKELETON_RATIOS.length]!;

export const DataTableSkeleton = <T extends Row>({ columns }: { columns: Columns<T> }) => {
  const isMobile = useIsMobile();

  const visibleCols = columns.filter((column) => !column.hide);

  if (isMobile) {
    const titleCol = visibleCols[0];
    const detailCols = visibleCols.slice(1);

    return (
      <div aria-label="読み込み中" className={styles["cardList"]} role="progressbar">
        {SKELETON_CARDS.map((card) => (
          <div className={styles["skeletonCard"]} key={card}>
            {titleCol && (
              <div className={styles["cardTitle"]}>
                <Skeleton variant="text" width={`${skeletonRatio(card) * 100}%`} />
              </div>
            )}
            {detailCols.map((col) => (
              <div className={styles["skeletonCardRow"]} key={col.field}>
                <span className={styles["cardLabel"]}>{col.headerName}</span>
                <span className={styles["cardValue"]} style={{ width: "30%" }}>
                  <Skeleton variant="text" />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <TableContainer aria-label="読み込み中" role="progressbar">
      <Table stickyHeader={true}>
        <TableHead>
          <TableRow>
            {visibleCols.map((col) => (
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
          {SKELETON_ROWS.map((row) => (
            <TableRow key={row}>
              {visibleCols.map((col) => (
                <TableCell
                  key={col.field}
                  size="small"
                  style={{
                    ...cellStyle(col as Column<unknown>),
                    borderBottomColor: "var(--color-text-secondary)",
                  }}
                >
                  <Skeleton
                    variant="text"
                    width={col.maxWidth ? col.maxWidth * skeletonRatio(row) : "100%"}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
