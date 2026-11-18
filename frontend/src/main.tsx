import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { config } from "./core/config";
import { OidcSessionProvider } from "./core/session";
import { ToastProvider } from "./ui";
import "./styles/app.css";

async function bootstrap() {
  let SessionProvider: React.ComponentType<{ children: React.ReactNode }> = OidcSessionProvider;
  // Production không kích hoạt mock, kể cả build với mode mock.
  if (config.mock) {
    const mock = await import("./mock");
    mock.installMock();
    SessionProvider = mock.MockSessionProvider;
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <SessionProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </SessionProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
}
void bootstrap();
