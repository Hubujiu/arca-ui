import React from "react";
import ReactDOM from "react-dom/client";
import "@enterprise/ui/styles.css";
import App from "./App";
import { installReactRefreshPreamble } from "./react-refresh-preamble";

installReactRefreshPreamble().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode><App/></React.StrictMode>,
  );
});
