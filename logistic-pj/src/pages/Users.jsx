import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import * as bootstrap from "bootstrap";

const usuarioInicial = {
  nombre_completo: "",
  usuario: "",
  contrasena: "",
  correo: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,50}$/;

const obtenerUsuarioLogueado = () => {
  try {
    const usuario = localStorage.getItem("user");
    return usuario ? JSON.parse(usuario) : null;
  } catch {
    return null;
  }
};

const formatoFecha = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString("es-BO");
};

const Users = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUsuario, setNuevoUsuario] = useState(usuarioInicial);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const validar = (usuario, { requiereContrasena = true } = {}) => {
    const e = {};

    if (!usuario.nombre_completo || !usuario.nombre_completo.trim()) {
      e.nombre_completo = "El nombre completo es obligatorio.";
    } else if (usuario.nombre_completo.trim().length > 150) {
      e.nombre_completo = "El nombre completo no puede superar 150 caracteres.";
    }

    if (!usuario.usuario || !usuario.usuario.trim()) {
      e.usuario = "El nombre de usuario es obligatorio.";
    } else if (usuario.usuario.trim().length > 50) {
      e.usuario = "El usuario no puede superar 50 caracteres.";
    }

    if (!usuario.correo || !usuario.correo.trim()) {
      e.correo = "El correo es obligatorio.";
    } else if (usuario.correo.trim().length > 100) {
      e.correo = "El correo no puede superar 100 caracteres.";
    } else if (!EMAIL_REGEX.test(usuario.correo.trim())) {
      e.correo = "El correo no es valido.";
    }

    if (requiereContrasena) {
      if (!usuario.contrasena || !usuario.contrasena.trim()) {
        e.contrasena = "La contrasena es obligatoria.";
      } else if (usuario.contrasena.trim().length > 50) {
        e.contrasena = "La contrasena no puede superar 50 caracteres.";
      } else if (!PASSWORD_REGEX.test(usuario.contrasena)) {
        e.contrasena =
          "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula, numero y caracter especial.";
      }
    } else if (usuario.contrasena && usuario.contrasena.trim()) {
      if (usuario.contrasena.trim().length > 50) {
        e.contrasena = "La contrasena no puede superar 50 caracteres.";
      } else if (!PASSWORD_REGEX.test(usuario.contrasena)) {
        e.contrasena =
          "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula, numero y caracter especial.";
      }
    }

    return e;
  };

  const cargarUsuarios = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/usuarios", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener usuarios");
        return;
      }

      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const abrirNuevo = () => {
    setNuevoUsuario(usuarioInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addUsuarioModal")).show();
  };

  const abrirEditar = (usuario) => {
    if (!usuario) return;
    setUsuarioSeleccionado({
      ...usuario,
      contrasena: "",
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editUsuarioModal")).show();
  };

  const abrirEliminar = (usuario) => {
    if (!usuario) return;
    setUsuarioAEliminar(usuario);
    new bootstrap.Modal(document.getElementById("deleteUsuarioModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevoUsuario, { requiereContrasena: true });
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const usuarioLogueado = obtenerUsuarioLogueado();
      const res = await fetch("http://localhost:3001/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(usuarioLogueado?.id_usuario
            ? { "x-user-id": String(usuarioLogueado.id_usuario) }
            : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          nombre_completo: nuevoUsuario.nombre_completo.trim(),
          usuario: nuevoUsuario.usuario.trim(),
          contrasena: nuevoUsuario.contrasena,
          correo: nuevoUsuario.correo.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(
          data?.detalle
            ? `${data.error}: ${data.detalle}`
            : data?.error || "Error al crear usuario"
        );
        return;
      }

      await cargarUsuarios();
      bootstrap.Modal.getInstance(
        document.getElementById("addUsuarioModal")
      )?.hide();
      setNuevoUsuario(usuarioInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear usuario:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!usuarioSeleccionado) return;

    const e = validar(usuarioSeleccionado, { requiereContrasena: false });
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/usuarios/${usuarioSeleccionado.id_usuario}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            nombre_completo: usuarioSeleccionado.nombre_completo.trim(),
            usuario: usuarioSeleccionado.usuario.trim(),
            contrasena: usuarioSeleccionado.contrasena,
            correo: usuarioSeleccionado.correo.trim().toLowerCase(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar usuario");
        return;
      }

      await cargarUsuarios();
      bootstrap.Modal.getInstance(
        document.getElementById("editUsuarioModal")
      )?.hide();
      setUsuarioSeleccionado(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarUsuario = async () => {
    if (!usuarioAEliminar) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/usuarios/${usuarioAEliminar.id_usuario}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar usuario");
        return;
      }

      await cargarUsuarios();
      bootstrap.Modal.getInstance(
        document.getElementById("deleteUsuarioModal")
      )?.hide();
      setUsuarioAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      alert("Error en el servidor");
    }
  };

  const usuarioSeleccionadoTabla = useMemo(
    () => usuarios.find((u) => u.id_usuario === selectedId) || null,
    [usuarios, selectedId]
  );

  const usuariosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    return usuarios.filter(
      (u) =>
        !q ||
        String(u.nombre_completo || "").toLowerCase().includes(q) ||
        String(u.usuario || "").toLowerCase().includes(q) ||
        String(u.correo || "").toLowerCase().includes(q)
    );
  }, [usuarios, search]);

  const toolbarActions = [
    {
      id: "new",
      label: "Nuevo",
      className: "btn btn-orange",
      onClick: abrirNuevo,
      disabled: false,
    },
    {
      id: "edit",
      label: "Editar",
      className: "btn btn-primary",
      onClick: () => abrirEditar(usuarioSeleccionadoTabla),
      disabled: !usuarioSeleccionadoTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(usuarioSeleccionadoTabla),
      disabled: !usuarioSeleccionadoTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: cargarUsuarios,
      disabled: false,
    },
  ];

  return (
    <div className="d-flex">
      <Sidebar />

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestion de Usuarios</h1>

          {usuarioSeleccionadoTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{usuarioSeleccionadoTabla.nombre_completo}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona un usuario para Editar/Eliminar
            </small>
          )}
        </div>

        <div className="ui-card mb-3">
          <div className="d-flex flex-wrap gap-2">
            {toolbarActions.map((a) => (
              <button
                key={a.id}
                className={a.className}
                onClick={a.onClick}
                disabled={a.disabled}
                type="button"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ui-card mb-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-9">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Buscar por nombre, usuario o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3 d-flex gap-2">
              <button
                className="btn btn-secondary w-100"
                type="button"
                onClick={() => {
                  setSearch("");
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <div className="table-responsive ui-card">
          <table className="table table-hover table-bordered align-middle m-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 48 }} className="text-center">
                  #
                </th>
                <th>Nombre Completo</th>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u, idx) => {
                const isSelected = u.id_usuario === selectedId;

                return (
                  <tr
                    key={u.id_usuario}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(u.id_usuario)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{u.nombre_completo}</td>
                    <td>{u.usuario}</td>
                    <td>{u.correo}</td>
                    <td>{formatoFecha(u.fecha_registro)}</td>
                  </tr>
                );
              })}

              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal fade" id="addUsuarioModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar usuario</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {[
                ["nombre_completo", "Nombre completo", "text"],
                ["usuario", "Usuario", "text"],
                ["correo", "Correo", "email"],
                ["contrasena", "Contrasena", "password"],
              ].map(([campo, label, type]) => (
                <div className="mb-3" key={campo}>
                  <label className="form-label">{label}</label>
                  <input
                    type={type}
                    className={`form-control ${errores[campo] ? "is-invalid" : ""}`}
                    value={nuevoUsuario[campo]}
                    onChange={(e) =>
                      setNuevoUsuario({
                        ...nuevoUsuario,
                        [campo]: e.target.value,
                      })
                    }
                  />
                  {errores[campo] && (
                    <div className="invalid-feedback">{errores[campo]}</div>
                  )}
                </div>
              ))}
              <small className="text-muted d-block">
                La contrasena debe tener minimo 8 caracteres, mayuscula,
                minuscula, numero y caracter especial.
              </small>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-success" onClick={guardarNuevo}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="editUsuarioModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar usuario</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {usuarioSeleccionado && (
                <>
                  {[
                    ["nombre_completo", "Nombre completo", "text"],
                    ["usuario", "Usuario", "text"],
                    ["correo", "Correo", "email"],
                    ["contrasena", "Nueva contrasena", "password"],
                  ].map(([campo, label, type]) => (
                    <div className="mb-3" key={campo}>
                      <label className="form-label">{label}</label>
                      <input
                        type={type}
                        className={`form-control ${errores[campo] ? "is-invalid" : ""}`}
                        value={usuarioSeleccionado[campo] ?? ""}
                        onChange={(e) =>
                          setUsuarioSeleccionado({
                            ...usuarioSeleccionado,
                            [campo]: e.target.value,
                          })
                        }
                      />
                      {errores[campo] && (
                        <div className="invalid-feedback">{errores[campo]}</div>
                      )}
                    </div>
                  ))}
                  <small className="text-muted d-block mb-3">
                    Si cambias la contrasena, debe tener minimo 8 caracteres,
                    mayuscula, minuscula, numero y caracter especial.
                  </small>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={guardarEdicion}>
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="deleteUsuarioModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar usuario</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {usuarioAEliminar && (
                <p>
                  Seguro que deseas desactivar a{" "}
                  <strong>{usuarioAEliminar.nombre_completo}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarUsuario}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;
