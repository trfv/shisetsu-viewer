import MuiInput, { InputProps } from "@mui/material/Input";
import { FC } from "react";
import { box, BoxSize } from "../Box";
import { SmallLabel } from "../Label";
import { Skeleton } from "../Skeleton";
import { Spacer } from "../Spacer";

type Props = Omit<InputProps, "size"> & {
  label: string;
  size?: BoxSize;
  loading?: boolean;
};

export const Input: FC<Props> = ({ label, size = "auto", loading, value, ...rest }: Props) => {
  const Box = box(size);
  return (
    <Box component="label" display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Spacer size={4} axis="vertical" />
      {loading ? (
        <Skeleton height={32} />
      ) : (
        <MuiInput {...rest} value={value || ""} fullWidth={size === "full"} />
      )}
    </Box>
  );
};

export type InputSize = "small" | "medium" | "large" | "full";
