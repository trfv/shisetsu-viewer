import { StrictMode } from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "./constants/env";
import { ROUTES } from "./constants/routes";
import { Auth0Provider } from "./contexts/Auth0";
import reportWebVitals from "./reportWebVitals";

ReactDOM.render(
  <StrictMode>
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      client_id={AUTH0_CLIENT_ID}
      redirect_uri={`${window.location.origin}${ROUTES.waiting}`}
      audience={AUTH0_AUDIENCE}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
  document.getElementById("root")
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
if (import.meta.env.NODE_ENV === "development") {
  reportWebVitals(console.log);
}
