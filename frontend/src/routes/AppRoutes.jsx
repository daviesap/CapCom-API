// src/routes/AppRoutes.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const AppContent = lazy(() => import("../pages/AppContent"));
const ViewProfileWrapper = lazy(() => import("../pages/ViewProfileWrapper"));
const LogsPage = lazy(() => import("../pages/LogsPage"));

export default function AppRoutes() {
  return (
    <Router>
      <Suspense fallback={<p className="p-4 text-gray-600">Loading...</p>}>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/viewprofile" element={<ViewProfileWrapper />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
