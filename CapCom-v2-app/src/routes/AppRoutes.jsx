import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import LoginPage from "../auth/LoginPage.jsx";
import Layout from "../components/Layout.jsx";
import Loading from "../components/Loading.jsx";
import AdminPage from "../pages/AdminPage.jsx";
import EventListPage from "../pages/EventListPage.jsx";
import EventEditPage from "../pages/EventEditPage.jsx";
import ProfilePage from "../pages/ProfilePage.jsx";
import ScheduleDaysPage from "../pages/ScheduleDaysPage.jsx";
import ScheduleDetailsPage from "../pages/ScheduleDetailsPage.jsx";
import CompaniesPage from "../pages/CompaniesPage.jsx";

function ProtectedRoute() {
  const { user, authLoading } = useAuth();

    if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

function EventEditRedirect() {
  const { eventId } = useParams();
  return <Navigate to={`/events/${eventId}/edit`} replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route index element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<EventListPage />} />
          <Route path="/events/:eventId" element={<EventEditRedirect />} />
          <Route path="/events/:eventId/edit" element={<EventEditPage />} />
          <Route path="/events/:eventId/days" element={<ScheduleDaysPage />} />
          <Route
            path="/events/:eventId/days/:scheduleDayId/details"
            element={<ScheduleDetailsPage />}
          />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
