import React, { FC } from "react";
import Box from "./Box";

type FormLabelProps = {
  labelText: string;
  fontSize?: string;
};

const FormLabel: FC<FormLabelProps> = ({ fontSize, labelText }) => {
  return <Box fontSize={fontSize || "0.8rem"}>{labelText}</Box>;
};

export default FormLabel;
