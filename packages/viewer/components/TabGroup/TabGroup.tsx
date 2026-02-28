import { Children, cloneElement, type ComponentProps, type FC, type ReactNode } from "react";
import { BaseBox } from "../Box";
import type { Tab } from "../Tab";
import styles from "./TabGroup.module.css";

type Props = {
  value: string;
  onChange?: (event: React.ChangeEvent<unknown>, newValue: string) => void;
  children: ReactNode;
  className?: string;
};

export const TabGroup: FC<Props> = ({ value, onChange, children, className }) => (
  <div className={`${styles["tabList"]}${className ? ` ${className}` : ""}`} role="tablist">
    {Children.map(children, (child) => {
      if (!child || typeof child !== "object" || !("props" in child)) return child;
      const tabProps = child.props as ComponentProps<typeof Tab>;
      return cloneElement(child as React.ReactElement<ComponentProps<typeof Tab>>, {
        selected: tabProps.value === value,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          onChange?.(e as unknown as React.ChangeEvent<unknown>, tabProps.value);
        },
      });
    })}
  </div>
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
