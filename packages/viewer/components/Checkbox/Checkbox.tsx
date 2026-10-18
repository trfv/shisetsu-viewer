import type { ChangeEvent, FC } from "react";

import { BaseBox, type BoxSize } from "../Box";

import styles from "./Checkbox.module.css";

type Props = {
  label: string;
  value: string;
  noLeftMargin?: boolean;
  size?: BoxSize;
  /** CheckboxGroup 内では不要 */
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const Checkbox: FC<Props> = ({
  label,
  value,
  size = "auto",
  checked = false,
  onChange = () => null,
}) => (
  <BaseBox size={size}>
    <label className={styles["label"]}>
      <input
        checked={checked}
        className={styles["checkbox"]}
        onChange={onChange}
        type="checkbox"
        value={value}
      />
      {label}
    </label>
  </BaseBox>
);
