import React from "react";
import { AuthProvider } from "./AuthProvider";
import AppRoutes from "./routes/AppRoutes";
import './assets/index.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-200">
        <AppRoutes />
        <ToastContainer position="bottom-right" autoClose={2000} />
      </div>
    </AuthProvider>
  );
}