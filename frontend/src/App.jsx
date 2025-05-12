import React from "react";
import { AuthProvider } from "./AuthProvider";
import AppRoutes from "./routes/AppRoutes";
import './assets/index.css';

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}