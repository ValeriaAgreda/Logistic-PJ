import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

const ProtectedRoute = () => {
  const location = useLocation();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
        });

        if (!active) {
          return;
        }

        if (!response.ok) {
          localStorage.removeItem("user");
          setStatus("unauthenticated");
          return;
        }

        const data = await response.json();

        if (data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        setStatus("authenticated");
      } catch (_error) {
        if (!active) {
          return;
        }

        localStorage.removeItem("user");
        setStatus("unauthenticated");
      }
    };

    validateSession();

    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (status === "checking") {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <span className="text-muted">Validando sesion...</span>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
