import MuiInput, { type InputProps } from "@mui/material/Input";
import type { FC } from "react";
import { box, type BoxSize } from "../Box";
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
    // eslint-disable-next-line react-hooks/static-components
    <Box component="label" display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Spacer axis="vertical" size={4} />
      {loading ? (
        <Skeleton height={32} />
      ) : (
        <MuiInput {...rest} fullWidth={size === "full"} value={value || ""} />
      )}
    </Box>
  );
};

export type InputSize = "small" | "medium" | "large" | "full";
