import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import UnitList from "./pages/UnitList";
import UnitDetail from "./pages/UnitDetail";
import NotFoundPage from "./pages/NotFound";
import "@altterisk/game-hub/hub.css";
import "@altterisk/game-hub/base.css";
import "@altterisk/game-hub/components.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/units" replace />} />
          <Route path="units" element={<UnitList />} />
          <Route path="units/:id" element={<UnitDetail />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
