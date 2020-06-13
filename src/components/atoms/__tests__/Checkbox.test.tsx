import "@testing-library/jest-dom/extend-expect";
import { fireEvent, render } from "@testing-library/react";
import React from "react";
import renderer from "react-test-renderer";
import Checkbox from "../Checkbox";

it("snapshot", () => {
  const props = {
    label: "checkbox",
    checked: false,
    onChange: jest.fn(),
  };
  const component = renderer.create(<Checkbox {...props} />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it("interaction", () => {
  const props = {
    label: "checkbox",
    checked: false,
    onChange: jest.fn(),
  };
  const checkbox = render(<Checkbox {...props} />);
  expect(checkbox.queryByLabelText("checkbox")).toBeTruthy();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  fireEvent.click(checkbox.queryByLabelText("checkbox")!);
  expect(props.onChange).toHaveBeenCalled();
});
