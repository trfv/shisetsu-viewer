import MuiTablePagination from "@material-ui/core/TablePagination";
import React, { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { ROWS_PER_PAGE_OPTION } from "../../constants/search";
import { BaseBox } from "../Box";
import { Skeleton } from "../Skeleton";

type TablePaginationProps = Pick<
  ComponentProps<typeof MuiTablePagination>,
  "count" | "rowsPerPage" | "page" | "onChangePage" | "onChangeRowsPerPage"
> & {
  loading: boolean;
};

export const TablePagination = ({
  count,
  rowsPerPage,
  page,
  onChangePage,
  onChangeRowsPerPage,
  loading,
}: TablePaginationProps) => {
  const { t } = useTranslation();
  return (
    <MuiTablePagination
      component="div"
      rowsPerPageOptions={ROWS_PER_PAGE_OPTION}
      count={count}
      rowsPerPage={rowsPerPage}
      page={page}
      onChangePage={onChangePage}
      onChangeRowsPerPage={onChangeRowsPerPage}
      labelRowsPerPage={t("表示件数")}
      labelDisplayedRows={({ from, to, count }) => (
        <BaseBox width="100px" textAlign="center" component="span" display="block">
          {loading ? <Skeleton /> : t("{{ from }}-{{ to }} / {{ count }}", { from, to, count })}
        </BaseBox>
      )}
    />
  );
};
