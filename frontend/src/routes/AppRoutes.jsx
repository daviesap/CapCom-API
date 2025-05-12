// src/routes/AppRoutes.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppContent from "../pages/AppContent";
import ViewWrapper from "../pages/ViewWrapper";
import ViewProfileTabsWrapper from "../pages/ViewProfileTabsWrapper"; // 👈 add this
import PdfCreationLog from "../components/pdfCreationLog";

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/view" element={<ViewWrapper />} />
         <Route path="/view-tabs" element={<ViewProfileTabsWrapper />} /> {/* 👈 add this */}
        <Route path="/pdf-log" element={<PdfCreationLog />} />
      </Routes>
    </Router>
  );
}