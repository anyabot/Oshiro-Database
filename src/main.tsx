import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import UnitList from "./pages/UnitList";
import UnitDetail from "./pages/UnitDetail";
import Buffs from "./pages/Buffs";
import Stages from "./pages/Stages";
import StageDetail from "./pages/StageDetail";
import Equipment from "./pages/Equipment";
import EquipmentDetail from "./pages/EquipmentDetail";
import Lords from "./pages/Lords";
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
          <Route index element={<Home />} />
          <Route path="units" element={<UnitList />} />
          <Route path="units/:id" element={<UnitDetail />} />
          <Route path="buffs" element={<Buffs />} />
          <Route path="stages" element={<Stages />} />
          <Route path="stages/:id" element={<StageDetail />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="equipment/:id" element={<EquipmentDetail />} />
          <Route path="lord" element={<Lords />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
