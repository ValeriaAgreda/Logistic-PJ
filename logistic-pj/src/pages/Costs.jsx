import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as bootstrap from "bootstrap";
import { useSearchParams } from "react-router-dom";
import "../styles/costs.css";

const costoInicial = {
  id_operacion: "",
  id_tipo_costo: "",
  id_moneda: "",
  monto: "",
  observacion: "",
};
const ventaInicial = {
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

const normalizarMoneda = (valor = "") =>
  String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const esBoliviano = (item) => {
  const codigo = normalizarMoneda(item.codigo_moneda);
  const descripcion = normalizarMoneda(item.moneda);
  return ["BOB", "BS", "BOL"].includes(codigo) || descripcion.includes("BOLIVIANO");
};

const esDolar = (item) => {
  const codigo = normalizarMoneda(item.codigo_moneda);
  const descripcion = normalizarMoneda(item.moneda);
  return ["USD", "$US", "SUS", "DOL"].includes(codigo) || descripcion.includes("DOLAR");
};

const Costs = () => {
  const [searchParams] = useSearchParams();
  const autoOpenKeyRef = useRef("");
  const [costos, setCostos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [operaciones, setOperaciones] = useState([]);
  const [tiposCosto, setTiposCosto] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [nuevoCosto, setNuevoCosto] = useState(costoInicial);
  const [costoSeleccionado, setCostoSeleccionado] = useState(null);
  const [costoAEliminar, setCostoAEliminar] = useState(null);
  const [ventaDesdeCosto, setVentaDesdeCosto] = useState(ventaInicial);
  const [errores, setErrores] = useState({});
  const [erroresVenta, setErroresVenta] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [busquedaCodigoOperacion, setBusquedaCodigoOperacion] = useState("");
  const [codigoOperacionAplicado, setCodigoOperacionAplicado] = useState("");
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

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

  const validarMovimiento = (movimiento) => {
    const e = {};

    if (!movimiento.id_operacion) {
      e.id_operacion = "Selecciona una operacion.";
    }

    if (!movimiento.id_tipo_costo) {
      e.id_tipo_costo = "Selecciona un tipo de costo.";
    }

    if (!movimiento.id_moneda) {
      e.id_moneda = "Selecciona una moneda.";
    }

    if (
      movimiento.monto === "" ||
      Number.isNaN(Number(movimiento.monto)) ||
      Number(movimiento.monto) < 0
    ) {
      e.monto = "Ingresa un monto valido.";
    }

    return e;
  };

  const buscarCostoMismaOperacionTipo = (movimiento, idCostoExcluir = null) =>
    costos.find(
      (costo) =>
        String(costo.id_operacion) === String(movimiento.id_operacion) &&
        String(costo.id_tipo_costo) === String(movimiento.id_tipo_costo) &&
        (!idCostoExcluir || String(costo.id_costo) !== String(idCostoExcluir))
    );

  const buscarVentaMismaOperacionTipo = (movimiento, idVentaExcluir = null) =>
    ventas.find(
      (venta) =>
        String(venta.id_operacion) === String(movimiento.id_operacion) &&
        String(venta.id_tipo_costo) === String(movimiento.id_tipo_costo) &&
        (!idVentaExcluir || String(venta.id_venta) !== String(idVentaExcluir))
    );

  const validarCosto = (costo, idCostoExcluir = null) => {
    const e = validarMovimiento(costo);

    if (!e.id_operacion && !e.id_tipo_costo) {
      const costoExistente = buscarCostoMismaOperacionTipo(costo, idCostoExcluir);

      if (costoExistente) {
        e.id_tipo_costo =
          "Ya existe un costo con ese tipo de costo para esta operacion.";
      }
    }

    const ventaExistente = buscarVentaMismaOperacionTipo(costo);

    if (
      ventaExistente &&
      !e.monto &&
      String(ventaExistente.id_moneda) === String(costo.id_moneda) &&
      Number(costo.monto) > Number(ventaExistente.monto)
    ) {
      e.monto =
        "El monto del costo debe ser menor o igual al monto de la venta cuando usan la misma moneda.";
    }

    return e;
  };

  const validarVenta = (venta, idVentaExcluir = null) => {
    const e = validarMovimiento(venta);

    if (!e.id_operacion && !e.id_tipo_costo) {
      const ventaExistente = buscarVentaMismaOperacionTipo(venta, idVentaExcluir);

      if (ventaExistente) {
        e.id_tipo_costo =
          "Ya existe una venta con ese tipo de costo para esta operacion.";
      }
    }

    const costoExistente = buscarCostoMismaOperacionTipo(venta);

    if (
      costoExistente &&
      !e.monto &&
      String(costoExistente.id_moneda) === String(venta.id_moneda) &&
      Number(venta.monto) < Number(costoExistente.monto)
    ) {
      e.monto =
        "El monto de la venta debe ser mayor o igual al monto del costo cuando usan la misma moneda.";
    }

    return e;
  };

  const cargarDatos = useCallback(async () => {
    try {
      const [costosData, ventasData, operacionesData, tiposCostoData, monedasData] =
        await Promise.all([
          request("http://localhost:3001/api/costo-operacion"),
          request("http://localhost:3001/api/venta-operacion"),
          request("http://localhost:3001/api/operaciones"),
          request("http://localhost:3001/api/tipo-costo"),
          request("http://localhost:3001/api/moneda"),
        ]);

      setCostos(Array.isArray(costosData) ? costosData : []);
      setVentas(Array.isArray(ventasData) ? ventasData : []);
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

  useEffect(() => {
    const idOperacion = searchParams.get("id_operacion");
    const debeAbrirNuevo = searchParams.get("nuevo") === "1";
    const key = `${idOperacion || ""}-${debeAbrirNuevo ? "nuevo" : ""}`;

    if (!debeAbrirNuevo || !idOperacion || autoOpenKeyRef.current === key) return;
    const operacion = operaciones.find((item) => String(item.id_operacion) === String(idOperacion));
    if (!operacion) return;

    autoOpenKeyRef.current = key;
    setBusquedaCodigoOperacion(String(operacion.codigo_operacion || ""));
    setCodigoOperacionAplicado(String(operacion.codigo_operacion || ""));
    setBusquedaRealizada(true);
    setNuevoCosto({ ...costoInicial, id_operacion: String(idOperacion) });
    setErrores({});
    new bootstrap.Modal(document.getElementById("addCostoModal")).show();
  }, [operaciones, searchParams]);

  const buscarPorOperacion = () => {
    setCodigoOperacionAplicado(busquedaCodigoOperacion.trim());
    setBusquedaRealizada(true);
    setSelectedId(null);
  };

  const limpiarBusquedaOperacion = () => {
    setBusquedaCodigoOperacion("");
    setCodigoOperacionAplicado("");
    setBusquedaRealizada(false);
    setSelectedId(null);
  };

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
  const abrirVentaDesdeCosto = (costo) => {
    if (!costo) return;
    setVentaDesdeCosto({
      ...ventaInicial,
      id_operacion: String(costo.id_operacion ?? ""),
      id_tipo_costo: String(costo.id_tipo_costo ?? ""),
    });
    setErroresVenta({});
    new bootstrap.Modal(document.getElementById("addVentaDesdeCostoModal")).show();
  };

  const normalizarPayload = (costo) => ({
    id_operacion: Number(costo.id_operacion),
    id_tipo_costo: Number(costo.id_tipo_costo),
    id_moneda: Number(costo.id_moneda),
    monto: Number(costo.monto),
    observacion: costo.observacion?.trim() || "",
  });
  const existeVentaParaCosto = (costo) =>
    ventas.some(
      (venta) =>
        String(venta.id_operacion) === String(costo.id_operacion) &&
        String(venta.id_tipo_costo) === String(costo.id_tipo_costo)
    );

  const guardarNuevo = async () => {
    const e = validarCosto(nuevoCosto);
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
  const guardarVentaDesdeCosto = async () => {
    const e = validarVenta(ventaDesdeCosto);
    if (Object.keys(e).length > 0) {
      setErroresVenta(e);
      return;
    }

    try {
      await request("http://localhost:3001/api/venta-operacion", {
        method: "POST",
        body: JSON.stringify(normalizarPayload(ventaDesdeCosto)),
      });

      await cargarDatos();
      bootstrap.Modal.getInstance(document.getElementById("addVentaDesdeCostoModal"))?.hide();
      setVentaDesdeCosto(ventaInicial);
      setErroresVenta({});
    } catch (error) {
      console.error("Error al crear venta:", error);
      alert(error.message || "Error al crear venta");
    }
  };

  const guardarEdicion = async () => {
    if (!costoSeleccionado) return;

    const e = validarCosto(costoSeleccionado, costoSeleccionado.id_costo);
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
    if (!busquedaRealizada) return [];
    const codigo = codigoOperacionAplicado.trim().toLowerCase();

    return costos.filter((costo) => String(costo.codigo_operacion || "").toLowerCase() === codigo);
  }, [codigoOperacionAplicado, costos, busquedaRealizada]);

  const operacionFiltradaExiste = useMemo(() => {
    if (!busquedaRealizada) return true;
    const codigo = codigoOperacionAplicado.trim().toLowerCase();
    if (!codigo) return false;

    return operaciones.some(
      (operacion) => String(operacion.codigo_operacion || "").toLowerCase() === codigo
    );
  }, [busquedaRealizada, codigoOperacionAplicado, operaciones]);

  const resumenMontos = useMemo(
    () =>
      costosFiltrados.reduce(
        (resumen, costo) => {
          const monto = Number(costo.monto || 0);
          if (esBoliviano(costo)) {
            return { ...resumen, bolivianos: resumen.bolivianos + monto };
          }
          if (esDolar(costo)) {
            return { ...resumen, dolares: resumen.dolares + monto };
          }
          return resumen;
        },
        { bolivianos: 0, dolares: 0 }
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
  const obtenerOperacion = (idOperacion) =>
    operaciones.find((operacion) => String(operacion.id_operacion) === String(idOperacion));
  const obtenerTipoCosto = (idTipoCosto) =>
    tiposCosto.find((tipo) => String(tipo.id_tipo_costo) === String(idTipoCosto));
  const renderSelectConErrores = (label, field, state, setState, opciones, valueKey, labelKey, erroresActuales) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <select
        className={`form-select ${erroresActuales[field] ? "is-invalid" : ""}`}
        value={state[field] || ""}
        onChange={(e) => setState({ ...state, [field]: e.target.value })}
      >
        <option value="">Seleccionar</option>
        {opciones.map((opcion) => (
          <option key={opcion[valueKey]} value={opcion[valueKey]}>
            {opcion[labelKey]}
          </option>
        ))}
      </select>
      {erroresActuales[field] ? <div className="invalid-feedback">{erroresActuales[field]}</div> : null}
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
              <label className="form-label">Codigo de operacion</label>
              <input
                className="form-control"
                placeholder="Escribe el codigo de operacion..."
                value={busquedaCodigoOperacion}
                onChange={(e) => setBusquedaCodigoOperacion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") buscarPorOperacion();
                }}
              />
            </div>

            <div className="col-12 col-md-4 d-flex gap-2">
              <button
                className="btn btn-primary w-100"
                type="button"
                onClick={buscarPorOperacion}
              >
                Buscar
              </button>
              <button
                className="btn btn-secondary w-100"
                type="button"
                onClick={limpiarBusquedaOperacion}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {!busquedaRealizada ? (
          <div className="ui-card text-center py-4 text-muted">
            Escribe el codigo de operacion y presiona Buscar para ver sus costos.
          </div>
        ) : (
        <div className="row g-3 mb-3">
          <div className="col-12 col-lg-9">
            <div className="table-responsive ui-card">
              <table className="table table-hover table-bordered align-middle m-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 48 }} className="text-center">#</th>
                    <th>Operacion</th>
                    <th>Tipo de costo</th>
                    <th>Moneda</th>
                    <th>Monto</th>
                    <th>Observacion</th>
                    <th className="text-center">Venta</th>
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
                        <td className="text-center">
                          {costo.moneda} ({costo.codigo_moneda})
                        </td>
                        <td>{Number(costo.monto || 0).toFixed(2)}</td>
                        <td>{costo.observacion || "-"}</td>
                        <td>
                          <div className="d-flex justify-content-center">
                            {existeVentaParaCosto(costo) ? (
                              <span className="text-muted">Registrada</span>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-success"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  abrirVentaDesdeCosto(costo);
                                }}
                              >
                                Registrar venta
                              </button>
                            )}
                          </div>
                        </td>
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
                        {operacionFiltradaExiste
                          ? "No hay costos activos registrados para esa operacion."
                          : "No hay ninguna operacion activa con ese codigo."}
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
                <span>Total bolivianos</span>
                <strong>{resumenMontos.bolivianos.toFixed(2)}</strong>
              </div>
              <div className="summary-row">
                <span>Total dolares</span>
                <strong>{resumenMontos.dolares.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
        )}
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

      <div className="modal fade" id="addVentaDesdeCostoModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar venta</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Operacion</label>
                <input className="form-control" value={obtenerOperacion(ventaDesdeCosto.id_operacion)?.codigo_operacion || ""} readOnly disabled />
                {erroresVenta.id_operacion ? <div className="invalid-feedback d-block">{erroresVenta.id_operacion}</div> : null}
              </div>

              <div className="mb-3">
                <label className="form-label">Tipo de costo</label>
                <input className="form-control" value={obtenerTipoCosto(ventaDesdeCosto.id_tipo_costo)?.descripcion || ""} readOnly disabled />
                {erroresVenta.id_tipo_costo ? <div className="invalid-feedback d-block">{erroresVenta.id_tipo_costo}</div> : null}
              </div>

              {renderSelectConErrores(
                "Moneda",
                "id_moneda",
                ventaDesdeCosto,
                setVentaDesdeCosto,
                monedas,
                "id_moneda",
                "descripcion",
                erroresVenta
              )}

              <div className="mb-3">
                <label className="form-label">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  className={`form-control ${erroresVenta.monto ? "is-invalid" : ""}`}
                  value={ventaDesdeCosto.monto}
                  onChange={(e) => setVentaDesdeCosto({ ...ventaDesdeCosto, monto: e.target.value })}
                />
                {erroresVenta.monto ? <div className="invalid-feedback">{erroresVenta.monto}</div> : null}
              </div>

              <div className="mb-3">
                <label className="form-label">Observacion</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={ventaDesdeCosto.observacion}
                  onChange={(e) => setVentaDesdeCosto({ ...ventaDesdeCosto, observacion: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-success" onClick={guardarVentaDesdeCosto}>
                Guardar
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
