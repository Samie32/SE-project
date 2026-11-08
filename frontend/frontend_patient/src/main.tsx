import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { InMemoryWebStorage, WebStorageStateStore } from "oidc-client-ts";
import App from "./App";
import "./index.css";
const userStore = new WebStorageStateStore({ store: new InMemoryWebStorage() });
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider
      authority={
        import.meta.env.VITE_OIDC_AUTHORITY ||
        "http://localhost:8180/realms/clinic"
      }
      client_id={import.meta.env.VITE_OIDC_CLIENT_ID || "clinic-web"}
      redirect_uri={window.location.origin + "/callback"}
      post_logout_redirect_uri={window.location.origin + "/login"}
      response_type="code"
      scope="openid profile email"
      userStore={userStore}
      automaticSilentRenew={false}
      onSigninCallback={() => window.history.replaceState({}, "", "/patient")}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
);
