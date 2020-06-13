import "@testing-library/jest-dom/extend-expect";
import { render } from "@testing-library/react";
import React from "react";
import renderer from "react-test-renderer";
import FormLabel from "../FormLabel";

it("snapshot", () => {
  const props = {
    labelText: "formLabel",
    fontSize: "8px",
  };
  const component = renderer.create(<FormLabel {...props} />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it("interaction", () => {
  const props = {
    labelText: "formLabel",
    fontSize: "8px",
  };
  const formLabel = render(<FormLabel {...props} />);
  expect(formLabel.queryByText("formLabel")).toBeTruthy();
  expect(formLabel.queryByText("formLabel")).toHaveStyle("font-size: 8px");
});
