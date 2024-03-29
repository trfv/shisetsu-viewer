import FormGroup from "@mui/material/FormGroup";
import { Children, cloneElement, type ChangeEvent, type FC, type ReactNode } from "react";
import { box, type BoxSize } from "../Box";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Children.map(children, (child: any) => {
    if (child) {
      if (child?.props?.children) {
        return cloneElement(child, {
          children: mapChildren(child.props.children, values, onChange),
        });
      }
      if (child?.type?.displayName === Checkbox.displayName) {
        return cloneElement(child, {
          checked: values.includes(child.props.value),
          onChange,
        });
      }
    }
    return null;
  });
};

export const CheckboxGroup: FC<Props> = ({ label, values, onChange, size = "auto", children }) => {
  const Box = box(size);
  return (
    <Box>
      <SmallLabel label={label} />
      <FormGroup row={true}>{mapChildren(children, values, onChange)}</FormGroup>
    </Box>
  );
};
