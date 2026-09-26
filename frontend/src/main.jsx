import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "32px",
            fontFamily: "sans-serif",
            maxWidth: "700px",
            margin: "40px auto",
            background: "#fef2f2",
            border: "2px solid #ef4444",
            borderRadius: "12px",
          }}
        >
          <h2 style={{ color: "#b91c1c", marginTop: 0 }}>
            Runtime Error Caught:
          </h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              color: "#7f1d1d",
              fontSize: "13px",
              background: "#fff",
              padding: "12px",
              borderRadius: "8px",
            }}
          >
            {this.state.error?.stack ||
              this.state.error?.message ||
              String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
