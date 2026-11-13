import { SignIn, SignUp, useUser } from "@clerk/react";
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const Login = ({ mode = "login" }) => {
  const isRegistered = mode === "register";
  const location = useLocation();

  // Return to the page the user originally asked for (e.g. a meeting invite).
  let storedRedirect = null;
  try {
    storedRedirect = sessionStorage.getItem("vidmeet:redirectTo");
  } catch {
    // Ignore storage failures.
  }

  const from = location.state?.from || storedRedirect;
  const redirectTo =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
      ? from
      : "/dashboard";

  const { isLoaded, isSignedIn } = useUser();

  if (isLoaded && isSignedIn) {
    try {
      sessionStorage.removeItem("vidmeet:redirectTo");
    } catch {
      // Ignore storage failures.
    }
    return <Navigate to={redirectTo} replace />;
  }
  return (
    <div className="min-h-screen w-full bg-[url('/login_bg.png')] text-slate-800 p-4 md:p-6 lg:p-8 flex items-center justify-center font-sans">
      <div className="w-full flex justify-center py-2">
        {isRegistered ? (
          <SignUp
            routing="path"
            path="/register"
            signInUrl="/login"
            fallbackRedirectUrl={redirectTo}
          />
        ) : (
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/register"
            fallbackRedirectUrl={redirectTo}
          />
        )}
      </div>
    </div>
  );
};

export default Login;
