import { AuthProvider } from "./auth/AuthProvider.jsx";
import { ToastProvider } from "./components/ToastProvider.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  );
}
