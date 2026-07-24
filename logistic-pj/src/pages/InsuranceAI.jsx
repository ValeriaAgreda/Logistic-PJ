import React, { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config/api";
import "../styles/insurance.css";

const authHeaders = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id_usuario ? { "x-user-id": String(user.id_usuario) } : {};
  } catch {
    return {};
  }
};

const parseResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detalle || data?.error || "Error en la solicitud");
  return data;
};

const request = async (url, options = {}) =>
  parseResponse(
    await fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(),
        ...(options.headers || {}),
      },
    })
  );

const fmtDateTime = (value) => (value ? new Date(value).toLocaleString("es-BO") : "-");

const isLclOperation = (operation) => Number(operation?.lcl) === 1 || operation?.lcl === true;

const serviceAllowsContainers = (operation) => {
  const service = String(operation?.tipo_servicio || "").trim().toLowerCase();
  return service === "maritimo" || service === "terrestre" || service === "bimodal";
};

const InsuranceAI = () => {
  const [operaciones, setOperaciones] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [idOperacion, setIdOperacion] = useState("");
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [error, setError] = useState("");

  const cargarDatos = useCallback(async () => {
    setLoadingData(true);
    setError("");

    try {
      const [ops, asigns] = await Promise.all([
        request(`${API_BASE_URL}/operaciones`),
        request(`${API_BASE_URL}/operacion-contenedor`),
      ]);

      setOperaciones(Array.isArray(ops) ? ops : []);
      setAsignaciones(Array.isArray(asigns) ? asigns : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los datos.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const operacionSeleccionada = useMemo(
    () => operaciones.find((operacion) => String(operacion.id_operacion) === String(idOperacion)) || null,
    [idOperacion, operaciones]
  );

  const contenedoresOperacion = useMemo(
    () =>
      asignaciones.filter(
        (asignacion) => String(asignacion.id_operacion) === String(idOperacion)
      ),
    [asignaciones, idOperacion]
  );

  useEffect(() => {
    const cargarRecomendacionGuardada = async () => {
      setResultado(null);

      if (!idOperacion) return;

      setLoadingSaved(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/recomendacion-seguro/operacion/${idOperacion}`,
          {
            credentials: "include",
            headers: {
              ...authHeaders(),
            },
          }
        );
        const data = await res.json();

        if (res.ok) {
          setResultado(data);
        } else if (res.status !== 404) {
          setError(data?.detalle || data?.error || "No se pudo cargar la recomendacion guardada.");
        }
      } catch (err) {
        setError(err.message || "No se pudo cargar la recomendacion guardada.");
      } finally {
        setLoadingSaved(false);
      }
    };

    cargarRecomendacionGuardada();
  }, [idOperacion]);

  const generarRecomendacion = async () => {
    if (!idOperacion) {
      setError("Selecciona una operacion.");
      return;
    }

    const requiresContainer =
      serviceAllowsContainers(operacionSeleccionada) && !isLclOperation(operacionSeleccionada);

    if (requiresContainer && contenedoresOperacion.length === 0) {
      setError("Esta operacion requiere al menos un contenedor asignado.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await request(`${API_BASE_URL}/recomendacion-seguro/operacion/${idOperacion}`, {
        method: "POST",
      });

      setResultado(data);
    } catch (err) {
      setError(err.message || "No se pudo generar la recomendacion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="insurance-container flex-grow-1 p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="page-title m-0">Recomendacion de Seguros IA</h1>
          <small className="text-muted">
            Selecciona una operacion para que Gemini evalue la carga, ruta y nacionalizacion.
          </small>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-3">
        <div className="col-12 col-xl-5">
          <div className="ui-card insurance-panel">
            <div className="mb-3">
              <label className="form-label">Operacion</label>
              <select
                className="form-select"
                value={idOperacion}
                onChange={(event) => {
                  setIdOperacion(event.target.value);
                  setError("");
                }}
                disabled={loadingData}
              >
                <option value="">Seleccionar operacion</option>
                {operaciones.map((operacion) => (
                  <option key={operacion.id_operacion} value={operacion.id_operacion}>
                    {operacion.codigo_operacion} - {operacion.origen} a {operacion.destino}
                  </option>
                ))}
              </select>
            </div>

            {operacionSeleccionada ? (
              <div className="insurance-summary">
                <div>
                  <span>Servicio</span>
                  <strong>{operacionSeleccionada.tipo_servicio}</strong>
                </div>
                <div>
                  <span>Producto</span>
                  <strong>{operacionSeleccionada.porducto}</strong>
                </div>
                <div>
                  <span>Incoterm</span>
                  <strong>{operacionSeleccionada.incoterm || "-"}</strong>
                </div>
                <div>
                  <span>Modalidad</span>
                  <strong>
                    {contenedoresOperacion.length
                      ? "Contenedorizada"
                      : isLclOperation(operacionSeleccionada)
                        ? "LCL / carga suelta"
                        : "Sin contenedor"}
                  </strong>
                </div>
                <div>
                  <span>Ruta</span>
                  <strong>
                    {operacionSeleccionada.origen} - {operacionSeleccionada.destino}
                  </strong>
                </div>
                {isLclOperation(operacionSeleccionada) ? (
                  <div>
                    <span>Cantidad</span>
                    <strong>{operacionSeleccionada.cantidad || "-"}</strong>
                  </div>
                ) : null}
                {isLclOperation(operacionSeleccionada) ? (
                  <>
                    <div>
                      <span>Volumen</span>
                      <strong>{operacionSeleccionada.volumen ?? "-"}</strong>
                    </div>
                    <div>
                      <span>Peso</span>
                      <strong>{operacionSeleccionada.peso ?? "-"}</strong>
                    </div>
                  </>
                ) : null}
                {operacionSeleccionada.observacion ? (
                  <div>
                    <span>Observaciones</span>
                    <strong>{operacionSeleccionada.observacion}</strong>
                  </div>
                ) : null}
              </div>
            ) : null}

            {resultado?.desactualizada ? (
              <div className="alert alert-warning mt-3 mb-0">
                La operacion fue modificada desde la ultima evaluacion. La recomendacion mostrada
                esta desactualizada y puede volver a generarse.
              </div>
            ) : null}

            <button
              className="btn btn-orange w-100 mt-3"
              type="button"
              onClick={generarRecomendacion}
              disabled={loading || loadingData || loadingSaved || !idOperacion || Boolean(resultado?.vigente)}
            >
              {loading
                ? "Generando..."
                : loadingSaved
                  ? "Buscando recomendacion..."
                  : resultado?.vigente
                    ? "Recomendacion vigente"
                    : resultado?.desactualizada
                      ? "Actualizar recomendacion"
                    : "Generar recomendacion"}
            </button>
          </div>
        </div>

        <div className="col-12 col-xl-7">
          <div className="ui-card insurance-panel">
            <h2 className="insurance-heading">Detalle de carga</h2>
            <div className="table-responsive">
              <table className="table table-sm table-bordered align-middle m-0">
                <thead className="table-light">
                  <tr>
                    <th>Numero</th>
                    <th>Tipo</th>
                    <th>Naviera</th>
                    <th>Peso bruto</th>
                  </tr>
                </thead>
                <tbody>
                  {contenedoresOperacion.map((contenedor) => (
                    <tr key={contenedor.id_asignacion}>
                      <td>{contenedor.numero_contenedor}</td>
                      <td>{contenedor.tipo_contenedor || "-"}</td>
                      <td>{contenedor.naviera || "-"}</td>
                      <td>{contenedor.peso_bruto ?? "-"}</td>
                    </tr>
                  ))}
                  {idOperacion && contenedoresOperacion.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">
                        {isLclOperation(operacionSeleccionada)
                          ? `Carga suelta LCL: cantidad ${operacionSeleccionada?.cantidad || "-"}, volumen ${operacionSeleccionada?.volumen ?? "-"}, peso ${operacionSeleccionada?.peso ?? "-"}`
                          : serviceAllowsContainers(operacionSeleccionada)
                            ? "Esta operacion permite contenedores, pero aun no tiene asignados."
                            : "Este tipo de servicio se evalua con producto, ruta y datos de operacion."}
                      </td>
                    </tr>
                  ) : null}
                  {!idOperacion ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">
                        Selecciona una operacion.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ui-card insurance-panel mt-3">
            <h2 className="insurance-heading">Resultado</h2>
            {resultado ? (
              <>
                <div className="insurance-result-grid">
                  <div>
                    <span>Requiere seguro</span>
                    <strong>{resultado.requiere_seguro ? "Si" : "No"}</strong>
                  </div>
                  <div>
                    <span>Nivel de riesgo</span>
                    <strong>{resultado.nivel_riesgo}</strong>
                  </div>
                  <div>
                    <span>Puntaje</span>
                    <strong>{resultado.puntaje_riesgo}</strong>
                  </div>
                  <div>
                    <span>Seguro recomendado</span>
                    <strong>{resultado.tipo_seguro_recomendado}</strong>
                  </div>
                  {resultado.codigo_seguro_recomendado ? (
                    <div>
                      <span>Codigo de cobertura</span>
                      <strong>{resultado.codigo_seguro_recomendado}</strong>
                    </div>
                  ) : null}
                  <div>
                    <span>Fuente</span>
                    <strong>{resultado.fuente_recomendacion === "gemini" ? "Gemini" : "Reglas"}</strong>
                  </div>
                  {resultado.modelo_ia ? (
                    <div>
                      <span>Modelo IA</span>
                      <strong>{resultado.modelo_ia}</strong>
                    </div>
                  ) : null}
                </div>

                {resultado.resumen_ia ? (
                  <div className="mt-3">
                    <span className="insurance-label">Resumen IA</span>
                    <p className="mb-0">{resultado.resumen_ia}</p>
                  </div>
                ) : null}

                {Array.isArray(resultado.motivos_ia) && resultado.motivos_ia.length ? (
                  <div className="mt-3">
                    <span className="insurance-label">Motivos IA</span>
                    <ul className="insurance-motives">
                      {resultado.motivos_ia.map((motivo) => (
                        <li key={motivo}>{motivo}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {Array.isArray(resultado.acciones_recomendadas) &&
                resultado.acciones_recomendadas.length ? (
                  <div className="mt-3">
                    <span className="insurance-label">Acciones recomendadas</span>
                    <ul className="insurance-motives">
                      {resultado.acciones_recomendadas.map((accion) => (
                        <li key={accion}>{accion}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {Array.isArray(resultado.coberturas_adicionales) &&
                resultado.coberturas_adicionales.length ? (
                  <div className="mt-3">
                    <span className="insurance-label">Coberturas adicionales sugeridas</span>
                    <ul className="insurance-motives">
                      {resultado.coberturas_adicionales.map((cobertura) => (
                        <li key={cobertura.codigo || cobertura}>
                          {cobertura.nombre || cobertura}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-3">
                  <span className="insurance-label">Metricas usadas</span>
                  {Array.isArray(resultado.motivos) && resultado.motivos.length ? (
                    <ul className="insurance-motives">
                      {resultado.motivos.map((motivo) => (
                        <li key={motivo}>{motivo}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted mb-0">Sin motivos registrados.</p>
                  )}
                </div>

                <small className="text-muted d-block mt-3">
                  Fecha: {fmtDateTime(resultado.fecha_recomendacion)}
                  {resultado.error_ia ? ` · IA no disponible: ${resultado.error_ia}` : ""}
                </small>
              </>
            ) : (
              <p className="text-muted mb-0">
                Genera una recomendacion para ver el nivel de riesgo y el tipo de seguro sugerido.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsuranceAI;
