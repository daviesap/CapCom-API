// src/routes/AppRoutes.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppContent from "../pages/AppContent";
import ViewWrapper from "../pages/ViewWrapper";
import TabsExample from "../components/tabs";
import PdfCreationLog from "../components/PpdfCreationLog";

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/view" element={<ViewWrapper />} />
        <Route path="/tabs" element={<TabsExample />} />
        <Route path="/pdf-log" element={<PdfCreationLog />} />
      </Routes>
    </Router>
  );
}