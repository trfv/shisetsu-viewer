import { useEffect, useRef } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { formatDate, formatDatetime } from "../../utils/format";
import { styled } from "../../utils/theme";
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

  const tableCols = columns.filter((column) => !(column.hide || (isMobile && column.hideIfMobile)));
  const cardCols = columns.filter((column) => !column.hide);

  if (isMobile) {
    const titleCol = cardCols[0];
    const detailCols = cardCols.slice(1);

    return (
      <StyledCardList>
        {rows.map((row, index) => {
          const rowParams = { id: row.id, value: undefined, row, columns };
          return (
            <StyledCard
              key={`${row.id}-${index}`}
              onClick={() => onRowClick?.(rowParams)}
              ref={index === rows.length - 50 ? cardTarget : undefined}
            >
              {titleCol && (
                <StyledCardTitle>{getCellValue(titleCol, row, columns)}</StyledCardTitle>
              )}
              {detailCols.map((col) => (
                <StyledCardRow key={`${row.id}-${col.field}`}>
                  <StyledCardLabel>{col.headerName}</StyledCardLabel>
                  <StyledCardValue>{getCellValue(col, row, columns)}</StyledCardValue>
                </StyledCardRow>
              ))}
            </StyledCard>
          );
        })}
        {hasNextPage && (
          <StyledCard style={{ cursor: "default" }}>
            <Skeleton />
            <Skeleton width="60%" />
          </StyledCard>
        )}
      </StyledCardList>
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
                {tableCols.map((col) => (
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

const StyledCardList = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  padding: theme.spacing(0, 1),
}));

const StyledCard = styled("div")(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  cursor: "pointer",
  "&:active": {
    opacity: 0.7,
  },
}));

const StyledCardTitle = styled("div")({
  fontSize: "0.95rem",
  fontWeight: 500,
  marginBottom: 4,
});

const StyledCardRow = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: "2px 0",
});

const StyledCardLabel = styled("span")(({ theme }) => ({
  fontSize: "0.7rem",
  color: theme.palette.text.secondary,
  flexShrink: 0,
  marginRight: "0.5rem",
}));

const StyledCardValue = styled("span")({
  fontSize: "0.85rem",
  textAlign: "right",
  wordBreak: "break-word",
});
