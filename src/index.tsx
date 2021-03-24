import { Auth0Provider } from "@auth0/auth0-react";
import "fontsource-roboto/300-normal.css";
import "fontsource-roboto/400-normal.css";
import "fontsource-roboto/500-normal.css";
import "fontsource-roboto/700-normal.css";
import { StrictMode } from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { ROUTES } from "./constants/routes";
import reportWebVitals from "./reportWebVitals";
import "./styles/index.css";

ReactDOM.render(
  <StrictMode>
    <Auth0Provider
      domain={process.env.REACT_APP_AUTH0_DOMAIN ?? ""}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID ?? ""}
      redirectUri={`${window.location.origin}${ROUTES.waiting}`}
      returnTo={`${window.location.origin}${ROUTES.root}`}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
  document.getElementById("root")
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
if (process.env.NODE_ENV === "development") {
  reportWebVitals(console.log);
}
