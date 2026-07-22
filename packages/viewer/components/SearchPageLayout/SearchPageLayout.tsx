import { type ReactNode } from "react";

import { DataTable, type Columns, type Row, type RowParams } from "../DataTable";
import { SearchForm } from "../SearchForm";
import { Snackbar } from "../Snackbar";
import { Spinner } from "../Spinner";

import styles from "./SearchPageLayout.module.css";

type ChipItem = {
  label: string;
  onDelete?: () => void;
};

type Props<T extends Row> = {
  chips: ChipItem[];
  controls: ReactNode;
  loading: boolean;
  fetchingMore: boolean;
  empty: boolean;
  columns: Columns<T>;
  rows: T[];
  onRowClick?: (params: RowParams<T>) => void;
  fetchMore?: () => Promise<void>;
  hasNextPage?: boolean;
  error?: Error | undefined;
};

export const SearchPageLayout = <T extends Row>({
  chips,
  controls,
  loading,
  fetchingMore,
  empty,
  columns,
  rows,
  onRowClick,
  fetchMore,
  hasNextPage,
  error,
}: Props<T>) => {
  return (
    <main className={styles["pageBox"]}>
      <div className={styles["searchBox"]}>
        <div className={styles["searchBoxForm"]}>
          <SearchForm chips={chips}>{controls}</SearchForm>
        </div>
      </div>
      <div className={styles["resultBox"]}>
        {loading && !fetchingMore ? (
          <div className={styles["resultBoxNoData"]}>
            <Spinner />
          </div>
        ) : empty ? (
          <div className={styles["resultBoxNoData"]}>表示するデータが存在しません</div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            {...(fetchMore ? { fetchMore } : {})}
            {...(hasNextPage !== undefined ? { hasNextPage } : {})}
            {...(onRowClick ? { onRowClick } : {})}
          />
        )}
      </div>
      {error && <Snackbar open={true} message={error.message} />}
    </main>
  );
};
