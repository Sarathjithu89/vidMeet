import { useAuth } from "@clerk/react";
import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "./Loader";

const ProtectedRoute = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    // Preserve the destination (e.g. an invite link) across Clerk's internal
    // sign-in/sign-up navigation, which may drop react-router state.
    try {
      sessionStorage.setItem("vidmeet:redirectTo", from);
    } catch {
      // Ignore storage failures (private mode / disabled storage).
    }
  }, [isLoaded, isSignedIn, from]);

  if (!isLoaded) {
    return <Loader text="Loading..." />;
  }
  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
