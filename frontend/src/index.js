import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "@/index.css";
import App from "@/App";

// Suppress benign recharts ResizeObserver warning so CRA dev overlay doesn't intercept clicks
const RESIZE_OBSERVER_ERR = /ResizeObserver loop/;
window.addEventListener("error", (e) => {
  if (RESIZE_OBSERVER_ERR.test(e.message)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <QueryClientProvider client={queryClient}>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </QueryClientProvider>,
);
