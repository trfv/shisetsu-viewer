import MuiTab from "@mui/material/Tab";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof MuiTab>, "value"> & {
  value: string;
};

function a11yProps(value: string) {
  return {
    id: `tab-${value}`,
    "aria-controls": `tabpanel-${value}`,
    tabIndex: 0,
  };
}

export const Tab = (props: Props) => (
  <MuiTab {...props} {...a11yProps(props.value)} style={{ minWidth: "0px" }} /> // min-width: 0px is for clear default style.
);
