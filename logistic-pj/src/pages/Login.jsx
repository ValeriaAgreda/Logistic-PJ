import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

const Login = () => {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!correo || !contrasena) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          correo,
          contrasena,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Credenciales inválidas");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Error en login:", err);
      setError("Error en el servidor");
    }
  };

  return (
    <div className="login-page d-flex justify-content-center align-items-center">
      <div className="login-box shadow bg-white p-5 rounded">
        <div className="row">
          <div className="col-md-6 d-flex justify-content-center align-items-center">
            <img
              src="/pjServices-logo.png"
              alt="PJ Logo"
              className="img-fluid logo-img"
            />
          </div>

          <div className="col-md-6">
            <h4 className="mb-4">Log in</h4>

            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="form-group mb-3">
                <label>Correo</label>
                <input
                  type="email"
                  className="form-control"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-4">
                <label>Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-teal w-100 mb-3">
                Iniciar sesión
              </button>

              <div className="text-center">
                <a href="#" className="text-muted">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;