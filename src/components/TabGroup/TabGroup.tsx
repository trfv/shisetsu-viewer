import MuiTabs from "@mui/material/Tabs";
import type { ComponentProps, ReactNode } from "react";
import { BaseBox } from "../Box";

type Props = ComponentProps<typeof MuiTabs>;

export const TabGroup = (props: Props) => (
  <MuiTabs {...props} variant="standard" textColor="inherit" />
);

type TabPanelProps<TabValue> = ComponentProps<typeof BaseBox> & {
  tabValue: TabValue;
  currentValue: TabValue;
  children: ReactNode;
};

export const TabPanel = <TabValue extends string>({
  tabValue,
  currentValue,
  children,
  ...rest
}: TabPanelProps<TabValue>) => {
  return tabValue !== currentValue ? null : <BaseBox {...rest}>{children}</BaseBox>;
};
