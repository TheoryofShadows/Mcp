import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider as DescopeAuthProvider } from "@descope/react-sdk";
import AuthProvider from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/globals.css";
import App from "./App.jsx";

const descopeProjectId = import.meta.env.VITE_DESCOPE_PROJECT_ID;

// The router + app tree. Wrapped below.
const appTree = (
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

// Only mount the Descope provider when it's actually configured. The default
// deployment leaves Descope unset; initializing it with an empty projectId
// makes needless network/storage calls that can throw at startup — notably on
// iOS Safari, where it white-screened the whole app.
const tree = descopeProjectId ? (
  <DescopeAuthProvider projectId={descopeProjectId}>{appTree}</DescopeAuthProvider>
) : (
  appTree
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Outermost boundary: providers, Navbar, and routes all live below it, so
        nothing can leave the visitor staring at a blank page. */}
    <ErrorBoundary>{tree}</ErrorBoundary>
  </StrictMode>
);
