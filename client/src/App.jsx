import React, { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedLayout from "./components/ProtectedLayout";
import Loader from "./components/Loader";

// Route-level code splitting keeps the first paint small for the landing page.
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Pricing = lazy(() => import("./pages/Pricing"));
const MeetingRoom = lazy(() => import("./pages/MeetingRoom"));

const App = () => {
  return (
    <>
      <Toaster />
      <Suspense fallback={<Loader text="Loading..." />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login mode="login" />} />
          <Route path="/register" element={<Login mode="register" />} />

          {/* Private Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/pricing" element={<Pricing />} />
            </Route>
            <Route path="/meeting/:meetingId" element={<MeetingRoom />} />
          </Route>
          {/* Other Routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
