import React, { useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";

const asignacionInicial = {
  id_usuario: "",
  id_rol: "",
};

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

const UserRoleAssignments = () => {
  const [asignaciones, setAsignaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [nuevaAsignacion, setNuevaAsignacion] = useState(asignacionInicial);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState(null);
  const [asignacionAEliminar, setAsignacionAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const validar = (asignacion) => {
    const e = {};

    if (!asignacion.id_usuario) {
      e.id_usuario = "El usuario es obligatorio.";
    }

    if (!asignacion.id_rol) {
      e.id_rol = "El rol es obligatorio.";
    }

    return e;
  };

  const cargarAsignaciones = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/rol-usuario", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener asignaciones");
        return;
      }

      setAsignaciones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener asignaciones:", error);
    }
  };

  const cargarCatalogos = async () => {
    try {
      const [resUsuarios, resRoles] = await Promise.all([
        fetch("http://localhost:3001/api/usuarios", {
          credentials: "include",
        }),
        fetch("http://localhost:3001/api/rol", {
          credentials: "include",
        }),
      ]);

      const [dataUsuarios, dataRoles] = await Promise.all([
        resUsuarios.json(),
        resRoles.json(),
      ]);

      if (!resUsuarios.ok) {
        console.error(dataUsuarios?.error || "Error al obtener usuarios");
      } else {
        setUsuarios(Array.isArray(dataUsuarios) ? dataUsuarios : []);
      }

      if (!resRoles.ok) {
        console.error(dataRoles?.error || "Error al obtener roles");
      } else {
        setRoles(Array.isArray(dataRoles) ? dataRoles : []);
      }
    } catch (error) {
      console.error("Error al cargar catalogos de asignacion:", error);
    }
  };

  useEffect(() => {
    cargarAsignaciones();
    cargarCatalogos();
  }, []);

  const abrirNuevo = () => {
    setNuevaAsignacion(asignacionInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addRolUsuarioModal")).show();
  };

  const abrirEditar = (asignacion) => {
    if (!asignacion) return;
    setAsignacionSeleccionada({
      ...asignacion,
      id_usuario: String(asignacion.id_usuario),
      id_rol: String(asignacion.id_rol),
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editRolUsuarioModal")).show();
  };

  const abrirEliminar = (asignacion) => {
    if (!asignacion) return;
    setAsignacionAEliminar(asignacion);
    new bootstrap.Modal(document.getElementById("deleteRolUsuarioModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevaAsignacion);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const usuarioLogueado = obtenerUsuarioLogueado();
      const res = await fetch("http://localhost:3001/api/rol-usuario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(usuarioLogueado?.id_usuario
            ? { "x-user-id": String(usuarioLogueado.id_usuario) }
            : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          id_usuario: Number(nuevaAsignacion.id_usuario),
          id_rol: Number(nuevaAsignacion.id_rol),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear asignacion");
        return;
      }

      await cargarAsignaciones();
      bootstrap.Modal.getInstance(
        document.getElementById("addRolUsuarioModal")
      )?.hide();
      setNuevaAsignacion(asignacionInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear asignacion:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!asignacionSeleccionada) return;

    const e = validar(asignacionSeleccionada);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/rol-usuario/${asignacionSeleccionada.id_rol_usuario}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id_usuario: Number(asignacionSeleccionada.id_usuario),
            id_rol: Number(asignacionSeleccionada.id_rol),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar asignacion");
        return;
      }

      await cargarAsignaciones();
      bootstrap.Modal.getInstance(
        document.getElementById("editRolUsuarioModal")
      )?.hide();
      setAsignacionSeleccionada(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar asignacion:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarAsignacion = async () => {
    if (!asignacionAEliminar) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/rol-usuario/${asignacionAEliminar.id_rol_usuario}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar asignacion");
        return;
      }

      await cargarAsignaciones();
      bootstrap.Modal.getInstance(
        document.getElementById("deleteRolUsuarioModal")
      )?.hide();
      setAsignacionAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar asignacion:", error);
      alert("Error en el servidor");
    }
  };

  const asignacionSeleccionadaTabla = useMemo(
    () =>
      asignaciones.find((a) => a.id_rol_usuario === selectedId) || null,
    [asignaciones, selectedId]
  );

  const asignacionesFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();

    return asignaciones.filter(
      (a) =>
        !q ||
        String(a.nombre_completo || "").toLowerCase().includes(q) ||
        String(a.usuario || "").toLowerCase().includes(q) ||
        String(a.rol_descripcion || "").toLowerCase().includes(q) ||
        String(a.asignado_por || "").toLowerCase().includes(q)
    );
  }, [asignaciones, search]);

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
      onClick: () => abrirEditar(asignacionSeleccionadaTabla),
      disabled: !asignacionSeleccionadaTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(asignacionSeleccionadaTabla),
      disabled: !asignacionSeleccionadaTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: async () => {
        await Promise.all([cargarAsignaciones(), cargarCatalogos()]);
      },
      disabled: false,
    },
  ];

  return (
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Asignacion de Roles</h1>

          {asignacionSeleccionadaTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{asignacionSeleccionadaTabla.nombre_completo}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona una asignacion para Editar/Eliminar
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
                placeholder="Buscar por usuario, nombre, rol o asignado por..."
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
                <th>Rol</th>
                <th>Fecha Asignacion</th>
                <th>Asignado Por</th>
              </tr>
            </thead>
            <tbody>
              {asignacionesFiltradas.map((a, idx) => {
                const isSelected = a.id_rol_usuario === selectedId;

                return (
                  <tr
                    key={a.id_rol_usuario}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(a.id_rol_usuario)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{a.nombre_completo}</td>
                    <td>{a.usuario}</td>
                    <td>{a.rol_descripcion}</td>
                    <td>{formatoFecha(a.fecha_asignacion)}</td>
                    <td>{a.asignado_por || "-"}</td>
                  </tr>
                );
              })}

              {asignacionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal fade" id="addRolUsuarioModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Asignar rol</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Usuario</label>
                <select
                  className={`form-select ${errores.id_usuario ? "is-invalid" : ""}`}
                  value={nuevaAsignacion.id_usuario}
                  onChange={(e) =>
                    setNuevaAsignacion({
                      ...nuevaAsignacion,
                      id_usuario: e.target.value,
                    })
                  }
                >
                  <option value="">Selecciona un usuario</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id_usuario} value={usuario.id_usuario}>
                      {usuario.nombre_completo} ({usuario.usuario})
                    </option>
                  ))}
                </select>
                {errores.id_usuario && (
                  <div className="invalid-feedback">{errores.id_usuario}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Rol</label>
                <select
                  className={`form-select ${errores.id_rol ? "is-invalid" : ""}`}
                  value={nuevaAsignacion.id_rol}
                  onChange={(e) =>
                    setNuevaAsignacion({
                      ...nuevaAsignacion,
                      id_rol: e.target.value,
                    })
                  }
                >
                  <option value="">Selecciona un rol</option>
                  {roles.map((rol) => (
                    <option key={rol.id_rol} value={rol.id_rol}>
                      {rol.descripcion}
                    </option>
                  ))}
                </select>
                {errores.id_rol && (
                  <div className="invalid-feedback">{errores.id_rol}</div>
                )}
              </div>
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

      <div className="modal fade" id="editRolUsuarioModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar asignacion de rol</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {asignacionSeleccionada && (
                <>
                  <div className="mb-3">
                    <label className="form-label">Usuario</label>
                    <select
                      className={`form-select ${errores.id_usuario ? "is-invalid" : ""}`}
                      value={asignacionSeleccionada.id_usuario}
                      onChange={(e) =>
                        setAsignacionSeleccionada({
                          ...asignacionSeleccionada,
                          id_usuario: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecciona un usuario</option>
                      {usuarios.map((usuario) => (
                        <option key={usuario.id_usuario} value={usuario.id_usuario}>
                          {usuario.nombre_completo} ({usuario.usuario})
                        </option>
                      ))}
                    </select>
                    {errores.id_usuario && (
                      <div className="invalid-feedback">{errores.id_usuario}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Rol</label>
                    <select
                      className={`form-select ${errores.id_rol ? "is-invalid" : ""}`}
                      value={asignacionSeleccionada.id_rol}
                      onChange={(e) =>
                        setAsignacionSeleccionada({
                          ...asignacionSeleccionada,
                          id_rol: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecciona un rol</option>
                      {roles.map((rol) => (
                        <option key={rol.id_rol} value={rol.id_rol}>
                          {rol.descripcion}
                        </option>
                      ))}
                    </select>
                    {errores.id_rol && (
                      <div className="invalid-feedback">{errores.id_rol}</div>
                    )}
                  </div>
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

      <div className="modal fade" id="deleteRolUsuarioModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar asignacion</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {asignacionAEliminar && (
                <p>
                  Seguro que deseas desactivar la asignacion de{" "}
                  <strong>{asignacionAEliminar.rol_descripcion}</strong> para{" "}
                  <strong>{asignacionAEliminar.nombre_completo}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarAsignacion}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserRoleAssignments;

