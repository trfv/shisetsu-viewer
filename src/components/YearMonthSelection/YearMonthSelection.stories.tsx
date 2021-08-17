import type { Meta, Story } from "@storybook/react";
import type { ComponentProps } from "react";
import { useState } from "react";
import { YearMonthSelection } from "./YearMonthSelection";

export default {
  title: "YearMonthSelection",
  component: YearMonthSelection,
} as Meta;

export const Basic: Story<ComponentProps<typeof YearMonthSelection>> = (args) => {
  const [page, setPage] = useState(1);
  return <YearMonthSelection {...args} page={page} handleChange={setPage} />;
};

Basic.args = {
  yearMonthChips: {
    1: { value: "2021-08", label: "2021年08月" },
    2: { value: "2021-09", label: "2021年09月" },
    3: { value: "2021-10", label: "2021年10月" },
    4: { value: "2021-11", label: "2021年11月" },
    5: { value: "2021-12", label: "2021年12月" },
    6: { value: "2022-01", label: "2022年01月" },
    7: { value: "2022-02", label: "2022年02月" },
  },
};
