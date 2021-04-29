import React from "react";
import { BrowserRouter } from "react-router-dom";
import { Header } from "./components/Header";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import "./utils/i18n";

const Maintenance = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Header />
        <div
          style={{
            width: "100vw",
            height: "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          メンテナンス中です。
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default Maintenance;
