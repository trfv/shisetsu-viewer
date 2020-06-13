import "@testing-library/jest-dom/extend-expect";
import { render } from "@testing-library/react";
import React from "react";
import renderer from "react-test-renderer";
import Select from "../Select";

it("snapshot", () => {
  const props = {
    label: "select",
    value: "",
    onChange: jest.fn(),
    disabled: false,
    selectOptions: [
      {
        value: "value1",
        label: "label1",
      },
      {
        value: "value2",
        label: "label2",
      },
      {
        value: "value3",
        label: "label3",
      },
    ],
  };
  const component = renderer.create(<Select {...props} />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it("interaction", () => {
  const props = {
    label: "select",
    value: "",
    onChange: jest.fn(),
    disabled: false,
    selectOptions: [
      {
        value: "value1",
        label: "label1",
      },
      {
        value: "value2",
        label: "label2",
      },
      {
        value: "value3",
        label: "label3",
      },
    ],
  };
  const select = render(<Select {...props} />);
  expect(select.queryByText("select")).toBeTruthy();
});
