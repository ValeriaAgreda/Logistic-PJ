import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";
import "../styles/operations.css";

const API = "http://localhost:3001/api";
const opInit = { fecha_asignacion: "", id_cliente: "", id_proveedor: "", id_tipo_servicio: "", porducto: "", origen: "", destino: "", lcl: false, cantidad: "", volumen: "", peso: "", nro_madre: "", nro_hijo: "", observacion: "", etd: "", eta: "", id_tipo_nacionalizacion: "", id_estado_operacion: "" };
const asignacionInit = { id_contenedor: "", id_operacion: "", fecha_llegada_puerto: "", fecha_devolucion_limite: "", fecha_devolucion: "" };
const clientInit = { razon_social: "", nit: "", contacto: "", telefono: "", correo: "", direccion: "", observacion: "" };
const supplierInit = { empresa: "", nit: "", contacto: "", telefono: "", correo: "", direccion: "", lugar_origen: "", id_tipo_servicio: "" };
const itemInit = { descripcion: "" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIT = /^\d{5,15}$/;
const PHONE = /^[67]\d{7}$/;
const SUPPLIER_PHONE = /^\+\d{8,15}$/;
const quickIcons = {
  client: "pi pi-users",
  supplier: "pi pi-briefcase",
  service: "pi pi-wrench",
  "service-supplier": "pi pi-wrench",
  nationalization: "pi pi-globe",
  status: "pi pi-sync",
};

const modal = (id) => new bootstrap.Modal(document.getElementById(id)).show();
const hideModal = (id) => bootstrap.Modal.getInstance(document.getElementById(id))?.hide();
const authHeaders = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    return u?.id_usuario ? { "x-user-id": String(u.id_usuario) } : {};
  } catch {
    return {};
  }
};
const parse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || data?.detalle || "Error en la solicitud");
  return data;
};
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("es-BO") : "-");
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString("es-BO") : "-");
const text = (value) => String(value ?? "").trim();
const permiteAsignarContenedor = (operacion, servicios = []) => {
  const descripcion =
    operacion?.tipo_servicio ||
    servicios.find((servicio) => String(servicio.id_tipo_servicio) === String(operacion?.id_tipo_servicio))?.descripcion ||
    "";
  const tipo = String(descripcion).trim().toLowerCase();
  return tipo === "maritimo" || tipo === "terrestre";
};
const operacionCerrada = (asignacion) =>
  String(asignacion?.estado_operacion || "").trim().toLowerCase() === "cerrado";
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
const toDateInputValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const calcularSiguienteCodigo = (operaciones) => {
  const anio = String(new Date().getFullYear());
  const correlativos = operaciones
    .map((operacion) => String(operacion.codigo_operacion || ""))
    .filter((codigo) => codigo.startsWith(anio))
    .map((codigo) => Number(codigo.slice(anio.length)))
    .filter((correlativo) => Number.isFinite(correlativo));

  return `${anio}${Math.max(0, ...correlativos) + 1}`;
};
const normalizeOperationForm = (value) => ({
  ...opInit,
  ...(value || {}),
  porducto: value?.porducto ?? "",
  origen: value?.origen ?? "",
  destino: value?.destino ?? "",
  nro_madre: value?.nro_madre ?? "",
  nro_hijo: value?.nro_hijo ?? "",
  observacion: value?.observacion ?? "",
  lcl: Number(value?.lcl || 0) === 1,
  volumen: value?.volumen ?? "",
  peso: value?.peso ?? "",
  etd: toDateInputValue(value?.etd),
  eta: toDateInputValue(value?.eta),
  fecha_asignacion: toDateInputValue(value?.fecha_asignacion),
  cantidad: value?.cantidad ?? "",
  id_cliente: value?.id_cliente ? String(value.id_cliente) : "",
  id_proveedor: value?.id_proveedor ? String(value.id_proveedor) : "",
  id_tipo_servicio: value?.id_tipo_servicio ? String(value.id_tipo_servicio) : "",
  id_tipo_nacionalizacion: value?.id_tipo_nacionalizacion ? String(value.id_tipo_nacionalizacion) : "",
  id_estado_operacion: value?.id_estado_operacion ? String(value.id_estado_operacion) : "",
});

const Operations = () => {
  const [rows, setRows] = useState([]);
  const [containers, setContainers] = useState([]);
  const [containerAssignments, setContainerAssignments] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierRoutes, setSupplierRoutes] = useState([]);
  const [services, setServices] = useState([]);
  const [nationalizations, setNationalizations] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [form, setForm] = useState(opInit);
  const [editForm, setEditForm] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [errors, setErrors] = useState({});
  const [quickErrors, setQuickErrors] = useState({});
  const [quickClient, setQuickClient] = useState(clientInit);
  const [quickSupplier, setQuickSupplier] = useState(supplierInit);
  const [quickService, setQuickService] = useState(itemInit);
  const [quickNationalization, setQuickNationalization] = useState(itemInit);
  const [quickStatus, setQuickStatus] = useState(itemInit);
  const [quickServiceTarget, setQuickServiceTarget] = useState("operation");
  const [nextCode, setNextCode] = useState("");
  const [assignmentForm, setAssignmentForm] = useState(asignacionInit);
  const [assignmentErrors, setAssignmentErrors] = useState({});

  const request = async (url, options = {}) =>
    parse(
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

  const loadAll = useCallback(async () => {
    const [ops, cont, asg, c, p, pr, s, n, st] = await Promise.all([
      request(`${API}/operaciones`),
      request(`${API}/contenedores`),
      request(`${API}/operacion-contenedor`),
      request(`${API}/clientes`),
      request(`${API}/proveedores`),
      request(`${API}/proveedor-ruta`),
      request(`${API}/tipo-servicio`),
      request(`${API}/tipo-nacionalizacion`),
      request(`${API}/estado-operacion`),
    ]);
    setRows(Array.isArray(ops) ? ops : []);
    setContainers(Array.isArray(cont) ? cont : []);
    setContainerAssignments(Array.isArray(asg) ? asg : []);
    setClients(Array.isArray(c) ? c : []);
    setSuppliers(Array.isArray(p) ? p : []);
    setSupplierRoutes(Array.isArray(pr) ? pr : []);
    setServices(Array.isArray(s) ? s : []);
    setNationalizations(Array.isArray(n) ? n : []);
    setStatuses(Array.isArray(st) ? st : []);
  }, []);

  useEffect(() => {
    loadAll().catch((error) => {
      console.error("Error al cargar operaciones:", error);
      alert(error.message || "Error al cargar operaciones");
    });
  }, [loadAll]);

  const validateOp = (v) => {
    const e = {};
    const esLcl = Number(v.lcl) === 1 || v.lcl === true;
    if (!v.fecha_asignacion) e.fecha_asignacion = "Fecha obligatoria.";
    if (!v.id_cliente) e.id_cliente = "Selecciona un cliente.";
    if (!v.id_proveedor) e.id_proveedor = "Selecciona un proveedor.";
    if (!v.id_tipo_servicio) e.id_tipo_servicio = "Selecciona un tipo de servicio.";
    if (!text(v.porducto)) e.porducto = "Producto obligatorio.";
    if (!text(v.origen)) e.origen = "Origen obligatorio.";
    if (!text(v.destino)) e.destino = "Destino obligatorio.";
    if (esLcl && !text(v.cantidad)) e.cantidad = "Cantidad obligatoria.";
    if (esLcl && text(v.volumen) && Number.isNaN(Number(v.volumen))) e.volumen = "Volumen invalido.";
    if (esLcl && text(v.peso) && Number.isNaN(Number(v.peso))) e.peso = "Peso invalido.";
    if (!v.id_tipo_nacionalizacion) e.id_tipo_nacionalizacion = "Selecciona un tipo.";
    if (!v.omitir_validacion_estado && !v.id_estado_operacion) {
      e.id_estado_operacion = "Selecciona un estado.";
    }
    if (v.etd && v.eta && v.eta < v.etd) {
      e.eta = "La fecha de llegada ETA no puede ser anterior a la fecha de salida ETD.";
    }
    return e;
  };
  const validateClient = (v) => {
    const e = {};
    if (!text(v.razon_social)) e.razon_social = "Razon social obligatoria.";
    if (!NIT.test(String(v.nit).trim())) e.nit = "NIT invalido.";
    if (!text(v.contacto)) e.contacto = "Contacto obligatorio.";
    if (String(v.telefono || "").trim() && !PHONE.test(String(v.telefono).trim())) e.telefono = "Telefono invalido.";
    if (String(v.correo || "").trim() && !EMAIL.test(String(v.correo).trim())) e.correo = "Correo invalido.";
    return e;
  };
  const validateSupplier = (v) => {
    const e = validateClient({ ...v, razon_social: v.empresa });
    delete e.razon_social;
    if (!text(v.empresa)) e.empresa = "Empresa obligatoria.";
    if (!SUPPLIER_PHONE.test(String(v.telefono).trim())) e.telefono = "Incluye codigo de pais. Ej: +59171234567.";
    if (!EMAIL.test(String(v.correo).trim())) e.correo = "Correo invalido.";
    if (!text(v.direccion)) e.direccion = "Direccion obligatoria.";
    if (!text(v.lugar_origen)) e.lugar_origen = "Lugar de origen obligatorio.";
    if (!v.id_tipo_servicio) e.id_tipo_servicio = "Selecciona un tipo de servicio.";
    return e;
  };
  const validateItem = (v) => {
    const e = {};
    if (!text(v.descripcion)) e.descripcion = "Descripcion obligatoria.";
    return e;
  };
  const validateAssignment = (v) => {
    const e = {};
    const operacion = rows.find((row) => String(row.id_operacion) === String(v.id_operacion));
    if (!v.id_contenedor) e.id_contenedor = "Selecciona un contenedor.";
    if (!permiteAsignarContenedor(operacion, services)) {
      e.id_operacion = "Solo se puede asignar contenedor a operaciones Maritimo o Terrestre.";
    }
    if (!v.fecha_llegada_puerto) e.fecha_llegada_puerto = "Fecha de llegada al puerto obligatoria.";
    if (v.fecha_devolucion && v.fecha_devolucion < v.fecha_llegada_puerto) {
      e.fecha_devolucion = "La fecha de devolucion no puede ser menor a la fecha de llegada al puerto.";
    }
    return e;
  };

  const payload = (v) => ({
    ...v,
    lcl: Number(v.lcl) === 1 || v.lcl === true ? 1 : 0,
    porducto: text(v.porducto),
    origen: text(v.origen),
    destino: text(v.destino),
    nro_madre: text(v.nro_madre),
    nro_hijo: text(v.nro_hijo),
    observacion: text(v.observacion),
    cantidad: Number(v.lcl) === 1 || v.lcl === true ? text(v.cantidad) : "",
    volumen: Number(v.lcl) === 1 || v.lcl === true ? v.volumen || null : null,
    peso: Number(v.lcl) === 1 || v.lcl === true ? v.peso || null : null,
    id_cliente: Number(v.id_cliente),
    id_proveedor: Number(v.id_proveedor),
    id_tipo_servicio: Number(v.id_tipo_servicio),
    id_tipo_nacionalizacion: Number(v.id_tipo_nacionalizacion),
    id_estado_operacion: Number(v.id_estado_operacion),
    etd: v.etd || null,
    eta: v.eta || null,
  });

  const selected = useMemo(() => rows.find((r) => r.id_operacion === selectedId) || null, [rows, selectedId]);
  const availableContainers = useMemo(
    () =>
      containers.filter(
        (container) =>
          !containerAssignments.some(
            (assignment) =>
              String(assignment.id_contenedor) === String(container.id_contenedor) &&
              !operacionCerrada(assignment)
          )
      ),
    [containerAssignments, containers]
  );
  const filtered = useMemo(() => rows.filter((r) => [r.codigo_operacion, r.cliente, r.proveedor, r.tipo_servicio, r.porducto, r.origen, r.destino, r.cantidad, r.observacion, r.estado_operacion].some((x) => String(x || "").toLowerCase().includes(search.trim().toLowerCase()))), [rows, search]);

  const loadNextCode = async () => {
    const data = await request(`${API}/operaciones/siguiente-codigo`);
    setNextCode(data.codigo_operacion || "");
  };
  const openNew = () => {
    setEditForm(null);
    setForm(opInit);
    setErrors({});
    const codigoEstimado = calcularSiguienteCodigo(rows);
    setNextCode(codigoEstimado);
    loadNextCode().catch((error) => {
      console.error("Error al obtener siguiente codigo:", error);
      setNextCode(codigoEstimado);
    });
    modal("addOperationModal");
  };
  const openEdit = (row) => {
    if (!row) return;
    setEditForm(normalizeOperationForm(row));
    setErrors({});
    modal("editOperationModal");
  };
  const openDelete = (row) => { if (row) { setToDelete(row); modal("deleteOperationModal"); } };
  const openAssignContainer = (state) => {
    if (!state?.id_operacion) return;
    if (!permiteAsignarContenedor(state, services)) return;
    setAssignmentForm({
      ...asignacionInit,
      id_operacion: String(state.id_operacion),
      fecha_llegada_puerto: state.fecha_asignacion || "",
      fecha_devolucion_limite: calcularFechaLimite(state.fecha_asignacion || ""),
    });
    setAssignmentErrors({});
    modal("assignContainerModal");
  };
  const saveAssignment = async () => {
    const e = validateAssignment(assignmentForm);
    if (Object.keys(e).length) return setAssignmentErrors(e);

    try {
      await request(`${API}/operacion-contenedor`, {
        method: "POST",
        body: JSON.stringify({
          id_contenedor: Number(assignmentForm.id_contenedor),
          id_operacion: Number(assignmentForm.id_operacion),
          fecha_llegada_puerto: assignmentForm.fecha_llegada_puerto,
          fecha_devolucion: assignmentForm.fecha_devolucion || null,
        }),
      });
      hideModal("assignContainerModal");
      setAssignmentForm(asignacionInit);
      setAssignmentErrors({});
    } catch (error) {
      alert(error.message || "Error al asignar contenedor");
    }
  };

  const saveNew = async () => {
    const e = validateOp({ ...form, omitir_validacion_estado: true });
    if (Object.keys(e).length) return setErrors(e);
    try { await request(`${API}/operaciones`, { method: "POST", body: JSON.stringify(payload(form)) }); await loadAll(); hideModal("addOperationModal"); } catch (error) { alert(error.message); }
  };
  const saveEdit = async () => {
    const e = validateOp(editForm || opInit);
    if (Object.keys(e).length) return setErrors(e);
    try { await request(`${API}/operaciones/${editForm.id_operacion}`, { method: "PUT", body: JSON.stringify(payload(editForm)) }); await loadAll(); hideModal("editOperationModal"); } catch (error) { alert(error.message); }
  };
  const remove = async () => {
    try { await request(`${API}/operaciones/${toDelete.id_operacion}`, { method: "DELETE" }); await loadAll(); hideModal("deleteOperationModal"); setSelectedId(null); } catch (error) { alert(error.message); }
  };

  const activeSetter = editForm ? setEditForm : setForm;
  const openQuick = (type) => {
    setQuickErrors({});
    if (type === "client") { setQuickClient(clientInit); return modal("quickClientModal"); }
    if (type === "supplier") { setQuickSupplier({ ...supplierInit, id_tipo_servicio: editForm?.id_tipo_servicio || form.id_tipo_servicio || "" }); return modal("quickSupplierModal"); }
    if (type === "service") { setQuickServiceTarget("operation"); setQuickService(itemInit); return modal("quickServiceModal"); }
    if (type === "service-supplier") { setQuickServiceTarget("supplier"); setQuickService(itemInit); return modal("quickServiceModal"); }
    if (type === "nationalization") { setQuickNationalization(itemInit); return modal("quickNationalizationModal"); }
    setQuickStatus(itemInit); modal("quickStatusModal");
  };

  const saveQuickClient = async () => {
    const e = validateClient(quickClient);
    if (Object.keys(e).length) return setQuickErrors(e);
    try {
      const data = await request(`${API}/clientes`, { method: "POST", body: JSON.stringify({ ...quickClient, telefono: text(quickClient.telefono), correo: text(quickClient.correo).toLowerCase(), direccion: text(quickClient.direccion), observacion: text(quickClient.observacion) }) });
      await loadAll(); activeSetter((c) => ({ ...c, id_cliente: String(data.id_cliente) })); hideModal("quickClientModal");
    } catch (error) { alert(error.message); }
  };
  const saveQuickService = async () => {
    const e = validateItem(quickService);
    if (Object.keys(e).length) return setQuickErrors(e);
    try {
      const data = await request(`${API}/tipo-servicio`, { method: "POST", body: JSON.stringify({ descripcion: text(quickService.descripcion) }) });
      await loadAll();
      if (quickServiceTarget === "supplier") setQuickSupplier((c) => ({ ...c, id_tipo_servicio: String(data.id_tipo_servicio) }));
      else activeSetter((c) => ({ ...c, id_tipo_servicio: String(data.id_tipo_servicio) }));
      hideModal("quickServiceModal");
    } catch (error) { alert(error.message); }
  };
  const saveQuickSupplier = async () => {
    const e = validateSupplier(quickSupplier);
    if (Object.keys(e).length) return setQuickErrors(e);
    try {
      const data = await request(`${API}/proveedores`, { method: "POST", body: JSON.stringify({ ...quickSupplier, telefono: text(quickSupplier.telefono), correo: text(quickSupplier.correo).toLowerCase(), id_tipo_servicio: Number(quickSupplier.id_tipo_servicio) }) });
      await loadAll(); activeSetter((c) => ({ ...c, id_proveedor: String(data.id_proveedor) })); hideModal("quickSupplierModal");
    } catch (error) { alert(error.message); }
  };
  const saveQuickNationalization = async () => {
    const e = validateItem(quickNationalization);
    if (Object.keys(e).length) return setQuickErrors(e);
    try {
      const data = await request(`${API}/tipo-nacionalizacion`, { method: "POST", body: JSON.stringify({ descripcion: text(quickNationalization.descripcion) }) });
      await loadAll(); activeSetter((c) => ({ ...c, id_tipo_nacionalizacion: String(data.id_tipo_nacionalizacion) })); hideModal("quickNationalizationModal");
    } catch (error) { alert(error.message); }
  };
  const saveQuickStatus = async () => {
    const e = validateItem(quickStatus);
    if (Object.keys(e).length) return setQuickErrors(e);
    try {
      const data = await request(`${API}/estado-operacion`, { method: "POST", body: JSON.stringify({ descripcion: text(quickStatus.descripcion) }) });
      await loadAll(); activeSetter((c) => ({ ...c, id_estado_operacion: String(data.id_estado_operacion) })); hideModal("quickStatusModal");
    } catch (error) { alert(error.message); }
  };

  const field = (state, setter, name, label, type = "text", errs = errors) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <input type={type} className={`form-control ${errs[name] ? "is-invalid" : ""}`} value={state[name] || ""} onChange={(e) => setter({ ...state, [name]: e.target.value })} />
      {errs[name] ? <div className="invalid-feedback">{errs[name]}</div> : null}
    </div>
  );
  const textareaField = (state, setter, name, label, errs = errors) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <textarea className={`form-control ${errs[name] ? "is-invalid" : ""}`} rows="3" value={state[name] || ""} onChange={(e) => setter({ ...state, [name]: e.target.value })} />
      {errs[name] ? <div className="invalid-feedback">{errs[name]}</div> : null}
    </div>
  );
  const checkboxField = (state, setter, name, label) => (
    <div className="form-check mb-3">
      <input
        id={`${name}-${state.id_operacion || "new"}`}
        type="checkbox"
        className="form-check-input"
        checked={Number(state[name]) === 1 || state[name] === true}
        onChange={(e) =>
          setter({
            ...state,
            [name]: e.target.checked,
            ...(e.target.checked ? {} : { cantidad: "", volumen: "", peso: "" }),
          })
        }
      />
      <label className="form-check-label" htmlFor={`${name}-${state.id_operacion || "new"}`}>
        {label}
      </label>
    </div>
  );
  const selectField = (state, setter, name, label, list, idKey, textKey, quickType, errs = errors) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <div className="d-flex gap-2 align-items-start">
        <select className={`form-select ${errs[name] ? "is-invalid" : ""}`} value={state[name] || ""} onChange={(e) => setter({ ...state, [name]: e.target.value })}>
          <option value="">Seleccionar</option>
          {list.map((item) => <option key={item[idKey]} value={item[idKey]}>{item[textKey]}</option>)}
        </select>
        <button type="button" className="btn btn-outline-primary quick-add-button" onClick={() => openQuick(quickType)} title={`Crear ${label}`} aria-label={`Crear ${label}`}>
          <i className={quickIcons[quickType]} aria-hidden="true" />
        </button>
      </div>
      {errs[name] ? <div className="invalid-feedback d-block">{errs[name]}</div> : null}
    </div>
  );
  const routeKey = (route) => `${route.origen}|||${route.destino}`;
  const currentRouteKey = (state) => {
    const match = supplierRoutes.find(
      (route) =>
        String(route.id_proveedor) === String(state.id_proveedor) &&
        String(route.origen || "").trim().toLowerCase() === String(state.origen || "").trim().toLowerCase() &&
        String(route.destino || "").trim().toLowerCase() === String(state.destino || "").trim().toLowerCase()
    );

    return match ? routeKey(match) : "";
  };
  const supplierRouteField = (state, setter) => {
    const routes = supplierRoutes.filter(
      (route) => String(route.id_proveedor) === String(state.id_proveedor)
    );

    return (
      <div className="mb-3">
        <label className="form-label">Rutas sugeridas del proveedor</label>
        <select
          className="form-select"
          value={currentRouteKey(state)}
          onChange={(e) => {
            const selectedRoute = routes.find((route) => routeKey(route) === e.target.value);
            if (!selectedRoute) return;
            setter({
              ...state,
              origen: selectedRoute.origen,
              destino: selectedRoute.destino,
            });
          }}
          disabled={!state.id_proveedor || routes.length === 0}
        >
          <option value="">
            {state.id_proveedor
              ? "Seleccionar ruta sugerida"
              : "Selecciona un proveedor primero"}
          </option>
          {routes.map((route) => (
            <option key={`${route.id_proveedor}-${route.id_ruta}`} value={routeKey(route)}>
              {route.origen} - {route.destino}
            </option>
          ))}
        </select>
        {state.id_proveedor && routes.length === 0 ? (
          <small className="text-muted">
            Este proveedor aun no tiene rutas registradas. Al guardar, se creara la ruta ingresada.
          </small>
        ) : (
          <small className="text-muted">
            Si escribes un origen y destino distinto, se guardara como nueva ruta del proveedor.
          </small>
        )}
      </div>
    );
  };
  const estadoAsignado = useMemo(
    () => statuses.find((status) => String(status.descripcion || "").trim().toLowerCase() === "asignado") || null,
    [statuses]
  );
  const opForm = (state, setter, { isNew = false } = {}) => (
    <form><div className="row g-3">
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label">Codigo de operacion</label>
          <input className="form-control" value={state.id_operacion ? state.codigo_operacion || "" : nextCode} readOnly disabled />
        </div>
      </div>
      <div className="col-md-6">{field(state, setter, "fecha_asignacion", "Fecha de asignacion", "date")}</div>
      <div className="col-md-6">{selectField(state, setter, "id_cliente", "Cliente", clients, "id_cliente", "razon_social", "client")}</div>
      <div className="col-md-6">{selectField(state, setter, "id_proveedor", "Proveedor", suppliers, "id_proveedor", "empresa", "supplier")}</div>
      <div className="col-12">{supplierRouteField(state, setter)}</div>
      <div className="col-md-6">{selectField(state, setter, "id_tipo_servicio", "Tipo de servicio", services, "id_tipo_servicio", "descripcion", "service")}</div>
      <div className="col-md-6">{field(state, setter, "porducto", "Producto")}</div>
      <div className="col-md-6">{field(state, setter, "origen", "Origen")}</div>
      <div className="col-md-6">{field(state, setter, "destino", "Destino")}</div>
      <div className="col-12">{checkboxField(state, setter, "lcl", "LCL (Low Container Loaded)")}</div>
      {(Number(state.lcl) === 1 || state.lcl === true) ? (
        <>
          <div className="col-md-4">{field(state, setter, "cantidad", "Cantidad")}</div>
          <div className="col-md-4">{field(state, setter, "volumen", "Volumen", "number")}</div>
          <div className="col-md-4">{field(state, setter, "peso", "Peso", "number")}</div>
        </>
      ) : null}
      <div className="col-md-6">{field(state, setter, "nro_madre", "Nro. madre")}</div>
      <div className="col-md-6">{field(state, setter, "nro_hijo", "Nro. hijo")}</div>
      <div className="col-12">{textareaField(state, setter, "observacion", "Observaciones")}</div>
      <div className="col-md-4">{field(state, setter, "etd", "ETD", "date")}</div>
      <div className="col-md-4">{field(state, setter, "eta", "ETA", "date")}</div>
      <div className="col-md-4">{selectField(state, setter, "id_tipo_nacionalizacion", "Tipo de nacionalizacion", nationalizations, "id_tipo_nacionalizacion", "descripcion", "nationalization")}</div>
      <div className="col-12">
        {isNew ? (
          <div className="mb-3">
            <label className="form-label">Estado de operacion</label>
            <input className="form-control" value={estadoAsignado?.descripcion || "Asignado"} readOnly disabled />
          </div>
        ) : (
          selectField(state, setter, "id_estado_operacion", "Estado de operacion", statuses, "id_estado_operacion", "descripcion", "status")
        )}
      </div>
      {!(Number(state.lcl) === 1 || state.lcl === true) && permiteAsignarContenedor(state, services) ? (
        <div className="col-12">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => openAssignContainer(state)}
            disabled={!state.id_operacion}
          >
            Asignar contenedor
          </button>
          {!state.id_operacion ? (
            <small className="text-muted ms-2">Guarda la operacion para asignar contenedores.</small>
          ) : null}
        </div>
      ) : null}
      {!(Number(state.lcl) === 1 || state.lcl === true) && !permiteAsignarContenedor(state, services) ? (
        <div className="col-12">
          <small className="text-muted">La asignacion de contenedores solo aplica para servicios Maritimo o Terrestre.</small>
        </div>
      ) : null}
    </div></form>
  );

  return (
    <>
      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Operaciones</h1>
          <small className="text-muted">{selected ? <>Seleccionado: <strong>{selected.codigo_operacion}</strong></> : "Selecciona una operacion para Editar o Eliminar"}</small>
        </div>
        <div className="ui-card mb-3"><div className="d-flex flex-wrap gap-2"><button className="btn btn-orange" type="button" onClick={openNew}>Nuevo</button><button className="btn btn-primary" type="button" onClick={() => openEdit(selected)} disabled={!selected}>Editar</button><button className="btn btn-danger" type="button" onClick={() => openDelete(selected)} disabled={!selected}>Eliminar</button></div></div>
        <div className="ui-card mb-3"><div className="row g-2 align-items-end"><div className="col-md-9"><label className="form-label">Buscar</label><input className="form-control" placeholder="Codigo, cliente, proveedor, servicio, producto, origen, destino..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="col-md-3 d-flex gap-2"><button className="btn btn-secondary w-100" type="button" onClick={() => setSearch("")}>Limpiar</button></div></div></div>
        <div className="table-responsive ui-card"><table className="table table-hover table-bordered align-middle m-0"><thead className="table-light"><tr><th style={{ width: 48 }} className="text-center">#</th><th>Codigo</th><th>Fecha de asignación</th><th>Cliente</th><th>Proveedor</th><th>Servicio</th><th>Producto</th><th>Origen</th><th>Destino</th><th>LCL</th><th>Cantidad</th><th>Volumen</th><th>Peso</th><th>Nro. madre</th><th>Nro. hijo</th><th>Observaciones</th><th>ETD</th><th>ETA</th><th>Nacionalización</th><th>Estado</th><th>Registro</th></tr></thead><tbody>{filtered.map((r, i) => <tr key={r.id_operacion} className={r.id_operacion === selectedId ? "row-selected" : ""} onClick={() => setSelectedId(r.id_operacion)} style={{ cursor: "pointer" }}><td className="text-center">{i + 1}</td><td>{r.codigo_operacion}</td><td>{fmtDate(r.fecha_asignacion)}</td><td>{r.cliente}</td><td>{r.proveedor}</td><td>{r.tipo_servicio}</td><td>{r.porducto}</td><td>{r.origen}</td><td>{r.destino}</td><td>{Number(r.lcl) === 1 ? "Si" : "No"}</td><td>{r.cantidad || "-"}</td><td>{r.volumen ?? "-"}</td><td>{r.peso ?? "-"}</td><td>{r.nro_madre || "-"}</td><td>{r.nro_hijo || "-"}</td><td>{r.observacion || "-"}</td><td>{fmtDate(r.etd)}</td><td>{fmtDate(r.eta)}</td><td>{r.tipo_nacionalizacion}</td><td>{r.estado_operacion}</td><td>{fmtDateTime(r.fecha_registro)}</td></tr>)}{filtered.length === 0 ? <tr><td colSpan={21} className="text-center py-4 text-muted">No hay operaciones activas con los filtros actuales.</td></tr> : null}</tbody></table></div>
      </div>

      <div className="modal fade" id="addOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-xl"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Nueva operacion</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{opForm(form, setForm, { isNew: true })}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveNew}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="editOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-xl"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Editar operacion</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{editForm ? opForm(editForm, setEditForm) : null}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-primary" onClick={saveEdit}>Guardar cambios</button></div></div></div></div>
      <div className="modal fade" id="assignContainerModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Asignar contenedor</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">
        <div className="mb-3">
          <label className="form-label">Contenedor</label>
          <select className={`form-select ${assignmentErrors.id_contenedor ? "is-invalid" : ""}`} value={assignmentForm.id_contenedor} onChange={(e) => setAssignmentForm({ ...assignmentForm, id_contenedor: e.target.value })}>
            <option value="">Seleccionar</option>
            {availableContainers.map((container) => (
              <option key={container.id_contenedor} value={container.id_contenedor}>{container.numero_contenedor} - {container.tipo_contenedor || "Sin tipo"}</option>
            ))}
          </select>
          {assignmentErrors.id_contenedor ? <div className="invalid-feedback">{assignmentErrors.id_contenedor}</div> : null}
        </div>
        <div className="mb-3">
          <label className="form-label">Fecha de llegada al puerto</label>
          <input type="date" className={`form-control ${assignmentErrors.fecha_llegada_puerto ? "is-invalid" : ""}`} value={assignmentForm.fecha_llegada_puerto} onChange={(e) => setAssignmentForm({ ...assignmentForm, fecha_llegada_puerto: e.target.value, fecha_devolucion_limite: calcularFechaLimite(e.target.value) })} />
          {assignmentErrors.fecha_llegada_puerto ? <div className="invalid-feedback">{assignmentErrors.fecha_llegada_puerto}</div> : null}
        </div>
        <div className="mb-3">
          <label className="form-label">Fecha de devolucion limite</label>
          <input type="date" className="form-control" value={calcularFechaLimite(assignmentForm.fecha_llegada_puerto)} readOnly disabled />
        </div>
        <div className="mb-3">
          <label className="form-label">Fecha de devolucion</label>
          <input type="date" className={`form-control ${assignmentErrors.fecha_devolucion ? "is-invalid" : ""}`} value={assignmentForm.fecha_devolucion} onChange={(e) => setAssignmentForm({ ...assignmentForm, fecha_devolucion: e.target.value })} />
          {assignmentErrors.fecha_devolucion ? <div className="invalid-feedback">{assignmentErrors.fecha_devolucion}</div> : null}
          {mensajeDemora(
            assignmentForm.fecha_devolucion,
            calcularFechaLimite(assignmentForm.fecha_llegada_puerto)
          ) ? (
            <small className="text-muted">
              {mensajeDemora(
                assignmentForm.fecha_devolucion,
                calcularFechaLimite(assignmentForm.fecha_llegada_puerto)
              )}
            </small>
          ) : null}
        </div>
      </div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveAssignment}>Guardar asignacion</button></div></div></div></div>
      <div className="modal fade" id="deleteOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Eliminar operacion</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{toDelete ? <p>Seguro que deseas desactivar la operacion <strong>{toDelete.codigo_operacion}</strong>?</p> : null}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-danger" onClick={remove}>Eliminar</button></div></div></div></div>
      <div className="modal fade" id="quickClientModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear cliente rapido</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickClient, setQuickClient, "razon_social", "Razon social", "text", quickErrors)}{field(quickClient, setQuickClient, "nit", "NIT", "text", quickErrors)}{field(quickClient, setQuickClient, "contacto", "Contacto", "text", quickErrors)}{field(quickClient, setQuickClient, "telefono", "Telefono", "text", quickErrors)}{field(quickClient, setQuickClient, "correo", "Correo", "email", quickErrors)}{field(quickClient, setQuickClient, "direccion", "Direccion", "text", quickErrors)}<div className="mb-3"><label className="form-label">Observacion</label><textarea className="form-control" rows="3" value={quickClient.observacion} onChange={(e) => setQuickClient({ ...quickClient, observacion: e.target.value })} /></div></div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveQuickClient}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="quickServiceModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear tipo de servicio rapido</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickService, setQuickService, "descripcion", "Descripcion", "text", quickErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={() => saveQuickService()}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="quickSupplierModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear proveedor rapido</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickSupplier, setQuickSupplier, "empresa", "Empresa", "text", quickErrors)}{field(quickSupplier, setQuickSupplier, "nit", "NIT", "text", quickErrors)}{field(quickSupplier, setQuickSupplier, "contacto", "Contacto", "text", quickErrors)}{field(quickSupplier, setQuickSupplier, "telefono", "Telefono internacional", "tel", quickErrors)}{field(quickSupplier, setQuickSupplier, "correo", "Correo", "email", quickErrors)}{field(quickSupplier, setQuickSupplier, "direccion", "Direccion", "text", quickErrors)}{field(quickSupplier, setQuickSupplier, "lugar_origen", "Lugar de origen", "text", quickErrors)}{selectField(quickSupplier, setQuickSupplier, "id_tipo_servicio", "Tipo de servicio", services, "id_tipo_servicio", "descripcion", "service-supplier", quickErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveQuickSupplier}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="quickNationalizationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear tipo de nacionalizacion rapido</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickNationalization, setQuickNationalization, "descripcion", "Descripcion", "text", quickErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveQuickNationalization}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="quickStatusModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear estado de operacion rapido</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickStatus, setQuickStatus, "descripcion", "Descripcion", "text", quickErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveQuickStatus}>Guardar</button></div></div></div></div>
    </>
  );
};

export default Operations;
