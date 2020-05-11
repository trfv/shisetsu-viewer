import FormControl from "@material-ui/core/FormControl";
import FormGroup from "@material-ui/core/FormGroup";
import React, { FC } from "react";
import Checkbox, { CheckboxProps } from "../atoms/Checkbox";
import FormLabel from "../atoms/FormLabel";

type CheckboxGroupProps = {
  label: string;
  checkboxItems: CheckboxProps[];
};

const CheckboxGroup: FC<CheckboxGroupProps> = ({ label, checkboxItems }: CheckboxGroupProps) => {
  return (
    <FormControl>
      <FormLabel labelText={label} />
      <FormGroup row>
        {checkboxItems.map((props, index) => (
          <Checkbox key={index} {...props} />
        ))}
      </FormGroup>
    </FormControl>
  );
};

export default CheckboxGroup;
