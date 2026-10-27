import { Suspense, type ReactNode } from "react";

import { DataTable, type Columns, type Row, type RowParams } from "../DataTable";
import { SearchForm } from "../SearchForm";
import { Snackbar } from "../Snackbar";
import { Spinner } from "../Spinner";
import { ErrorBoundary } from "../utils/ErrorBoundary";

import styles from "./SearchPageLayout.module.css";

type ChipItem = {
  label: string;
  onDelete?: () => void;
};

type Props = {
  chips: ChipItem[];
  controls: ReactNode;
  pending: boolean;
  resetKey: string;
  children: ReactNode;
};

const renderError = (error: Error) => <Snackbar open={true} message={error.message} />;

export const SearchPageLayout = ({ chips, controls, pending, resetKey, children }: Props) => {
  return (
    <main className={styles["pageBox"]}>
      <div className={styles["searchBox"]}>
        <div className={styles["searchBoxForm"]}>
          <SearchForm chips={chips}>{controls}</SearchForm>
        </div>
      </div>
      <div
        aria-busy={pending}
        className={`${styles["resultBox"]} ${pending ? styles["resultBoxPending"] : ""}`}
      >
        <ErrorBoundary fallback={renderError} resetKey={resetKey}>
          <Suspense
            fallback={
              <div className={styles["resultBoxNoData"]}>
                <Spinner />
              </div>
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      </div>
    </main>
  );
};

type ResultsProps<T extends Row> = {
  columns: Columns<T>;
  rows: T[];
  onRowClick?: (params: RowParams<T>) => void;
  fetchMore?: () => void;
  hasNextPage?: boolean;
};

export const SearchResults = <T extends Row>({
  columns,
  rows,
  onRowClick,
  fetchMore,
  hasNextPage,
}: ResultsProps<T>) => {
  if (rows.length === 0) {
    return <div className={styles["resultBoxNoData"]}>表示するデータが存在しません</div>;
  }
  return (
    <DataTable
      columns={columns}
      rows={rows}
      {...(fetchMore ? { fetchMore } : {})}
      {...(hasNextPage !== undefined ? { hasNextPage } : {})}
      {...(onRowClick ? { onRowClick } : {})}
    />
  );
};
