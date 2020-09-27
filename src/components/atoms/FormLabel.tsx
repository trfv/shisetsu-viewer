import React, { FC } from "react";
import Box from "./Box";

type FormLabelProps = {
  labelText: string;
  fontSize?: string;
};

const FormLabel: FC<FormLabelProps> = ({ fontSize, labelText }) => {
  return <Box fontSize={fontSize}>{labelText}</Box>;
};

FormLabel.defaultProps = {
  fontSize: "0.8rem",
};

export default FormLabel;
