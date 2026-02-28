import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
} from "react";
import styles from "./Table.module.css";

type TableContainerProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };
export const TableContainer = ({ className, ...props }: TableContainerProps) => (
  <div className={`${styles["tableContainer"]}${className ? ` ${className}` : ""}`} {...props} />
);

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
  stickyHeader?: boolean;
};
export const Table = ({ stickyHeader, className, ...props }: TableProps) => (
  <table
    className={`${styles["table"]}${stickyHeader ? ` ${styles["stickyHeader"]}` : ""}${className ? ` ${className}` : ""}`}
    {...props}
  />
);

type SectionProps = HTMLAttributes<HTMLTableSectionElement> & { children: ReactNode };
export const TableHead = (props: SectionProps) => <thead {...props} />;
export const TableBody = (props: SectionProps) => <tbody {...props} />;

type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  children?: ReactNode;
  hover?: boolean;
};
export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ hover, className, ...props }, ref) => (
    <tr
      className={`${hover ? styles["rowHover"] : ""}${className ? ` ${className}` : ""}`}
      ref={ref}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
  variant?: "head" | "body";
  size?: "small" | "medium";
  align?: "left" | "right" | "center";
  style?: React.CSSProperties;
};
export const TableCell = ({
  variant = "body",
  size = "medium",
  align,
  className,
  ...props
}: TableCellProps) => {
  const classNames = [
    styles["cell"],
    size === "small" && styles["cellSmall"],
    variant === "head" && styles["cellHead"],
    align === "right" && styles["cellRight"],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Component = variant === "head" ? "th" : "td";
  return <Component className={classNames} {...props} />;
};
