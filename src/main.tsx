import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Toaster } from "@/components/ui/sonner";
import "./main.css"

function AppWrapper() {
  return (
    <React.StrictMode>
      <div className="app-container">
        <App />
        <Toaster />
      </div>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <AppWrapper />
);
