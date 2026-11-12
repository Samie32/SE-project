import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { StaffAuthProvider } from "./auth/AuthProvider";
import { ToastProvider } from "./components/Toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StaffAuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </StaffAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
