import FormControl from "@material-ui/core/FormControl";
import FormGroup from "@material-ui/core/FormGroup";
import React, { ComponentProps, FC } from "react";
import Checkbox from "../atoms/Checkbox";
import FormLabel from "../atoms/FormLabel";

type CheckboxProps = ComponentProps<typeof Checkbox>;

type CheckboxGroupProps = {
  label: string;
  checkboxItems: CheckboxProps[];
};

const CheckboxGroup: FC<CheckboxGroupProps> = ({ label, checkboxItems }) => {
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
