import "fontsource-roboto/300-normal.css";
import "fontsource-roboto/400-normal.css";
import "fontsource-roboto/500-normal.css";
import "fontsource-roboto/700-normal.css";
import React, { StrictMode } from "react";
import ReactDOM from "react-dom";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "./styles/index.css";

ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById("root")
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
if (process.env.NODE_ENV === "development") {
  reportWebVitals(console.log);
}
