import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "./constants/env";
import { ROUTES } from "./constants/routes";
import { Auth0Provider } from "./contexts/Auth0";
import { reportWebVitals } from "./reportWebVitals";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <Auth0Provider
        authorizationParams={{
          audience: AUTH0_AUDIENCE,
          redirect_uri: `${window.location.origin}${ROUTES.waiting}`,
        }}
        clientId={AUTH0_CLIENT_ID}
        domain={AUTH0_DOMAIN}
      >
        <App />
      </Auth0Provider>
    </StrictMode>
  );
}
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
if (import.meta.env.DEV) {
  reportWebVitals(console.log);
}
