// src/routes/AppRoutes.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppContent from "../pages/AppContent";
import ViewProfileWrapper from "../pages/ViewProfileWrapper"; // 👈 add this
import PdfCreationLog from "../components/pdfCreationLog";
import InviteUserPage from "../pages/InviteUserPage"; // ✅ Import new page

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/viewprofile" element={<ViewProfileWrapper />} /> {/* 👈 add this */}
        <Route path="/pdf-log" element={<PdfCreationLog />} />
        <Route path="/invite" element={<InviteUserPage />} />  {/* ✅ New route */}
      </Routes>
    </Router>
  );
}