import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import * as bootstrap from "bootstrap";

const monedaInicial = {
  descripcion: "",
  codigo: "",
};

const Currency = () => {
  const [monedas, setMonedas] = useState([]);
  const [nuevaMoneda, setNuevaMoneda] = useState(monedaInicial);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState(null);
  const [monedaAEliminar, setMonedaAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const validar = (moneda) => {
    const e = {};

    if (!moneda.descripcion || !moneda.descripcion.trim()) {
      e.descripcion = "La descripcion es obligatoria.";
    } else if (moneda.descripcion.trim().length > 50) {
      e.descripcion = "La descripcion no puede superar 50 caracteres.";
    }

    if (!moneda.codigo || !moneda.codigo.trim()) {
      e.codigo = "El codigo es obligatorio.";
    } else if (moneda.codigo.trim().length > 50) {
      e.codigo = "El codigo no puede superar 50 caracteres.";
    }

    return e;
  };

  const cargarMonedas = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/moneda", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener monedas");
        return;
      }

      setMonedas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener monedas:", error);
    }
  };

  useEffect(() => {
    cargarMonedas();
  }, []);

  const abrirNuevo = () => {
    setNuevaMoneda(monedaInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addMonedaModal")).show();
  };

  const abrirEditar = (moneda) => {
    if (!moneda) return;
    setMonedaSeleccionada({ ...moneda });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editMonedaModal")).show();
  };

  const abrirEliminar = (moneda) => {
    if (!moneda) return;
    setMonedaAEliminar(moneda);
    new bootstrap.Modal(document.getElementById("deleteMonedaModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevaMoneda);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/moneda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          descripcion: nuevaMoneda.descripcion.trim(),
          codigo: nuevaMoneda.codigo.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear moneda");
        return;
      }

      await cargarMonedas();
      bootstrap.Modal.getInstance(document.getElementById("addMonedaModal"))?.hide();
      setNuevaMoneda(monedaInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear moneda:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!monedaSeleccionada) return;

    const e = validar(monedaSeleccionada);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/moneda/${monedaSeleccionada.id_moneda}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            descripcion: monedaSeleccionada.descripcion.trim(),
            codigo: monedaSeleccionada.codigo.trim().toUpperCase(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar moneda");
        return;
      }

      await cargarMonedas();
      bootstrap.Modal.getInstance(document.getElementById("editMonedaModal"))?.hide();
      setMonedaSeleccionada(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar moneda:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarMoneda = async () => {
    if (!monedaAEliminar) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/moneda/${monedaAEliminar.id_moneda}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar moneda");
        return;
      }

      await cargarMonedas();
      bootstrap.Modal.getInstance(document.getElementById("deleteMonedaModal"))?.hide();
      setMonedaAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar moneda:", error);
      alert("Error en el servidor");
    }
  };

  const monedaSeleccionadaTabla = useMemo(
    () => monedas.find((moneda) => moneda.id_moneda === selectedId) || null,
    [monedas, selectedId]
  );

  const monedasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();

    return monedas.filter(
      (moneda) =>
        !q ||
        String(moneda.descripcion || "").toLowerCase().includes(q) ||
        String(moneda.codigo || "").toLowerCase().includes(q)
    );
  }, [monedas, search]);

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
      onClick: () => abrirEditar(monedaSeleccionadaTabla),
      disabled: !monedaSeleccionadaTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(monedaSeleccionadaTabla),
      disabled: !monedaSeleccionadaTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: cargarMonedas,
      disabled: false,
    },
  ];

  return (
    <div className="d-flex">
      <Sidebar />

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestion de Monedas</h1>

          {monedaSeleccionadaTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{monedaSeleccionadaTabla.descripcion}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona una moneda para Editar/Eliminar
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
                placeholder="Buscar por descripcion o codigo..."
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
                <th>Codigo</th>
              </tr>
            </thead>
            <tbody>
              {monedasFiltradas.map((moneda, idx) => {
                const isSelected = moneda.id_moneda === selectedId;

                return (
                  <tr
                    key={moneda.id_moneda}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(moneda.id_moneda)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{moneda.descripcion}</td>
                    <td>{moneda.codigo}</td>
                  </tr>
                );
              })}

              {monedasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-muted">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal fade" id="addMonedaModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar moneda</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Descripcion</label>
                <input
                  type="text"
                  className={`form-control ${errores.descripcion ? "is-invalid" : ""}`}
                  value={nuevaMoneda.descripcion}
                  onChange={(e) =>
                    setNuevaMoneda({
                      ...nuevaMoneda,
                      descripcion: e.target.value,
                    })
                  }
                />
                {errores.descripcion && (
                  <div className="invalid-feedback">{errores.descripcion}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Codigo</label>
                <input
                  type="text"
                  className={`form-control ${errores.codigo ? "is-invalid" : ""}`}
                  value={nuevaMoneda.codigo}
                  onChange={(e) =>
                    setNuevaMoneda({
                      ...nuevaMoneda,
                      codigo: e.target.value.toUpperCase(),
                    })
                  }
                />
                {errores.codigo && (
                  <div className="invalid-feedback">{errores.codigo}</div>
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

      <div className="modal fade" id="editMonedaModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar moneda</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {monedaSeleccionada && (
                <>
                  <div className="mb-3">
                    <label className="form-label">Descripcion</label>
                    <input
                      type="text"
                      className={`form-control ${errores.descripcion ? "is-invalid" : ""}`}
                      value={monedaSeleccionada.descripcion || ""}
                      onChange={(e) =>
                        setMonedaSeleccionada({
                          ...monedaSeleccionada,
                          descripcion: e.target.value,
                        })
                      }
                    />
                    {errores.descripcion && (
                      <div className="invalid-feedback">{errores.descripcion}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Codigo</label>
                    <input
                      type="text"
                      className={`form-control ${errores.codigo ? "is-invalid" : ""}`}
                      value={monedaSeleccionada.codigo || ""}
                      onChange={(e) =>
                        setMonedaSeleccionada({
                          ...monedaSeleccionada,
                          codigo: e.target.value.toUpperCase(),
                        })
                      }
                    />
                    {errores.codigo && (
                      <div className="invalid-feedback">{errores.codigo}</div>
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

      <div className="modal fade" id="deleteMonedaModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar moneda</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {monedaAEliminar && (
                <p>
                  Seguro que deseas desactivar <strong>{monedaAEliminar.descripcion}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarMoneda}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Currency;
