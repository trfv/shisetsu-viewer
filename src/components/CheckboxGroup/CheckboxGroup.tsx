import React, { ChangeEvent, Children, cloneElement, FC, ReactNode } from "react";
import { box, BoxSize } from "../Box";
import { Checkbox } from "../Checkbox";
import { SmallLabel } from "../Label";

type Props = {
  label: string;
  values: string[];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  size?: BoxSize;
  children: ReactNode;
};

const mapChildren = (
  children: ReactNode,
  values: Props["values"],
  onChange: Props["onChange"]
): ReactNode => {
  return Children.map(children, (child: any) => {
    if (child) {
      if (child?.props?.children) {
        return cloneElement(child, {
          children: mapChildren(child.props.children, values, onChange),
        });
      }
      if (child?.type?.displayName === Checkbox.displayName) {
        return cloneElement(child, { checked: values.includes(child.props.value), onChange });
      }
    }
    return null;
  });
};

export const CheckboxGroup: FC<Props> = ({ label, values, onChange, size = "auto", children }) => {
  const Box = box(size);
  return (
    <Box display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Box component="div" display="flex" marginLeft="-12px">
        {mapChildren(children, values, onChange)}
      </Box>
    </Box>
  );
};
