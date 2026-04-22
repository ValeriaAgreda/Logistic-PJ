import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../styles/login.css";
import { API_BASE_URL } from "../config/api";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,50}$/;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);

  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError("El enlace de recuperación no es válido.");
        setLoadingToken(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password/${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          setTokenError(data.error || "El enlace de recuperación ya no es válido.");
          return;
        }

        setUserInfo({
          correo: data.correo,
          nombre_completo: data.nombre_completo,
        });
      } catch (requestError) {
        console.error("Error al validar token:", requestError);
        setTokenError("No se pudo validar el enlace de recuperación.");
      } finally {
        setLoadingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!contrasena || !confirmacion) {
      setError("Debes completar ambos campos.");
      return;
    }

    if (!PASSWORD_REGEX.test(contrasena)) {
      setError(
        "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial."
      );
      return;
    }

    if (contrasena !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, contrasena }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo restablecer la contraseña.");
        return;
      }

      setSuccess(data.message || "Contraseña actualizada correctamente.");
      setContrasena("");
      setConfirmacion("");

      window.setTimeout(() => {
        navigate("/");
      }, 1800);
    } catch (requestError) {
      console.error("Error al restablecer contraseña:", requestError);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page d-flex justify-content-center align-items-center">
      <div className="login-box auth-box shadow bg-white p-5 rounded">
        <div className="auth-panel">
          <div className="auth-brand">
            <img
              src="/pjServices-logo.png"
              alt="PJ Logo"
              className="img-fluid logo-img"
            />
            <h4>Restablecer contraseña</h4>
            <p className="auth-helper">
              Crea una nueva contraseña segura para volver a ingresar al sistema.
            </p>
            {userInfo?.correo && (
              <div className="auth-user-chip">
                {userInfo.nombre_completo || "Usuario"} · {userInfo.correo}
              </div>
            )}
          </div>

          <div className="auth-form-wrap">
            {loadingToken ? (
              <div className="alert alert-info mb-0">Validando enlace...</div>
            ) : tokenError ? (
              <>
                <div className="alert alert-danger">{tokenError}</div>
                <div className="text-center">
                  <Link to="/olvide-contrasena" className="login-link">
                    Solicitar un nuevo enlace
                  </Link>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <div className="form-group mb-3">
                  <label>Nueva contraseña</label>
                  <input
                    type="password"
                    className="form-control"
                    value={contrasena}
                    onChange={(event) => setContrasena(event.target.value)}
                    required
                  />
                </div>

                <div className="form-group mb-2">
                  <label>Confirmar contraseña</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmacion}
                    onChange={(event) => setConfirmacion(event.target.value)}
                    required
                  />
                </div>

                <div className="password-hint mb-4">
                  Usa entre 8 y 50 caracteres, con mayúscula, minúscula, número y carácter especial.
                </div>

                <button type="submit" className="btn btn-teal w-100 mb-3" disabled={submitting}>
                  {submitting ? "Guardando..." : "Guardar nueva contraseña"}
                </button>

                <div className="text-center">
                  <Link to="/" className="text-muted login-link">
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
