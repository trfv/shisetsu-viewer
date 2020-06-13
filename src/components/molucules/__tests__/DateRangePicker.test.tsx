import "@testing-library/jest-dom/extend-expect";
import { fireEvent, render } from "@testing-library/react";
import React from "react";
import renderer from "react-test-renderer";
import DateRangePicker from "../DateRangePicker";

it("snapshot", () => {
  const props = {
    label: "dateRangePicker",
    startDateProps: {
      value: new Date("2020-06-13"),
      onChange: jest.fn(),
    },
    endDateProps: {
      value: new Date("2020-06-20"),
      onChange: jest.fn(),
    },
  };
  const component = renderer.create(<DateRangePicker {...props} />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it("interaction", () => {
  const props = {
    label: "dateRangePicker",
    startDateProps: {
      value: new Date("2020-06-13"),
      onChange: jest.fn(),
    },
    endDateProps: {
      value: new Date("2020-06-20"),
      onChange: jest.fn(),
    },
  };
  const dateRangePicker = render(<DateRangePicker {...props} />);
  expect(dateRangePicker.baseElement).toBeTruthy();
  fireEvent.click(dateRangePicker.baseElement);
});
