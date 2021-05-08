import MuiInput, { InputProps } from "@material-ui/core/Input";
import Skeleton from "@material-ui/lab/Skeleton";
import React, { FC } from "react";
import { box, BoxSize } from "../Box";
import { SmallLabel } from "../Label";
import { Spacer } from "../Spacer";

type Props = InputProps & {
  label: string;
  size?: BoxSize;
  loading?: boolean;
};

export const Input: FC<Props> = ({ label, size = "auto", loading, ...rest }: Props) => {
  const Box = box(size);
  return (
    <Box component="label" display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Spacer size={4} axis="vertical" />
      {loading ? (
        <Skeleton height={29} />
      ) : (
        <MuiInput {...rest} margin="dense" fullWidth={size === "full"} />
      )}
    </Box>
  );
};

export type InputSize = "small" | "medium" | "large" | "full";
