import React, { useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";

const rolInicial = {
  descripcion: "",
};

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [nuevoRol, setNuevoRol] = useState(rolInicial);
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  const [rolAEliminar, setRolAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const validar = (rol) => {
    const e = {};

    if (!rol.descripcion || !rol.descripcion.trim()) {
      e.descripcion = "La descripcion es obligatoria.";
    } else if (rol.descripcion.trim().length > 50) {
      e.descripcion = "La descripcion no puede superar 50 caracteres.";
    }

    return e;
  };

  const cargarRoles = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/rol", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener roles");
        return;
      }

      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener roles:", error);
    }
  };

  useEffect(() => {
    cargarRoles();
  }, []);

  const abrirNuevo = () => {
    setNuevoRol(rolInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addRolModal")).show();
  };

  const abrirEditar = (rol) => {
    if (!rol) return;
    setRolSeleccionado({ ...rol });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editRolModal")).show();
  };

  const abrirEliminar = (rol) => {
    if (!rol) return;
    setRolAEliminar(rol);
    new bootstrap.Modal(document.getElementById("deleteRolModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevoRol);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/rol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          descripcion: nuevoRol.descripcion.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear rol");
        return;
      }

      await cargarRoles();
      bootstrap.Modal.getInstance(document.getElementById("addRolModal"))?.hide();
      setNuevoRol(rolInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear rol:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!rolSeleccionado) return;

    const e = validar(rolSeleccionado);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/rol/${rolSeleccionado.id_rol}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            descripcion: rolSeleccionado.descripcion.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar rol");
        return;
      }

      await cargarRoles();
      bootstrap.Modal.getInstance(document.getElementById("editRolModal"))?.hide();
      setRolSeleccionado(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar rol:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarRol = async () => {
    if (!rolAEliminar) return;

    try {
      const res = await fetch(`http://localhost:3001/api/rol/${rolAEliminar.id_rol}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar rol");
        return;
      }

      await cargarRoles();
      bootstrap.Modal.getInstance(document.getElementById("deleteRolModal"))?.hide();
      setRolAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar rol:", error);
      alert("Error en el servidor");
    }
  };

  const rolSeleccionadoTabla = useMemo(
    () => roles.find((rol) => rol.id_rol === selectedId) || null,
    [roles, selectedId]
  );

  const rolesFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    return roles.filter(
      (rol) => !q || String(rol.descripcion || "").toLowerCase().includes(q)
    );
  }, [roles, search]);

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
      onClick: () => abrirEditar(rolSeleccionadoTabla),
      disabled: !rolSeleccionadoTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(rolSeleccionadoTabla),
      disabled: !rolSeleccionadoTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: cargarRoles,
      disabled: false,
    },
  ];

  return (
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestion de Roles</h1>

          {rolSeleccionadoTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{rolSeleccionadoTabla.descripcion}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona un rol para Editar/Eliminar
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
                placeholder="Buscar por descripcion..."
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
                <th>Descripcion</th>
              </tr>
            </thead>
            <tbody>
              {rolesFiltrados.map((rol, idx) => {
                const isSelected = rol.id_rol === selectedId;

                return (
                  <tr
                    key={rol.id_rol}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(rol.id_rol)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{rol.descripcion}</td>
                  </tr>
                );
              })}

              {rolesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center py-4 text-muted">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal fade" id="addRolModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar rol</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Descripcion</label>
                <input
                  type="text"
                  className={`form-control ${errores.descripcion ? "is-invalid" : ""}`}
                  value={nuevoRol.descripcion}
                  onChange={(e) =>
                    setNuevoRol({
                      ...nuevoRol,
                      descripcion: e.target.value,
                    })
                  }
                />
                {errores.descripcion && (
                  <div className="invalid-feedback">{errores.descripcion}</div>
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

      <div className="modal fade" id="editRolModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar rol</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {rolSeleccionado && (
                <div className="mb-3">
                  <label className="form-label">Descripcion</label>
                  <input
                    type="text"
                    className={`form-control ${errores.descripcion ? "is-invalid" : ""}`}
                    value={rolSeleccionado.descripcion || ""}
                    onChange={(e) =>
                      setRolSeleccionado({
                        ...rolSeleccionado,
                        descripcion: e.target.value,
                      })
                    }
                  />
                  {errores.descripcion && (
                    <div className="invalid-feedback">{errores.descripcion}</div>
                  )}
                </div>
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

      <div className="modal fade" id="deleteRolModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar rol</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {rolAEliminar && (
                <p>
                  Seguro que deseas desactivar <strong>{rolAEliminar.descripcion}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarRol}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Roles;

