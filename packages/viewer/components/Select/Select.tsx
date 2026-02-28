import type { ChangeEvent, FC } from "react";
import { BaseBox, type BoxSize } from "../Box";
import { SmallLabel } from "../Label";
import { Spacer } from "../Spacer";
import styles from "./Select.module.css";

export type SelectChangeEvent<T = string> = ChangeEvent<HTMLSelectElement> & {
  target: HTMLSelectElement & { value: T };
};

type Props = {
  label: string;
  value: string;
  size?: BoxSize;
  onChange: (event: SelectChangeEvent<string>) => void;
  selectOptions: { value: string; label: string }[];
};

export const Select: FC<Props> = ({ label, value, size = "auto", onChange, selectOptions }) => (
  <BaseBox size={size} component="label" display="flex" flexDirection="column">
    <SmallLabel label={label} />
    <Spacer axis="vertical" size={4} />
    <select
      aria-label={label}
      className={styles["select"]}
      onChange={onChange as (event: ChangeEvent<HTMLSelectElement>) => void}
      value={value}
    >
      {selectOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </BaseBox>
);
