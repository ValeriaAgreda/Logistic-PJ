import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as bootstrap from "bootstrap";
import { useSearchParams } from "react-router-dom";
import {
  monedaSeleccionadaEsDolar,
  montoEnBolivianos,
  validarTipoCambio,
} from "../utils/currency";
import "../styles/costs.css";

const ventaInicial = {
  id_operacion: "",
  id_tipo_costo: "",
  id_moneda: "",
  monto: "",
  tipo_cambio: "",
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

const Sales = () => {
  const [searchParams] = useSearchParams();
  const autoOpenKeyRef = useRef("");
  const [ventas, setVentas] = useState([]);
  const [costos, setCostos] = useState([]);
  const [operaciones, setOperaciones] = useState([]);
  const [tiposCosto, setTiposCosto] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [nuevaVenta, setNuevaVenta] = useState(ventaInicial);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [ventaAEliminar, setVentaAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [busquedaCodigoOperacion, setBusquedaCodigoOperacion] = useState("");
  const [codigoOperacionAplicado, setCodigoOperacionAplicado] = useState("");
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const montoFormularioEnBolivianos = (movimiento) =>
    Number(movimiento.monto || 0) *
    (monedaSeleccionadaEsDolar(movimiento.id_moneda, monedas)
      ? Number(movimiento.tipo_cambio || 0)
      : 1);

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

  const buscarVentaMismaOperacionTipo = (venta, idVentaExcluir = null) =>
    ventas.find(
      (item) =>
        String(item.id_operacion) === String(venta.id_operacion) &&
        String(item.id_tipo_costo) === String(venta.id_tipo_costo) &&
        (!idVentaExcluir || String(item.id_venta) !== String(idVentaExcluir))
    );

  const buscarCostoMismaOperacionTipo = (venta) =>
    costos.find(
      (costo) =>
        String(costo.id_operacion) === String(venta.id_operacion) &&
        String(costo.id_tipo_costo) === String(venta.id_tipo_costo)
    );

  const validar = (venta, idVentaExcluir = null) => {
    const e = {};

    if (!venta.id_operacion) e.id_operacion = "Selecciona una operacion.";
    if (!venta.id_tipo_costo) e.id_tipo_costo = "Selecciona un tipo de costo.";
    if (!venta.id_moneda) e.id_moneda = "Selecciona una moneda.";

    if (
      venta.monto === "" ||
      Number.isNaN(Number(venta.monto)) ||
      Number(venta.monto) < 0
    ) {
      e.monto = "Ingresa un monto valido.";
    }

    const errorTipoCambio = validarTipoCambio(venta, monedas);
    if (errorTipoCambio) e.tipo_cambio = errorTipoCambio;

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
      !e.tipo_cambio &&
      montoFormularioEnBolivianos(venta) < montoEnBolivianos(costoExistente)
    ) {
      e.monto =
        "El monto de la venta en bolivianos debe ser mayor o igual al monto del costo.";
    }

    return e;
  };

  const cargarDatos = useCallback(async () => {
    try {
      const [ventasData, costosData, operacionesData, tiposCostoData, monedasData] =
        await Promise.all([
          request("http://localhost:3001/api/venta-operacion"),
          request("http://localhost:3001/api/costo-operacion"),
          request("http://localhost:3001/api/operaciones"),
          request("http://localhost:3001/api/tipo-costo"),
          request("http://localhost:3001/api/moneda"),
        ]);

      setVentas(Array.isArray(ventasData) ? ventasData : []);
      setCostos(Array.isArray(costosData) ? costosData : []);
      setOperaciones(Array.isArray(operacionesData) ? operacionesData : []);
      setTiposCosto(Array.isArray(tiposCostoData) ? tiposCostoData : []);
      setMonedas(Array.isArray(monedasData) ? monedasData : []);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
      alert(error.message || "Error al cargar ventas");
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
    setNuevaVenta({ ...ventaInicial, id_operacion: String(idOperacion) });
    setErrores({});
    new bootstrap.Modal(document.getElementById("addVentaModal")).show();
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
    setNuevaVenta(ventaInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addVentaModal")).show();
  };

  const abrirEditar = (venta) => {
    if (!venta) return;
    setVentaSeleccionada({
      ...ventaInicial,
      ...venta,
      id_operacion: String(venta.id_operacion ?? ""),
      id_tipo_costo: String(venta.id_tipo_costo ?? ""),
      id_moneda: String(venta.id_moneda ?? ""),
      monto: venta.monto ?? "",
      tipo_cambio: venta.tipo_cambio ?? "",
      observacion: venta.observacion || "",
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editVentaModal")).show();
  };

  const abrirEliminar = (venta) => {
    if (!venta) return;
    setVentaAEliminar(venta);
    new bootstrap.Modal(document.getElementById("deleteVentaModal")).show();
  };

  const normalizarPayload = (venta) => ({
    id_operacion: Number(venta.id_operacion),
    id_tipo_costo: Number(venta.id_tipo_costo),
    id_moneda: Number(venta.id_moneda),
    monto: Number(venta.monto),
    tipo_cambio: monedaSeleccionadaEsDolar(venta.id_moneda, monedas)
      ? Number(venta.tipo_cambio)
      : null,
    observacion: venta.observacion?.trim() || "",
  });

  const guardarNuevo = async () => {
    const e = validar(nuevaVenta);
    if (Object.keys(e).length > 0) return setErrores(e);

    try {
      await request("http://localhost:3001/api/venta-operacion", {
        method: "POST",
        body: JSON.stringify(normalizarPayload(nuevaVenta)),
      });

      await cargarDatos();
      bootstrap.Modal.getInstance(document.getElementById("addVentaModal"))?.hide();
      setNuevaVenta(ventaInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear venta:", error);
      alert(error.message || "Error al crear venta");
    }
  };

  const guardarEdicion = async () => {
    if (!ventaSeleccionada) return;

    const e = validar(ventaSeleccionada, ventaSeleccionada.id_venta);
    if (Object.keys(e).length > 0) return setErrores(e);

    try {
      await request(
        `http://localhost:3001/api/venta-operacion/${ventaSeleccionada.id_venta}`,
        {
          method: "PUT",
          body: JSON.stringify(normalizarPayload(ventaSeleccionada)),
        }
      );

      await cargarDatos();
      bootstrap.Modal.getInstance(document.getElementById("editVentaModal"))?.hide();
      setVentaSeleccionada(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar venta:", error);
      alert(error.message || "Error al actualizar venta");
    }
  };

  const eliminarVenta = async () => {
    if (!ventaAEliminar) return;

    try {
      await request(
        `http://localhost:3001/api/venta-operacion/${ventaAEliminar.id_venta}`,
        {
          method: "DELETE",
        }
      );

      await cargarDatos();
      bootstrap.Modal.getInstance(document.getElementById("deleteVentaModal"))?.hide();
      setVentaAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar venta:", error);
      alert(error.message || "Error al eliminar venta");
    }
  };

  const ventaSeleccionadaTabla = useMemo(
    () => ventas.find((venta) => venta.id_venta === selectedId) || null,
    [ventas, selectedId]
  );

  const ventasFiltradas = useMemo(() => {
    if (!busquedaRealizada) return [];
    const codigo = codigoOperacionAplicado.trim().toLowerCase();

    return ventas.filter((venta) => String(venta.codigo_operacion || "").toLowerCase() === codigo);
  }, [codigoOperacionAplicado, ventas, busquedaRealizada]);

  const operacionFiltradaExiste = useMemo(() => {
    if (!busquedaRealizada) return true;
    const codigo = codigoOperacionAplicado.trim().toLowerCase();
    if (!codigo) return false;

    return operaciones.some(
      (operacion) => String(operacion.codigo_operacion || "").toLowerCase() === codigo
    );
  }, [busquedaRealizada, codigoOperacionAplicado, operaciones]);

  const totalBolivianos = useMemo(
    () => ventasFiltradas.reduce((total, venta) => total + montoEnBolivianos(venta), 0),
    [ventasFiltradas]
  );

  const renderSelect = (label, field, state, setState, opciones, valueKey, labelKey) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <select
        className={`form-select ${errores[field] ? "is-invalid" : ""}`}
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
      {errores[field] ? <div className="invalid-feedback">{errores[field]}</div> : null}
    </div>
  );
  const renderTipoCambio = (state, setState) =>
    monedaSeleccionadaEsDolar(state.id_moneda, monedas) ? (
      <div className="mb-3">
        <label className="form-label">Tipo de cambio (Bs por USD)</label>
        <input
          type="number"
          min="0.0001"
          step="0.0001"
          inputMode="decimal"
          className={`form-control ${errores.tipo_cambio ? "is-invalid" : ""}`}
          value={state.tipo_cambio ?? ""}
          onChange={(event) => setState({ ...state, tipo_cambio: event.target.value })}
        />
        {errores.tipo_cambio ? (
          <div className="invalid-feedback">{errores.tipo_cambio}</div>
        ) : null}
      </div>
    ) : null;

  return (
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Ventas de Operación</h1>
          {ventaSeleccionadaTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{ventaSeleccionadaTabla.codigo_operacion}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona una venta para Editar/Eliminar
            </small>
          )}
        </div>

        <div className="ui-card mb-3">
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-orange" onClick={abrirNuevo} type="button">
              Nuevo
            </button>
            <button
              className="btn btn-primary"
              onClick={() => abrirEditar(ventaSeleccionadaTabla)}
              disabled={!ventaSeleccionadaTabla}
              type="button"
            >
              Editar
            </button>
            <button
              className="btn btn-danger"
              onClick={() => abrirEliminar(ventaSeleccionadaTabla)}
              disabled={!ventaSeleccionadaTabla}
              type="button"
            >
              Eliminar
            </button>
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
            Escribe el codigo de operacion y presiona Buscar para ver sus ventas.
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
                    <th>Tipo de cambio</th>
                    <th>Monto en Bs</th>
                    <th>Observacion</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.map((venta, idx) => (
                    <tr
                      key={venta.id_venta}
                      className={venta.id_venta === selectedId ? "row-selected" : ""}
                      onClick={() => setSelectedId(venta.id_venta)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="text-center">{idx + 1}</td>
                      <td>{venta.codigo_operacion}</td>
                      <td>{venta.tipo_costo}</td>
                      <td>
                        {venta.moneda} ({venta.codigo_moneda})
                      </td>
                      <td>{Number(venta.monto || 0).toFixed(2)}</td>
                      <td>{venta.tipo_cambio ? Number(venta.tipo_cambio).toFixed(4) : "-"}</td>
                      <td>{montoEnBolivianos(venta).toFixed(2)}</td>
                      <td>{venta.observacion || "-"}</td>
                      <td>
                        {venta.fecha_registro
                          ? new Date(venta.fecha_registro).toLocaleString("es-BO")
                          : "-"}
                      </td>
                    </tr>
                  ))}

                  {ventasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-4 text-muted">
                        {operacionFiltradaExiste
                          ? "No hay ventas activas registradas para esa operacion."
                          : "No hay ninguna operacion activa con ese codigo."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="col-12 col-lg-3">
            <div className="ui-card h-100">
              <h5 className="mb-3">Resumen</h5>
              <div className="summary-row">
                <span>Registros filtrados</span>
                <strong>{ventasFiltradas.length}</strong>
              </div>
              <div className="summary-row">
                <span>Total bolivianos</span>
                <strong>{totalBolivianos.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      <div className="modal fade" id="addVentaModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar venta</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {renderSelect("Operacion", "id_operacion", nuevaVenta, setNuevaVenta, operaciones, "id_operacion", "codigo_operacion")}
              {renderSelect("Tipo de costo", "id_tipo_costo", nuevaVenta, setNuevaVenta, tiposCosto, "id_tipo_costo", "descripcion")}
              {renderSelect("Moneda", "id_moneda", nuevaVenta, setNuevaVenta, monedas, "id_moneda", "descripcion")}
              {renderTipoCambio(nuevaVenta, setNuevaVenta)}

              <div className="mb-3">
                <label className="form-label">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  className={`form-control ${errores.monto ? "is-invalid" : ""}`}
                  value={nuevaVenta.monto}
                  onChange={(e) => setNuevaVenta({ ...nuevaVenta, monto: e.target.value })}
                />
                {errores.monto ? <div className="invalid-feedback">{errores.monto}</div> : null}
              </div>

              <div className="mb-3">
                <label className="form-label">Observacion</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={nuevaVenta.observacion}
                  onChange={(e) =>
                    setNuevaVenta({ ...nuevaVenta, observacion: e.target.value })
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

      <div className="modal fade" id="editVentaModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar venta</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {ventaSeleccionada ? (
                <>
                  {renderSelect("Operacion", "id_operacion", ventaSeleccionada, setVentaSeleccionada, operaciones, "id_operacion", "codigo_operacion")}
                  {renderSelect("Tipo de costo", "id_tipo_costo", ventaSeleccionada, setVentaSeleccionada, tiposCosto, "id_tipo_costo", "descripcion")}
                  {renderSelect("Moneda", "id_moneda", ventaSeleccionada, setVentaSeleccionada, monedas, "id_moneda", "descripcion")}
                  {renderTipoCambio(ventaSeleccionada, setVentaSeleccionada)}

                  <div className="mb-3">
                    <label className="form-label">Monto</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`form-control ${errores.monto ? "is-invalid" : ""}`}
                      value={ventaSeleccionada.monto || ""}
                      onChange={(e) =>
                        setVentaSeleccionada({
                          ...ventaSeleccionada,
                          monto: e.target.value,
                        })
                      }
                    />
                    {errores.monto ? <div className="invalid-feedback">{errores.monto}</div> : null}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Observacion</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={ventaSeleccionada.observacion || ""}
                      onChange={(e) =>
                        setVentaSeleccionada({
                          ...ventaSeleccionada,
                          observacion: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              ) : null}
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

      <div className="modal fade" id="deleteVentaModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar venta</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {ventaAEliminar ? (
                <p>
                  Seguro que deseas desactivar la venta de la operacion{" "}
                  <strong>{ventaAEliminar.codigo_operacion}</strong>?
                </p>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarVenta}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sales;
