// Login.jsx (cambios mínimos)
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }), // 👈 claves estándar
      });

      if (!res.ok) {
        // intenta leer mensaje del backend; si no es JSON, lee texto
        let msg = "Credenciales inválidas";
        try {
          const data = await res.json();
          msg = data?.error || msg;
        } catch {
          const text = await res.text();
          if (text) msg = text;
        }
        setError(msg);
        return;
      }

      // si llega aquí, autenticó
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
            <img src="/pjServices-logo.png" alt="PJ Logo" className="img-fluid logo-img" />
          </div>
          <div className="col-md-6">
            <h4 className="mb-4">Log in</h4>
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-group mb-3">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group mb-4">
                <label>Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-teal w-100 mb-3">Sign In</button>
              <div className="text-center">
                <a href="#" className="text-muted">Forgot password?</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
