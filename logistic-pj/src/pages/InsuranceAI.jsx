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
  if (!res.ok) throw new Error(data?.error || data?.detalle || "Error en la solicitud");
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

const InsuranceAI = () => {
  const [operaciones, setOperaciones] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [idOperacion, setIdOperacion] = useState("");
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = useCallback(async () => {
    setLoadingData(true);
    setError("");

    try {
      const [ops, asigns, recs] = await Promise.all([
        request(`${API_BASE_URL}/operaciones`),
        request(`${API_BASE_URL}/operacion-contenedor`),
        request(`${API_BASE_URL}/recomendacion-seguro`),
      ]);

      setOperaciones(Array.isArray(ops) ? ops : []);
      setAsignaciones(Array.isArray(asigns) ? asigns : []);
      setRecomendaciones(Array.isArray(recs) ? recs : []);
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

  const ultimaRecomendacion = useMemo(
    () =>
      recomendaciones.find(
        (recomendacion) => String(recomendacion.id_operacion) === String(idOperacion)
      ) || null,
    [idOperacion, recomendaciones]
  );

  useEffect(() => {
    setResultado(ultimaRecomendacion);
  }, [ultimaRecomendacion]);

  const generarRecomendacion = async () => {
    if (!idOperacion) {
      setError("Selecciona una operacion.");
      return;
    }

    if (contenedoresOperacion.length === 0) {
      setError("La operacion seleccionada debe tener al menos un contenedor asignado.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await request(`${API_BASE_URL}/recomendacion-seguro/operacion/${idOperacion}`, {
        method: "POST",
      });

      setResultado(data);
      await cargarDatos();
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
            Selecciona una operacion con contenedores asignados para generar la recomendacion.
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
                  <span>Ruta</span>
                  <strong>
                    {operacionSeleccionada.origen} - {operacionSeleccionada.destino}
                  </strong>
                </div>
                <div>
                  <span>Cantidad</span>
                  <strong>{operacionSeleccionada.cantidad}</strong>
                </div>
              </div>
            ) : null}

            <button
              className="btn btn-orange w-100 mt-3"
              type="button"
              onClick={generarRecomendacion}
              disabled={loading || loadingData || !idOperacion}
            >
              {loading ? "Generando..." : "Generar recomendacion"}
            </button>
          </div>
        </div>

        <div className="col-12 col-xl-7">
          <div className="ui-card insurance-panel">
            <h2 className="insurance-heading">Contenedores asignados</h2>
            <div className="table-responsive">
              <table className="table table-sm table-bordered align-middle m-0">
                <thead className="table-light">
                  <tr>
                    <th>Numero</th>
                    <th>Tipo</th>
                    <th>Peso bruto</th>
                  </tr>
                </thead>
                <tbody>
                  {contenedoresOperacion.map((contenedor) => (
                    <tr key={contenedor.id_asignacion}>
                      <td>{contenedor.numero_contenedor}</td>
                      <td>{contenedor.tipo_contenedor || "-"}</td>
                      <td>{contenedor.peso_bruto ?? "-"}</td>
                    </tr>
                  ))}
                  {idOperacion && contenedoresOperacion.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-3">
                        Esta operacion aun no tiene contenedores asignados.
                      </td>
                    </tr>
                  ) : null}
                  {!idOperacion ? (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-3">
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
                </div>

                <div className="mt-3">
                  <span className="insurance-label">Motivos</span>
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
