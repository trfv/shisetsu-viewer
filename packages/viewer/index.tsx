import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/noto-sans-jp";
import "./theme.css";
import App from "./App";
import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "./constants/env";
import { ROUTES } from "./constants/routes";
import { Auth0Provider } from "./contexts/Auth0";

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
        useRefreshTokens
      >
        <App />
      </Auth0Provider>
    </StrictMode>
  );
}
