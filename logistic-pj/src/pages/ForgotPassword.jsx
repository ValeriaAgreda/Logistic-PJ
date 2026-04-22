import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/login.css";
import { API_BASE_URL } from "../config/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setDevLink("");

    const correoNormalizado = correo.trim().toLowerCase();

    if (!correoNormalizado) {
      setError("El correo es obligatorio.");
      return;
    }

    if (!EMAIL_REGEX.test(correoNormalizado)) {
      setError("Ingresa un correo válido.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correoNormalizado }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo iniciar la recuperación.");
        return;
      }

      setMessage(
        data.message || "Si el correo existe, te enviaremos instrucciones para recuperar tu contraseña."
      );

      if (data.dev_reset_link) {
        setDevLink(data.dev_reset_link);
      }
    } catch (requestError) {
      console.error("Error al solicitar recuperación:", requestError);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
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
            <h4>Recuperar contraseña</h4>
            <p className="auth-helper">
              Escribe el correo registrado en la base de datos y te enviaremos un enlace para restablecer tu acceso.
            </p>
          </div>

          <div className="auth-form-wrap">
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-danger">{error}</div>}
              {message && <div className="alert alert-success">{message}</div>}

              <div className="form-group mb-4">
                <label>Correo registrado</label>
                <input
                  type="email"
                  className="form-control"
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                  placeholder="usuario@correo.com"
                  required
                />
              </div>

              <button type="submit" className="btn btn-teal w-100 mb-3" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>

              {devLink && (
                <div className="alert alert-warning">
                  SMTP no está configurado todavía. En desarrollo puedes continuar desde este enlace:
                  <div className="mt-2">
                    <a href={devLink} className="login-link">
                      {devLink}
                    </a>
                  </div>
                </div>
              )}

              <div className="text-center">
                <Link to="/" className="text-muted login-link">
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
