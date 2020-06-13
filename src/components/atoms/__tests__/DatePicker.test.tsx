import "@testing-library/jest-dom/extend-expect";
import { fireEvent, render } from "@testing-library/react";
import React from "react";
import renderer from "react-test-renderer";
import DatePicker from "../DatePicker";

it("snapshot", () => {
  const props = {
    value: new Date("2020-06-13"),
    onChange: jest.fn(),
  };
  const component = renderer.create(<DatePicker {...props} />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it("interaction", () => {
  const props = {
    value: new Date("2020-06-13"),
    onChange: jest.fn(),
  };
  const datePicker = render(<DatePicker {...props} />);
  expect(datePicker.baseElement).toBeTruthy();
  fireEvent.click(datePicker.baseElement);
});
