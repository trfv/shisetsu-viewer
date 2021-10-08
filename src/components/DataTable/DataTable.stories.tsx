import type { Meta, Story } from "@storybook/react";
import type { ComponentProps } from "react";
import { DataTable } from "./DataTable";

export default {
  title: "DataTable",
  component: DataTable,
} as Meta;

export const Basic: Story<ComponentProps<typeof DataTable>> = (args) => {
  return <DataTable {...args} onRowClick={(params) => console.log(params)} />;
};

Basic.args = {
  columns: [
    {
      field: "building_and_institution",
      headerName: "名称",
      width: 360,
      type: "getter",
      valueGetter: (params) =>
        `${params.row["building_system_name"] ?? ""} ${
          params.row["institution_system_name"] ?? ""
        }`,
    },
    {
      field: "municipality",
      headerName: "地区",
      width: 120,
      hide: true,
      type: "getter",
      valueGetter: (params) => params.value as string,
    },
    {
      field: "date",
      headerName: "日付",
      width: 160,
      type: "date",
    },
    {
      field: "created_at",
      headerName: "取得日時",
      width: 200,
      type: "datetime",
    },
  ],
  rows: [...new Array(20)].map((_, i) => ({
    id: String(i + 1),
    building_system_name: `buiding${i + 1}`,
    institution_system_name: `institution${i + 1}`,
    municipality: `municipality${i + 1}`,
    date: `2021-01-${String(i + 1).padStart(2, "0")}`,
    created_at: `2021-01-${String(i + 1).padStart(2, "0")}`,
  })),
  page: 0,
  rowCount: 20,
};