import type { FC, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { BaseBox, type BoxSize } from "../Box";
import { SmallLabel } from "../Label";
import { Skeleton } from "../Skeleton";
import { Spacer } from "../Spacer";
import inputStyles from "./Input.module.css";

type Props = {
  label: string;
  size?: BoxSize;
  loading?: boolean;
  value?: string | number | null;
  readOnly?: boolean;
  multiline?: boolean;
  rows?: number;
  fullWidth?: boolean;
} & Omit<
  InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>,
  "size"
>;

export const Input: FC<Props> = ({
  label,
  size = "auto",
  loading,
  value,
  multiline,
  rows,
  readOnly,
  ...rest
}: Props) => {
  const inputClass = `${inputStyles["input"]}${multiline ? ` ${inputStyles["textarea"]}` : ""}`;

  return (
    <BaseBox size={size} component="label" display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Spacer axis="vertical" size={4} />
      {loading ? (
        <Skeleton height={32} />
      ) : multiline ? (
        <textarea
          className={inputClass}
          readOnly={readOnly}
          rows={rows}
          value={value ?? ""}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={inputStyles["input"]}
          readOnly={readOnly}
          type="text"
          value={value ?? ""}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
    </BaseBox>
  );
};
