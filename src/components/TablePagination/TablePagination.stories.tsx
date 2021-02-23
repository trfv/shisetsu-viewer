import React, { ComponentProps } from "react";
import { TablePagination } from "./TablePagination";

type Props = ComponentProps<typeof TablePagination>;

export default {
  title: "TablePagination",
  component: TablePagination,
};

export const Basic = (props: Props) => {
  return <TablePagination {...props} />;
};

Basic.args = {
  count: 100,
  rowsPerPage: 10,
  page: 1,
};
