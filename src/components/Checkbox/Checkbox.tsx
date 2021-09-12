import MuiCheckbox from "@mui/material/Checkbox";
import { ChangeEvent, FC } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { box, BoxSize } from "../Box";
import { MediumLabel } from "../Label";

type Props = {
  label: string;
  value: string;
  noLeftMargin?: boolean;
  size?: BoxSize;
  /** 以下は CheckboxGroup ではセットしなくて良い */
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const Checkbox: FC<Props> = ({
  label,
  value,
  noLeftMargin,
  size = "auto",
  checked,
  onChange,
}) => {
  const Box = box(size);
  const isMobile = useIsMobile();
  return (
    <Box
      component="label"
      display="flex"
      alignItems="center"
      marginLeft={noLeftMargin ? "-12px" : "0px"}
    >
      <MuiCheckbox
        value={value}
        checked={checked}
        onChange={onChange}
        color="default"
        size={isMobile ? "small" : undefined}
        style={{ marginRight: isMobile ? -6 : 0 }}
      />
      <MediumLabel label={label} />
    </Box>
  );
};
