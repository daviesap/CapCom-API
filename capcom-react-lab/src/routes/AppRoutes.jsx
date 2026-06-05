import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import LoginPage from "../auth/LoginPage.jsx";
import Layout from "../components/Layout.jsx";
import Loading from "../components/Loading.jsx";
import EventListPage from "../pages/EventListPage.jsx";
import EventDetailsPage from "../pages/EventDetailsPage.jsx";
import EventEditPage from "../pages/EventEditPage.jsx";
import ScheduleDaysPage from "../pages/ScheduleDaysPage.jsx";
import ScheduleDetailsPage from "../pages/ScheduleDetailsPage.jsx";

function ProtectedRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <Loading label="Checking sign-in state..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/events" element={<EventListPage />} />
          <Route path="/events/:eventId" element={<EventDetailsPage />} />
          <Route path="/events/:eventId/edit" element={<EventEditPage />} />
          <Route path="/events/:eventId/days" element={<ScheduleDaysPage />} />
          <Route
            path="/events/:eventId/days/:scheduleDayId/details"
            element={<ScheduleDetailsPage />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
