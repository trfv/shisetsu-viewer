import Box from "@material-ui/core/Box";
import React, { FC } from "react";

type FormLabelProps = {
  labelText: string;
  fontSize?: string;
};

const FormLabel: FC<FormLabelProps> = ({ fontSize, labelText }: FormLabelProps) => {
  return <Box fontSize={fontSize}>{labelText}</Box>;
};

FormLabel.defaultProps = {
  fontSize: "0.8rem",
};

export default FormLabel;
