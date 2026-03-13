import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider as DescopeAuthProvider } from "@descope/react-sdk";
import AuthProvider from "./context/AuthContext";
import "./styles/globals.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DescopeAuthProvider projectId={import.meta.env.VITE_DESCOPE_PROJECT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </DescopeAuthProvider>
  </StrictMode>
);
