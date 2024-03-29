import type { Meta, StoryObj } from "@storybook/react";
import { DataTable } from "./DataTable";

export default {
  component: DataTable,
} as Meta<typeof DataTable>;

export const Default: StoryObj<typeof DataTable> = {
  args: {
    columns: [
      {
        field: "building_and_institution",
        headerName: "名称",
        type: "getter",
        valueGetter: (params) =>
          `${params.row["building_system_name"] ?? ""} ${
            params.row["institution_system_name"] ?? ""
          }`,
      },
      {
        field: "municipality",
        headerName: "地区",
        hide: true,
        type: "getter",
        valueGetter: (params) => params.value as string,
      },
      {
        field: "date",
        headerName: "日付",
        type: "date",
      },
      {
        field: "updated_at",
        headerName: "取得日時",
        type: "datetime",
      },
    ],
    rows: [...new Array(20)].map((_, i) => ({
      id: String(i + 1),
      building_system_name: `building${i + 1}`,
      institution_system_name: `institution${i + 1}`,
      municipality: `municipality${i + 1}`,
      date: `2021-01-${String(i + 1).padStart(2, "0")}`,
      updated_at: `2021-01-${String(i + 1).padStart(2, "0")}`,
    })),
  },
  argTypes: {
    columns: {
      control: false,
    },
    rows: {
      control: false,
    },
  },
};
