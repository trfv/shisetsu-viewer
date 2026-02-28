import type { ButtonHTMLAttributes, FC } from "react";
import styles from "./Tab.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  value: string;
  selected?: boolean;
};

function a11yProps(value: string) {
  return {
    id: `tab-${value}`,
    "aria-controls": `tabpanel-${value}`,
    tabIndex: 0,
  };
}

export const Tab: FC<Props> = ({ label, value, selected, className, ...rest }) => (
  <button
    aria-selected={selected}
    className={`${styles["tab"]}${className ? ` ${className}` : ""}`}
    role="tab"
    style={{ minWidth: "0px" }}
    type="button"
    {...a11yProps(value)}
    {...rest}
  >
    {label}
  </button>
);
