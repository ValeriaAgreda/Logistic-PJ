import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import ContainerFormFields from "../components/ContainerFormFields";

const asignacionInicial = {
  id_contenedor: "",
  id_operacion: "",
  fecha_llegada_puerto: "",
  fecha_devolucion_limite: "",
  fecha_devolucion: "",
};
const contenedorInicial = {
  numero_contenedor: "",
  id_tipo_contenedor: "",
  naviera: "",
  peso_bruto: "",
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

const calcularFechaLimite = (fechaLlegadaPuerto) => {
  if (!fechaLlegadaPuerto) return "";
  const fecha = new Date(`${fechaLlegadaPuerto}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return "";
  fecha.setDate(fecha.getDate() + 21);
  return fecha.toISOString().slice(0, 10);
};

const calcularDiasDemora = (fechaDevolucion, fechaLimite) => {
  if (!fechaDevolucion || !fechaLimite) return null;
  const devolucion = new Date(`${fechaDevolucion}T00:00:00`);
  const limite = new Date(`${fechaLimite}T00:00:00`);
  if (Number.isNaN(devolucion.getTime()) || Number.isNaN(limite.getTime())) return null;
  const diferencia = Math.ceil((devolucion - limite) / (1000 * 60 * 60 * 24));
  return Math.max(0, diferencia);
};

const mensajeDemora = (fechaDevolucion, fechaLimite) => {
  const diasDemora = calcularDiasDemora(fechaDevolucion, fechaLimite);
  if (diasDemora === null) return "";
  return diasDemora > 0 ? `Con demora: ${diasDemora} dia(s).` : "Sin demora.";
};

const permiteAsignarContenedor = (operacion) => {
  const tipoServicio = String(operacion?.tipo_servicio || "").trim().toLowerCase();
  return tipoServicio === "maritimo" || tipoServicio === "terrestre" || tipoServicio === "bimodal";
};

const operacionCerrada = (asignacion) =>
  String(asignacion?.estado_operacion || "").trim().toLowerCase() === "cerrado";

const OperationContainerAssignments = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [asignaciones, setAsignaciones] = useState([]);
  const [contenedores, setContenedores] = useState([]);
  const [tiposContenedor, setTiposContenedor] = useState([]);
  const [operaciones, setOperaciones] = useState([]);
  const [nuevaAsignacion, setNuevaAsignacion] = useState(asignacionInicial);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState(null);
  const [asignacionAEliminar, setAsignacionAEliminar] = useState(null);
  const [nuevoContenedor, setNuevoContenedor] = useState(contenedorInicial);
  const [erroresContenedor, setErroresContenedor] = useState({});
  const [contenedorTarget, setContenedorTarget] = useState("new");
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
    const operacionSeleccionada = operaciones.find(
      (operacion) => String(operacion.id_operacion) === String(asignacion.id_operacion)
    );

    if (!asignacion.id_contenedor) {
      e.id_contenedor = "Selecciona un contenedor.";
    }

    if (!asignacion.id_operacion) {
      e.id_operacion = "Selecciona una operacion.";
    } else if (!permiteAsignarContenedor(operacionSeleccionada)) {
      e.id_operacion = "Solo se puede asignar contenedor a operaciones Maritimo o Terrestre.";
    }

    if (!asignacion.fecha_llegada_puerto) {
      e.fecha_llegada_puerto = "La fecha de llegada al puerto es obligatoria.";
    }

    if (
      asignacion.fecha_devolucion &&
      asignacion.fecha_devolucion < asignacion.fecha_llegada_puerto
    ) {
      e.fecha_devolucion =
        "La fecha de devolución no puede ser antes de la fecha de llegada al puerto.";
    }

    return e;
  };

  const validarContenedor = (contenedor) => {
    const e = {};

    if (!contenedor.numero_contenedor || !contenedor.numero_contenedor.trim()) {
      e.numero_contenedor = "El numero de contenedor es obligatorio.";
    } else if (contenedor.numero_contenedor.trim().length > 70) {
      e.numero_contenedor = "El numero de contenedor no puede superar 70 caracteres.";
    } else {
      const numeroNormalizado = contenedor.numero_contenedor.trim().toUpperCase();
      const numeroDuplicado = contenedores.some(
        (item) => String(item.numero_contenedor || "").trim().toUpperCase() === numeroNormalizado
      );

      if (numeroDuplicado) {
        e.numero_contenedor = "Ya existe un contenedor registrado con ese numero.";
      }
    }

    if (!contenedor.id_tipo_contenedor) {
      e.id_tipo_contenedor = "Selecciona el tipo de contenedor.";
    }

    if (contenedor.naviera && contenedor.naviera.trim().length > 50) {
      e.naviera = "La naviera no puede superar 50 caracteres.";
    }

    if (contenedor.peso_bruto !== "" && Number.isNaN(Number(contenedor.peso_bruto))) {
      e.peso_bruto = "El peso bruto debe ser numerico.";
    }

    return e;
  };

  const cargarDatos = useCallback(async () => {
    try {
      const [asignacionesData, contenedoresData, operacionesData, tiposContenedorData] = await Promise.all([
        request("http://localhost:3001/api/operacion-contenedor"),
        request("http://localhost:3001/api/contenedores"),
        request("http://localhost:3001/api/operaciones"),
        request("http://localhost:3001/api/tipo-contenedor"),
      ]);

      setAsignaciones(Array.isArray(asignacionesData) ? asignacionesData : []);
      setContenedores(Array.isArray(contenedoresData) ? contenedoresData : []);
      setOperaciones(Array.isArray(operacionesData) ? operacionesData : []);
      setTiposContenedor(Array.isArray(tiposContenedorData) ? tiposContenedorData : []);
    } catch (error) {
      console.error("Error al cargar asignaciones:", error);
      alert(error.message || "Error al cargar asignaciones");
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    const idOperacion = location.state?.id_operacion;
    if (!idOperacion || operaciones.length === 0) return;
    const operacion = operaciones.find((item) => String(item.id_operacion) === String(idOperacion));
    if (!permiteAsignarContenedor(operacion)) return;

    setNuevaAsignacion({
      ...asignacionInicial,
      id_operacion: String(idOperacion),
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("addAsignacionContenedorModal")).show();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state?.id_operacion, navigate, operaciones]);

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
      fecha_llegada_puerto: asignacion.fecha_llegada_puerto?.slice(0, 10) || "",
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
    fecha_llegada_puerto: asignacion.fecha_llegada_puerto,
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

  const abrirFormularioContenedor = (target) => {
    setContenedorTarget(target);
    setNuevoContenedor(contenedorInicial);
    setErroresContenedor({});
    new bootstrap.Modal(document.getElementById("quickContainerModal")).show();
  };

  const guardarContenedorRapido = async () => {
    const e = validarContenedor(nuevoContenedor);

    if (Object.keys(e).length > 0) {
      setErroresContenedor(e);
      return;
    }

    try {
      const data = await request("http://localhost:3001/api/contenedores", {
        method: "POST",
        body: JSON.stringify({
          numero_contenedor: nuevoContenedor.numero_contenedor.trim().toUpperCase(),
          id_tipo_contenedor: Number(nuevoContenedor.id_tipo_contenedor),
          naviera: nuevoContenedor.naviera.trim(),
          peso_bruto: nuevoContenedor.peso_bruto,
        }),
      });

      const contenedoresData = await request("http://localhost:3001/api/contenedores");
      setContenedores(Array.isArray(contenedoresData) ? contenedoresData : []);

      const idContenedor = String(data.id_contenedor);
      if (contenedorTarget === "edit") {
        setAsignacionSeleccionada((actual) => ({
          ...actual,
          id_contenedor: idContenedor,
        }));
      } else {
        setNuevaAsignacion((actual) => ({
          ...actual,
          id_contenedor: idContenedor,
        }));
      }

      bootstrap.Modal.getInstance(document.getElementById("quickContainerModal"))?.hide();
      setNuevoContenedor(contenedorInicial);
      setErroresContenedor({});
    } catch (error) {
      console.error("Error al crear contenedor:", error);
      alert(error.message || "Error al crear contenedor");
    }
  };

  const asignacionSeleccionadaTabla = useMemo(
    () => asignaciones.find((a) => a.id_asignacion === selectedId) || null,
    [asignaciones, selectedId]
  );
  const contenedoresDisponibles = useMemo(
    () =>
      contenedores.filter(
        (contenedor) =>
          !asignaciones.some(
            (asignacion) =>
              String(asignacion.id_contenedor) === String(contenedor.id_contenedor) &&
              !operacionCerrada(asignacion)
          )
      ),
    [asignaciones, contenedores]
  );
  const contenedoresParaEditar = useMemo(() => {
    if (!asignacionSeleccionada) return contenedoresDisponibles;
    return contenedores.filter(
      (contenedor) =>
        String(contenedor.id_contenedor) === String(asignacionSeleccionada.id_contenedor) ||
        !asignaciones.some(
          (asignacion) =>
            String(asignacion.id_contenedor) === String(contenedor.id_contenedor) &&
            String(asignacion.id_asignacion) !== String(asignacionSeleccionada.id_asignacion) &&
            !operacionCerrada(asignacion)
        )
    );
  }, [asignacionSeleccionada, asignaciones, contenedores, contenedoresDisponibles]);

  const asignacionesFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();

    return asignaciones.filter((asignacion) => {
      return (
        !q ||
        String(asignacion.codigo_operacion || "").toLowerCase().includes(q) ||
        String(asignacion.numero_contenedor || "").toLowerCase().includes(q) ||
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
  ];

  const renderSelect = (label, field, state, setState, opciones, valueKey, labelBuilder, extraAction = null) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <div className="d-flex gap-2 align-items-start">
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
        {extraAction}
      </div>
      {errores[field] && <div className="invalid-feedback d-block">{errores[field]}</div>}
    </div>
  );
  const botonCrearContenedor = (target) => (
    <button
      type="button"
      className="btn btn-outline-primary"
      onClick={() => abrirFormularioContenedor(target)}
      title="Crear contenedor"
      aria-label="Crear contenedor"
    >
      <i className="pi pi-plus" aria-hidden="true" />
    </button>
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
                placeholder="Operacion, contenedor o tipo..."
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
                <th>Llegada a puerto</th>
                <th>Fecha limite</th>
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
                    <td>{formatearFecha(asignacion.fecha_llegada_puerto)}</td>
                    <td>{formatearFecha(asignacion.fecha_devolucion_limite)}</td>
                    <td>{formatearFecha(asignacion.fecha_devolucion)}</td>
                    <td>{formatearFechaHora(asignacion.fecha_registro)}</td>
                  </tr>
                );
              })}

              {asignacionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
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
                operaciones.filter(permiteAsignarContenedor),
                "id_operacion",
                (opcion) => opcion.codigo_operacion
              )}

              {renderSelect(
                "Contenedor",
                "id_contenedor",
                nuevaAsignacion,
                setNuevaAsignacion,
                contenedoresDisponibles,
                "id_contenedor",
                (opcion) => `${opcion.numero_contenedor} - ${opcion.tipo_contenedor || "Sin tipo"}`,
                botonCrearContenedor("new")
              )}

              <div className="mb-3">
                <label className="form-label">Fecha de llegada al puerto</label>
                <input
                  type="date"
                  className={`form-control ${errores.fecha_llegada_puerto ? "is-invalid" : ""}`}
                  value={nuevaAsignacion.fecha_llegada_puerto}
                  onChange={(e) =>
                    setNuevaAsignacion({
                      ...nuevaAsignacion,
                      fecha_llegada_puerto: e.target.value,
                      fecha_devolucion_limite: calcularFechaLimite(e.target.value),
                    })
                  }
                />
                {errores.fecha_llegada_puerto && (
                  <div className="invalid-feedback">{errores.fecha_llegada_puerto}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Fecha de devolucion limite</label>
                <input
                  type="date"
                  className="form-control"
                  value={calcularFechaLimite(nuevaAsignacion.fecha_llegada_puerto)}
                  readOnly
                  disabled
                />
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
                {mensajeDemora(
                  nuevaAsignacion.fecha_devolucion,
                  calcularFechaLimite(nuevaAsignacion.fecha_llegada_puerto)
                ) ? (
                  <small className="text-muted">
                    {mensajeDemora(
                      nuevaAsignacion.fecha_devolucion,
                      calcularFechaLimite(nuevaAsignacion.fecha_llegada_puerto)
                    )}
                  </small>
                ) : null}
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
                    operaciones.filter(permiteAsignarContenedor),
                    "id_operacion",
                    (opcion) => opcion.codigo_operacion
                  )}

                  {renderSelect(
                    "Contenedor",
                    "id_contenedor",
                    asignacionSeleccionada,
                    setAsignacionSeleccionada,
                    contenedoresParaEditar,
                    "id_contenedor",
                    (opcion) =>
                      `${opcion.numero_contenedor} - ${opcion.tipo_contenedor || "Sin tipo"}`,
                    botonCrearContenedor("edit")
                  )}

                  <div className="mb-3">
                    <label className="form-label">Fecha de llegada al puerto</label>
                    <input
                      type="date"
                      className={`form-control ${errores.fecha_llegada_puerto ? "is-invalid" : ""}`}
                      value={asignacionSeleccionada.fecha_llegada_puerto || ""}
                      onChange={(e) =>
                        setAsignacionSeleccionada({
                          ...asignacionSeleccionada,
                          fecha_llegada_puerto: e.target.value,
                          fecha_devolucion_limite: calcularFechaLimite(e.target.value),
                        })
                      }
                    />
                    {errores.fecha_llegada_puerto && (
                      <div className="invalid-feedback">{errores.fecha_llegada_puerto}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Fecha de devolucion limite</label>
                    <input
                      type="date"
                      className="form-control"
                      value={calcularFechaLimite(asignacionSeleccionada.fecha_llegada_puerto || "")}
                      readOnly
                      disabled
                    />
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
                    {mensajeDemora(
                      asignacionSeleccionada.fecha_devolucion,
                      calcularFechaLimite(asignacionSeleccionada.fecha_llegada_puerto || "")
                    ) ? (
                      <small className="text-muted">
                        {mensajeDemora(
                          asignacionSeleccionada.fecha_devolucion,
                          calcularFechaLimite(asignacionSeleccionada.fecha_llegada_puerto || "")
                        )}
                      </small>
                    ) : null}
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
        id="quickContainerModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Crear contenedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <ContainerFormFields
                contenedor={nuevoContenedor}
                setContenedor={setNuevoContenedor}
                errores={erroresContenedor}
                tiposContenedor={tiposContenedor}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-success" onClick={guardarContenedorRapido}>
                Guardar
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
