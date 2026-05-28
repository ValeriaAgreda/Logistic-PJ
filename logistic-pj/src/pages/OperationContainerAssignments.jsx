import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";

const asignacionInicial = {
  id_contenedor: "",
  id_operacion: "",
  fecha_asignacion: "",
  fecha_devolucion_limite: "",
  fecha_devolucion: "",
};

const obtenerHeadersAuth = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id_usuario ? { "x-user-id": String(user.id_usuario) } : {};
  } catch {
    return {};
  }
};

const formatearFecha = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString("es-BO");
};

const formatearFechaHora = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString("es-BO");
};

const OperationContainerAssignments = () => {
  const [asignaciones, setAsignaciones] = useState([]);
  const [contenedores, setContenedores] = useState([]);
  const [operaciones, setOperaciones] = useState([]);
  const [nuevaAsignacion, setNuevaAsignacion] = useState(asignacionInicial);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState(null);
  const [asignacionAEliminar, setAsignacionAEliminar] = useState(null);
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

  const validar = (asignacion) => {
    const e = {};

    if (!asignacion.id_contenedor) {
      e.id_contenedor = "Selecciona un contenedor.";
    }

    if (!asignacion.id_operacion) {
      e.id_operacion = "Selecciona una operacion.";
    }

    if (!asignacion.fecha_asignacion) {
      e.fecha_asignacion = "La fecha de asignación es obligatoria.";
    }

    if (
      asignacion.fecha_devolucion_limite &&
      asignacion.fecha_devolucion_limite < asignacion.fecha_asignacion
    ) {
      e.fecha_devolucion_limite =
        "La fecha límite no puede ser menor a la fecha de asignación.";
    }

    if (
      asignacion.fecha_devolucion &&
      asignacion.fecha_devolucion < asignacion.fecha_asignacion
    ) {
      e.fecha_devolucion =
        "La fecha de devolución no puede ser menor a la fecha de asignación.";
    }

    return e;
  };

  const cargarDatos = useCallback(async () => {
    try {
      const [asignacionesData, contenedoresData, operacionesData] = await Promise.all([
        request("http://localhost:3001/api/operacion-contenedor"),
        request("http://localhost:3001/api/contenedores"),
        request("http://localhost:3001/api/operaciones"),
      ]);

      setAsignaciones(Array.isArray(asignacionesData) ? asignacionesData : []);
      setContenedores(Array.isArray(contenedoresData) ? contenedoresData : []);
      setOperaciones(Array.isArray(operacionesData) ? operacionesData : []);
    } catch (error) {
      console.error("Error al cargar asignaciones:", error);
      alert(error.message || "Error al cargar asignaciones");
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirNuevo = () => {
    setNuevaAsignacion(asignacionInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addAsignacionContenedorModal")).show();
  };

  const abrirEditar = (asignacion) => {
    if (!asignacion) return;
    setAsignacionSeleccionada({
      ...asignacionInicial,
      ...asignacion,
      id_contenedor: String(asignacion.id_contenedor ?? ""),
      id_operacion: String(asignacion.id_operacion ?? ""),
      fecha_asignacion: asignacion.fecha_asignacion?.slice(0, 10) || "",
      fecha_devolucion_limite: asignacion.fecha_devolucion_limite?.slice(0, 10) || "",
      fecha_devolucion: asignacion.fecha_devolucion?.slice(0, 10) || "",
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editAsignacionContenedorModal")).show();
  };

  const abrirEliminar = (asignacion) => {
    if (!asignacion) return;
    setAsignacionAEliminar(asignacion);
    new bootstrap.Modal(document.getElementById("deleteAsignacionContenedorModal")).show();
  };

  const normalizarPayload = (asignacion) => ({
    id_contenedor: Number(asignacion.id_contenedor),
    id_operacion: Number(asignacion.id_operacion),
    fecha_asignacion: asignacion.fecha_asignacion,
    fecha_devolucion_limite: asignacion.fecha_devolucion_limite || null,
    fecha_devolucion: asignacion.fecha_devolucion || null,
  });

  const guardarNuevo = async () => {
    const e = validar(nuevaAsignacion);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      await request("http://localhost:3001/api/operacion-contenedor", {
        method: "POST",
        body: JSON.stringify(normalizarPayload(nuevaAsignacion)),
      });

      await cargarDatos();
      bootstrap.Modal.getInstance(
        document.getElementById("addAsignacionContenedorModal")
      )?.hide();
      setNuevaAsignacion(asignacionInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear asignacion:", error);
      alert(error.message || "Error al crear asignacion");
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
      await request(
        `http://localhost:3001/api/operacion-contenedor/${asignacionSeleccionada.id_asignacion}`,
        {
          method: "PUT",
          body: JSON.stringify(normalizarPayload(asignacionSeleccionada)),
        }
      );

      await cargarDatos();
      bootstrap.Modal.getInstance(
        document.getElementById("editAsignacionContenedorModal")
      )?.hide();
      setAsignacionSeleccionada(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar asignacion:", error);
      alert(error.message || "Error al actualizar asignacion");
    }
  };

  const eliminarAsignacion = async () => {
    if (!asignacionAEliminar) return;

    try {
      await request(
        `http://localhost:3001/api/operacion-contenedor/${asignacionAEliminar.id_asignacion}`,
        {
          method: "DELETE",
        }
      );

      await cargarDatos();
      bootstrap.Modal.getInstance(
        document.getElementById("deleteAsignacionContenedorModal")
      )?.hide();
      setAsignacionAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar asignacion:", error);
      alert(error.message || "Error al eliminar asignacion");
    }
  };

  const asignacionSeleccionadaTabla = useMemo(
    () => asignaciones.find((a) => a.id_asignacion === selectedId) || null,
    [asignaciones, selectedId]
  );

  const asignacionesFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();

    return asignaciones.filter((asignacion) => {
      return (
        !q ||
        String(asignacion.codigo_operacion || "").toLowerCase().includes(q) ||
        String(asignacion.numero_contenedor || "").toLowerCase().includes(q) ||
        String(asignacion.naviera || "").toLowerCase().includes(q) ||
        String(asignacion.tipo_contenedor || "").toLowerCase().includes(q)
      );
    });
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
      onClick: cargarDatos,
      disabled: false,
    },
  ];

  const renderSelect = (label, field, state, setState, opciones, valueKey, labelBuilder) => (
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
            {labelBuilder(opcion)}
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
          <h1 className="page-title m-0">Asignacion de Contenedores</h1>

          {asignacionSeleccionadaTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{asignacionSeleccionadaTabla.numero_contenedor}</strong>
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
                placeholder="Operacion, contenedor, naviera o tipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3 d-flex gap-2">
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

        <div className="table-responsive ui-card">
          <table className="table table-hover table-bordered align-middle m-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 48 }} className="text-center">#</th>
                <th>Operacion</th>
                <th>Contenedor</th>
                <th>Tipo</th>
                <th>Naviera</th>
                <th>Fecha Asignacion</th>
                <th>Fecha Limite</th>
                <th>Fecha Devolucion</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {asignacionesFiltradas.map((asignacion, idx) => {
                const isSelected = asignacion.id_asignacion === selectedId;

                return (
                  <tr
                    key={asignacion.id_asignacion}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(asignacion.id_asignacion)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{asignacion.codigo_operacion}</td>
                    <td>{asignacion.numero_contenedor}</td>
                    <td>{asignacion.tipo_contenedor || "-"}</td>
                    <td>{asignacion.naviera || "-"}</td>
                    <td>{formatearFecha(asignacion.fecha_asignacion)}</td>
                    <td>{formatearFecha(asignacion.fecha_devolucion_limite)}</td>
                    <td>{formatearFecha(asignacion.fecha_devolucion)}</td>
                    <td>{formatearFechaHora(asignacion.fecha_registro)}</td>
                  </tr>
                );
              })}

              {asignacionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    No hay asignaciones activas con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="modal fade"
        id="addAsignacionContenedorModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar asignacion</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {renderSelect(
                "Operacion",
                "id_operacion",
                nuevaAsignacion,
                setNuevaAsignacion,
                operaciones,
                "id_operacion",
                (opcion) => opcion.codigo_operacion
              )}

              {renderSelect(
                "Contenedor",
                "id_contenedor",
                nuevaAsignacion,
                setNuevaAsignacion,
                contenedores,
                "id_contenedor",
                (opcion) => `${opcion.numero_contenedor} - ${opcion.naviera || "Sin naviera"}`
              )}

              <div className="mb-3">
                <label className="form-label">Fecha de asignacion</label>
                <input
                  type="date"
                  className={`form-control ${errores.fecha_asignacion ? "is-invalid" : ""}`}
                  value={nuevaAsignacion.fecha_asignacion}
                  onChange={(e) =>
                    setNuevaAsignacion({
                      ...nuevaAsignacion,
                      fecha_asignacion: e.target.value,
                    })
                  }
                />
                {errores.fecha_asignacion && (
                  <div className="invalid-feedback">{errores.fecha_asignacion}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Fecha de devolucion limite</label>
                <input
                  type="date"
                  className={`form-control ${errores.fecha_devolucion_limite ? "is-invalid" : ""}`}
                  value={nuevaAsignacion.fecha_devolucion_limite}
                  onChange={(e) =>
                    setNuevaAsignacion({
                      ...nuevaAsignacion,
                      fecha_devolucion_limite: e.target.value,
                    })
                  }
                />
                {errores.fecha_devolucion_limite && (
                  <div className="invalid-feedback">{errores.fecha_devolucion_limite}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Fecha de devolucion</label>
                <input
                  type="date"
                  className={`form-control ${errores.fecha_devolucion ? "is-invalid" : ""}`}
                  value={nuevaAsignacion.fecha_devolucion}
                  onChange={(e) =>
                    setNuevaAsignacion({
                      ...nuevaAsignacion,
                      fecha_devolucion: e.target.value,
                    })
                  }
                />
                {errores.fecha_devolucion && (
                  <div className="invalid-feedback">{errores.fecha_devolucion}</div>
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
        id="editAsignacionContenedorModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar asignacion</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {asignacionSeleccionada && (
                <>
                  {renderSelect(
                    "Operacion",
                    "id_operacion",
                    asignacionSeleccionada,
                    setAsignacionSeleccionada,
                    operaciones,
                    "id_operacion",
                    (opcion) => opcion.codigo_operacion
                  )}

                  {renderSelect(
                    "Contenedor",
                    "id_contenedor",
                    asignacionSeleccionada,
                    setAsignacionSeleccionada,
                    contenedores,
                    "id_contenedor",
                    (opcion) =>
                      `${opcion.numero_contenedor} - ${opcion.naviera || "Sin naviera"}`
                  )}

                  <div className="mb-3">
                    <label className="form-label">Fecha de asignacion</label>
                    <input
                      type="date"
                      className={`form-control ${errores.fecha_asignacion ? "is-invalid" : ""}`}
                      value={asignacionSeleccionada.fecha_asignacion || ""}
                      onChange={(e) =>
                        setAsignacionSeleccionada({
                          ...asignacionSeleccionada,
                          fecha_asignacion: e.target.value,
                        })
                      }
                    />
                    {errores.fecha_asignacion && (
                      <div className="invalid-feedback">{errores.fecha_asignacion}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Fecha de devolucion limite</label>
                    <input
                      type="date"
                      className={`form-control ${errores.fecha_devolucion_limite ? "is-invalid" : ""}`}
                      value={asignacionSeleccionada.fecha_devolucion_limite || ""}
                      onChange={(e) =>
                        setAsignacionSeleccionada({
                          ...asignacionSeleccionada,
                          fecha_devolucion_limite: e.target.value,
                        })
                      }
                    />
                    {errores.fecha_devolucion_limite && (
                      <div className="invalid-feedback">{errores.fecha_devolucion_limite}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Fecha de devolucion</label>
                    <input
                      type="date"
                      className={`form-control ${errores.fecha_devolucion ? "is-invalid" : ""}`}
                      value={asignacionSeleccionada.fecha_devolucion || ""}
                      onChange={(e) =>
                        setAsignacionSeleccionada({
                          ...asignacionSeleccionada,
                          fecha_devolucion: e.target.value,
                        })
                      }
                    />
                    {errores.fecha_devolucion && (
                      <div className="invalid-feedback">{errores.fecha_devolucion}</div>
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

      <div
        className="modal fade"
        id="deleteAsignacionContenedorModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar asignacion</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {asignacionAEliminar && (
                <p>
                  Seguro que deseas desactivar la asignacion del contenedor{" "}
                  <strong>{asignacionAEliminar.numero_contenedor}</strong>?
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

export default OperationContainerAssignments;

