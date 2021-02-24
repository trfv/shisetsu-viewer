import MuiTabs from "@material-ui/core/Tabs";
import React, { ComponentProps, ReactNode } from "react";
import { BaseBox } from "../Box";

type Props = ComponentProps<typeof MuiTabs>;

export const TabGroup = (props: Props) => (
  <MuiTabs {...props} indicatorColor="primary" variant="standard" />
);

type TabPanelProps<TabValue> = ComponentProps<typeof BaseBox> & {
  tabValue: TabValue;
  currentValue: TabValue;
  children: ReactNode;
};

export const TabPanel = <TabValue,>({
  tabValue,
  currentValue,
  children,
  ...rest
}: TabPanelProps<TabValue>) => {
  return tabValue !== currentValue ? null : <BaseBox {...rest}>{children}</BaseBox>;
};
