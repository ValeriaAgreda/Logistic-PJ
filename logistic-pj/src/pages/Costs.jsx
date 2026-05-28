import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";
import "../styles/costs.css";

const costoInicial = {
  id_operacion: "",
  id_tipo_costo: "",
  id_moneda: "",
  monto: "",
  observacion: "",
};

const obtenerHeadersAuth = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id_usuario ? { "x-user-id": String(user.id_usuario) } : {};
  } catch {
    return {};
  }
};

const Costs = () => {
  const [costos, setCostos] = useState([]);
  const [operaciones, setOperaciones] = useState([]);
  const [tiposCosto, setTiposCosto] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [nuevoCosto, setNuevoCosto] = useState(costoInicial);
  const [costoSeleccionado, setCostoSeleccionado] = useState(null);
  const [costoAEliminar, setCostoAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const request = async (url, options = {}) => {
    const res = await fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...obtenerHeadersAuth(),
        ...(options.headers || {}),
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || data?.detalle || "Error en la solicitud");
    }

    return data;
  };

  const validar = (costo) => {
    const e = {};

    if (!costo.id_operacion) {
      e.id_operacion = "Selecciona una operacion.";
    }

    if (!costo.id_tipo_costo) {
      e.id_tipo_costo = "Selecciona un tipo de costo.";
    }

    if (!costo.id_moneda) {
      e.id_moneda = "Selecciona una moneda.";
    }

    if (
      costo.monto === "" ||
      Number.isNaN(Number(costo.monto)) ||
      Number(costo.monto) < 0
    ) {
      e.monto = "Ingresa un monto valido.";
    }

    return e;
  };

  const cargarDatos = useCallback(async () => {
    try {
      const [costosData, operacionesData, tiposCostoData, monedasData] =
        await Promise.all([
          request("http://localhost:3001/api/costo-operacion"),
          request("http://localhost:3001/api/operaciones"),
          request("http://localhost:3001/api/tipo-costo"),
          request("http://localhost:3001/api/moneda"),
        ]);

      setCostos(Array.isArray(costosData) ? costosData : []);
      setOperaciones(Array.isArray(operacionesData) ? operacionesData : []);
      setTiposCosto(Array.isArray(tiposCostoData) ? tiposCostoData : []);
      setMonedas(Array.isArray(monedasData) ? monedasData : []);
    } catch (error) {
      console.error("Error al cargar costos:", error);
      alert(error.message || "Error al cargar costos");
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirNuevo = () => {
    setNuevoCosto(costoInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addCostoModal")).show();
  };

  const abrirEditar = (costo) => {
    if (!costo) return;
    setCostoSeleccionado({
      ...costoInicial,
      ...costo,
      id_operacion: String(costo.id_operacion ?? ""),
      id_tipo_costo: String(costo.id_tipo_costo ?? ""),
      id_moneda: String(costo.id_moneda ?? ""),
      monto: costo.monto ?? "",
      observacion: costo.observacion || "",
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editCostoModal")).show();
  };

  const abrirEliminar = (costo) => {
    if (!costo) return;
    setCostoAEliminar(costo);
    new bootstrap.Modal(document.getElementById("deleteCostoModal")).show();
  };

  const normalizarPayload = (costo) => ({
    id_operacion: Number(costo.id_operacion),
    id_tipo_costo: Number(costo.id_tipo_costo),
    id_moneda: Number(costo.id_moneda),
    monto: Number(costo.monto),
    observacion: costo.observacion?.trim() || "",
  });

  const guardarNuevo = async () => {
    const e = validar(nuevoCosto);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      await request("http://localhost:3001/api/costo-operacion", {
        method: "POST",
        body: JSON.stringify(normalizarPayload(nuevoCosto)),
      });

      await cargarDatos();
      bootstrap.Modal.getInstance(document.getElementById("addCostoModal"))?.hide();
      setNuevoCosto(costoInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear costo:", error);
      alert(error.message || "Error al crear costo");
    }
  };

  const guardarEdicion = async () => {
    if (!costoSeleccionado) return;

    const e = validar(costoSeleccionado);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      await request(
        `http://localhost:3001/api/costo-operacion/${costoSeleccionado.id_costo}`,
        {
          method: "PUT",
          body: JSON.stringify(normalizarPayload(costoSeleccionado)),
        }
      );

      await cargarDatos();
      bootstrap.Modal.getInstance(document.getElementById("editCostoModal"))?.hide();
      setCostoSeleccionado(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar costo:", error);
      alert(error.message || "Error al actualizar costo");
    }
  };

  const eliminarCosto = async () => {
    if (!costoAEliminar) return;

    try {
      await request(
        `http://localhost:3001/api/costo-operacion/${costoAEliminar.id_costo}`,
        {
          method: "DELETE",
        }
      );

      await cargarDatos();
      bootstrap.Modal.getInstance(document.getElementById("deleteCostoModal"))?.hide();
      setCostoAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar costo:", error);
      alert(error.message || "Error al eliminar costo");
    }
  };

  const costoSeleccionadoTabla = useMemo(
    () => costos.find((costo) => costo.id_costo === selectedId) || null,
    [costos, selectedId]
  );

  const costosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    return costos.filter((costo) => {
      return (
        !q ||
        String(costo.codigo_operacion || "").toLowerCase().includes(q) ||
        String(costo.tipo_costo || "").toLowerCase().includes(q) ||
        String(costo.grupo_tipo_costo || "").toLowerCase().includes(q) ||
        String(costo.moneda || "").toLowerCase().includes(q) ||
        String(costo.codigo_moneda || "").toLowerCase().includes(q) ||
        String(costo.observacion || "").toLowerCase().includes(q)
      );
    });
  }, [costos, search]);

  const totalMonto = useMemo(
    () =>
      costosFiltrados.reduce(
        (sum, costo) => sum + Number(costo.monto || 0),
        0
      ),
    [costosFiltrados]
  );

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
      onClick: () => abrirEditar(costoSeleccionadoTabla),
      disabled: !costoSeleccionadoTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(costoSeleccionadoTabla),
      disabled: !costoSeleccionadoTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: cargarDatos,
      disabled: false,
    },
  ];

  const renderSelect = (label, field, state, setState, opciones, valueKey, labelKey) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <select
        className={`form-select ${errores[field] ? "is-invalid" : ""}`}
        value={state[field] || ""}
        onChange={(e) =>
          setState({
            ...state,
            [field]: e.target.value,
          })
        }
      >
        <option value="">Seleccionar</option>
        {opciones.map((opcion) => (
          <option key={opcion[valueKey]} value={opcion[valueKey]}>
            {opcion[labelKey]}
          </option>
        ))}
      </select>
      {errores[field] && <div className="invalid-feedback">{errores[field]}</div>}
    </div>
  );

  return (
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Costos de Operación</h1>

          {costoSeleccionadoTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{costoSeleccionadoTabla.codigo_operacion}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona un costo para Editar/Eliminar
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
            <div className="col-12 col-md-8">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Operacion, tipo de costo, grupo, moneda u observacion..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-4 d-flex gap-2">
              <button
                className="btn btn-secondary w-100"
                type="button"
                onClick={() => setSearch("")}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-12 col-lg-9">
            <div className="table-responsive ui-card">
              <table className="table table-hover table-bordered align-middle m-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 48 }} className="text-center">#</th>
                    <th>Operacion</th>
                    <th>Tipo de costo</th>
                    <th>Grupo</th>
                    <th>Moneda</th>
                    <th>Monto</th>
                    <th>Observacion</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {costosFiltrados.map((costo, idx) => {
                    const isSelected = costo.id_costo === selectedId;

                    return (
                      <tr
                        key={costo.id_costo}
                        className={isSelected ? "row-selected" : ""}
                        onClick={() => setSelectedId(costo.id_costo)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="text-center">{idx + 1}</td>
                        <td>{costo.codigo_operacion}</td>
                        <td>{costo.tipo_costo}</td>
                        <td>{costo.grupo_tipo_costo}</td>
                        <td>
                          {costo.moneda} ({costo.codigo_moneda})
                        </td>
                        <td>{Number(costo.monto || 0).toFixed(2)}</td>
                        <td>{costo.observacion || "-"}</td>
                        <td>
                          {costo.fecha_registro
                            ? new Date(costo.fecha_registro).toLocaleString("es-BO")
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}

                  {costosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-muted">
                        No hay costos activos con los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="col-12 col-lg-3">
            <div className="ui-card h-100">
              <h5 className="mb-3">Resumen</h5>
              <div className="summary-row">
                <span>Registros filtrados</span>
                <strong>{costosFiltrados.length}</strong>
              </div>
              <div className="summary-row">
                <span>Total montos</span>
                <strong>{totalMonto.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="addCostoModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar costo</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {renderSelect(
                "Operacion",
                "id_operacion",
                nuevoCosto,
                setNuevoCosto,
                operaciones,
                "id_operacion",
                "codigo_operacion"
              )}

              {renderSelect(
                "Tipo de costo",
                "id_tipo_costo",
                nuevoCosto,
                setNuevoCosto,
                tiposCosto,
                "id_tipo_costo",
                "descripcion"
              )}

              {renderSelect(
                "Moneda",
                "id_moneda",
                nuevoCosto,
                setNuevoCosto,
                monedas,
                "id_moneda",
                "descripcion"
              )}

              <div className="mb-3">
                <label className="form-label">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  className={`form-control ${errores.monto ? "is-invalid" : ""}`}
                  value={nuevoCosto.monto}
                  onChange={(e) =>
                    setNuevoCosto({
                      ...nuevoCosto,
                      monto: e.target.value,
                    })
                  }
                />
                {errores.monto && (
                  <div className="invalid-feedback">{errores.monto}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Observacion</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={nuevoCosto.observacion}
                  onChange={(e) =>
                    setNuevoCosto({
                      ...nuevoCosto,
                      observacion: e.target.value,
                    })
                  }
                />
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

      <div className="modal fade" id="editCostoModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar costo</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {costoSeleccionado && (
                <>
                  {renderSelect(
                    "Operacion",
                    "id_operacion",
                    costoSeleccionado,
                    setCostoSeleccionado,
                    operaciones,
                    "id_operacion",
                    "codigo_operacion"
                  )}

                  {renderSelect(
                    "Tipo de costo",
                    "id_tipo_costo",
                    costoSeleccionado,
                    setCostoSeleccionado,
                    tiposCosto,
                    "id_tipo_costo",
                    "descripcion"
                  )}

                  {renderSelect(
                    "Moneda",
                    "id_moneda",
                    costoSeleccionado,
                    setCostoSeleccionado,
                    monedas,
                    "id_moneda",
                    "descripcion"
                  )}

                  <div className="mb-3">
                    <label className="form-label">Monto</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`form-control ${errores.monto ? "is-invalid" : ""}`}
                      value={costoSeleccionado.monto || ""}
                      onChange={(e) =>
                        setCostoSeleccionado({
                          ...costoSeleccionado,
                          monto: e.target.value,
                        })
                      }
                    />
                    {errores.monto && (
                      <div className="invalid-feedback">{errores.monto}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Observacion</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={costoSeleccionado.observacion || ""}
                      onChange={(e) =>
                        setCostoSeleccionado({
                          ...costoSeleccionado,
                          observacion: e.target.value,
                        })
                      }
                    />
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

      <div className="modal fade" id="deleteCostoModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar costo</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {costoAEliminar && (
                <p>
                  Seguro que deseas desactivar el costo de la operacion{" "}
                  <strong>{costoAEliminar.codigo_operacion}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarCosto}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Costs;

