import "@testing-library/jest-dom/extend-expect";
import { fireEvent, render } from "@testing-library/react";
import React from "react";
import renderer from "react-test-renderer";
import CheckboxGroup from "../CheckboxGroup";

it("snapshot", () => {
  const props = {
    label: "checkbox",
    checkboxItems: [
      {
        label: "checkbox1",
        checked: false,
        onChange: jest.fn(),
      },
      {
        label: "checkbox2",
        checked: false,
        onChange: jest.fn(),
      },
      {
        label: "checkbox3",
        checked: false,
        onChange: jest.fn(),
      },
    ],
  };
  const component = renderer.create(<CheckboxGroup {...props} />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it("interaction", () => {
  const props = {
    label: "checkbox",
    checkboxItems: [
      {
        label: "checkbox1",
        checked: false,
        onChange: jest.fn(),
      },
      {
        label: "checkbox2",
        checked: false,
        onChange: jest.fn(),
      },
      {
        label: "checkbox3",
        checked: false,
        onChange: jest.fn(),
      },
    ],
  };
  const checkbox = render(<CheckboxGroup {...props} />);
  expect(checkbox.queryByLabelText("checkbox1")).toBeTruthy();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  fireEvent.click(checkbox.queryByLabelText("checkbox1")!);
  expect(props.checkboxItems[0].onChange).toHaveBeenCalled();
  expect(props.checkboxItems[1].onChange).not.toHaveBeenCalled();
  expect(props.checkboxItems[2].onChange).not.toHaveBeenCalled();
});
