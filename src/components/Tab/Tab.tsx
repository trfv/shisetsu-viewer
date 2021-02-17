import MuiTab from "@material-ui/core/Tab";
import MuiTabs from "@material-ui/core/Tabs";
import { ComponentProps, ReactNode } from "react";
import { BaseBox } from "../Box";

export const Tab = MuiTab;
export const Tabs = MuiTabs;

type TabPanelProps<TabValue> = ComponentProps<typeof BaseBox> & {
  tabValue: TabValue;
  currentValue: TabValue;
  children: ReactNode;
};

export const TabPanel = <T,>({ tabValue, currentValue, children, className }: TabPanelProps<T>) => {
  return tabValue !== currentValue ? null : <BaseBox className={className}>{children}</BaseBox>;
};
