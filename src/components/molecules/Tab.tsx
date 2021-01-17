import MuiTab from "@material-ui/core/Tab";
import MuiTabs from "@material-ui/core/Tabs";
import { ReactNode } from "react";
import Box from "../atoms/Box";

export const Tab = MuiTab;
export const Tabs = MuiTabs;

type TabPanelProps<T> = {
  children: ReactNode;
  tabValue: T;
  currentValue: T;
};

export const TabPanel = <T,>({ children, tabValue, currentValue }: TabPanelProps<T>) => {
  if (tabValue !== currentValue) {
    return null;
  }
  return <Box pt="32px">{children}</Box>;
};
