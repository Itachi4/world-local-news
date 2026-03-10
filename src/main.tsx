import { createRoot } from "react-dom/client";
import { Component } from "react";
import App from "./App.tsx";
import "./index.css";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.error("App error:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", fontFamily: "system-ui" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: "#666", marginBottom: 16 }}>Refresh the page to try again.</p>
            <button type="button" onClick={() => window.location.reload()} style={{ padding: "8px 16px", cursor: "pointer" }}>Refresh</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
