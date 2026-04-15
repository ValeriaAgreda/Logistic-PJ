import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import * as bootstrap from "bootstrap";

const estadoInicial = {
  descripcion: "",
};

const OperationStatus = () => {
  const [estadosOperacion, setEstadosOperacion] = useState([]);
  const [nuevoEstado, setNuevoEstado] = useState(estadoInicial);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(null);
  const [estadoAEliminar, setEstadoAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const validar = (estado) => {
    const e = {};

    if (!estado.descripcion || !estado.descripcion.trim()) {
      e.descripcion = "La descripcion es obligatoria.";
    } else if (estado.descripcion.trim().length > 50) {
      e.descripcion = "La descripcion no puede superar 50 caracteres.";
    }

    return e;
  };

  const cargarEstadosOperacion = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/estado-operacion", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener estados de operacion");
        return;
      }

      setEstadosOperacion(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener estados de operacion:", error);
    }
  };

  useEffect(() => {
    cargarEstadosOperacion();
  }, []);

  const abrirNuevo = () => {
    setNuevoEstado(estadoInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addEstadoOperacionModal")).show();
  };

  const abrirEditar = (estado) => {
    if (!estado) return;
    setEstadoSeleccionado({ ...estado });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editEstadoOperacionModal")).show();
  };

  const abrirEliminar = (estado) => {
    if (!estado) return;
    setEstadoAEliminar(estado);
    new bootstrap.Modal(document.getElementById("deleteEstadoOperacionModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevoEstado);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/estado-operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          descripcion: nuevoEstado.descripcion.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear estado de operacion");
        return;
      }

      await cargarEstadosOperacion();
      bootstrap.Modal.getInstance(
        document.getElementById("addEstadoOperacionModal")
      )?.hide();
      setNuevoEstado(estadoInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear estado de operacion:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!estadoSeleccionado) return;

    const e = validar(estadoSeleccionado);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/estado-operacion/${estadoSeleccionado.id_estado_operacion}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            descripcion: estadoSeleccionado.descripcion.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar estado de operacion");
        return;
      }

      await cargarEstadosOperacion();
      bootstrap.Modal.getInstance(
        document.getElementById("editEstadoOperacionModal")
      )?.hide();
      setEstadoSeleccionado(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar estado de operacion:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarEstadoOperacion = async () => {
    if (!estadoAEliminar) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/estado-operacion/${estadoAEliminar.id_estado_operacion}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar estado de operacion");
        return;
      }

      await cargarEstadosOperacion();
      bootstrap.Modal.getInstance(
        document.getElementById("deleteEstadoOperacionModal")
      )?.hide();
      setEstadoAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar estado de operacion:", error);
      alert("Error en el servidor");
    }
  };

  const estadoSeleccionadoTabla = useMemo(
    () =>
      estadosOperacion.find((estado) => estado.id_estado_operacion === selectedId) ||
      null,
    [estadosOperacion, selectedId]
  );

  const estadosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    return estadosOperacion.filter(
      (estado) =>
        !q || String(estado.descripcion || "").toLowerCase().includes(q)
    );
  }, [estadosOperacion, search]);

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
      onClick: () => abrirEditar(estadoSeleccionadoTabla),
      disabled: !estadoSeleccionadoTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(estadoSeleccionadoTabla),
      disabled: !estadoSeleccionadoTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: cargarEstadosOperacion,
      disabled: false,
    },
  ];

  return (
    <div className="d-flex">
      <Sidebar />

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestion de Estados de Operacion</h1>

          {estadoSeleccionadoTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{estadoSeleccionadoTabla.descripcion}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona un estado de operacion para Editar/Eliminar
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
              {estadosFiltrados.map((estado, idx) => {
                const isSelected = estado.id_estado_operacion === selectedId;

                return (
                  <tr
                    key={estado.id_estado_operacion}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(estado.id_estado_operacion)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{estado.descripcion}</td>
                  </tr>
                );
              })}

              {estadosFiltrados.length === 0 && (
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

      <div
        className="modal fade"
        id="addEstadoOperacionModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar estado de operacion</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Descripcion</label>
                <input
                  type="text"
                  className={`form-control ${
                    errores.descripcion ? "is-invalid" : ""
                  }`}
                  value={nuevoEstado.descripcion}
                  onChange={(e) =>
                    setNuevoEstado({
                      ...nuevoEstado,
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

      <div
        className="modal fade"
        id="editEstadoOperacionModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar estado de operacion</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {estadoSeleccionado && (
                <div className="mb-3">
                  <label className="form-label">Descripcion</label>
                  <input
                    type="text"
                    className={`form-control ${
                      errores.descripcion ? "is-invalid" : ""
                    }`}
                    value={estadoSeleccionado.descripcion || ""}
                    onChange={(e) =>
                      setEstadoSeleccionado({
                        ...estadoSeleccionado,
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

      <div
        className="modal fade"
        id="deleteEstadoOperacionModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar estado de operacion</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {estadoAEliminar && (
                <p>
                  Seguro que deseas desactivar{" "}
                  <strong>{estadoAEliminar.descripcion}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarEstadoOperacion}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationStatus;
