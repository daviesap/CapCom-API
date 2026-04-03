// src/routes/AppRoutes.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppContent from "../pages/AppContent";
import ViewProfileWrapper from "../pages/ViewProfileWrapper"; // 👈 add this
import LogsPage from "../pages/LogsPage";

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/viewprofile" element={<ViewProfileWrapper />} /> {/* 👈 add this */}
        <Route path="/logs" element={<LogsPage />} />
      </Routes>
    </Router>
  );
}
