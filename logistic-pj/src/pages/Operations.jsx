import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";
import ContainerFormFields from "../components/ContainerFormFields";
import "../styles/operations.css";

const API = "http://localhost:3001/api";
const fechaHoyInput = () => {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const crearOperacionInicial = () => ({ fecha_asignacion: fechaHoyInput(), id_cliente: "", id_proveedor: "", id_tipo_servicio: "", porducto: "", origen: "", destino: "", lcl: false, cantidad: "", volumen: "", peso: "", nro_madre: "", nro_hijo: "", observacion: "", etd: "", eta: "", id_tipo_nacionalizacion: "", id_estado_operacion: "" });
const opInit = crearOperacionInicial();
const asignacionInit = { id_contenedor: "", id_operacion: "", fecha_llegada_puerto: "", fecha_devolucion_limite: "", fecha_devolucion: "" };
const contenedorInit = { numero_contenedor: "", id_tipo_contenedor: "", naviera: "", peso_bruto: "" };
const movimientoInit = { id_operacion: "", id_tipo_costo: "", id_moneda: "", monto: "", observacion: "" };
const documentoInit = { id_tipo_documento: "", id_operacion: "", numero_documento: "", fecha_documento: "", ruta_documento: "", descripcion: "", archivo_nombre: "", archivo_base64: "" };
const clientInit = { razon_social: "", nit: "", contacto: "", telefono: "", correo: "", direccion: "", observacion: "" };
const supplierInit = { empresa: "", nit: "", contacto: "", telefono: "", correo: "", direccion: "", lugar_origen: "", id_tipo_servicio: "" };
const itemInit = { descripcion: "" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIT = /^\d{5,12}$/;
const PHONE = /^[67]\d{7}$/;
const SUPPLIER_PHONE = /^\+\d{8,15}$/;
const EXTENSIONES_DOCUMENTO_PERMITIDAS = [".doc", ".docx", ".xls", ".xlsx", ".pdf", ".jpg", ".jpeg", ".png"];
const ACCEPT_DOCUMENTOS = EXTENSIONES_DOCUMENTO_PERMITIDAS.join(",");
const MENSAJE_ARCHIVO_INVALIDO = "Solo se permiten archivos Word, Excel, PDF o imagenes.";
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
const onlyDigits = (value) => String(value || "").replace(/\D/g, "");
const obtenerNombreDocumento = (ruta = "") => {
  const partes = String(ruta || "").split(/[\\/]/);
  const nombre = partes[partes.length - 1] || "";
  try {
    return decodeURIComponent(nombre).replace(/^\d+[_-]+/, "");
  } catch {
    return nombre.replace(/^\d+[_-]+/, "");
  }
};
const obtenerExtensionArchivo = (nombre = "") => {
  const limpio = String(nombre || "").toLowerCase().split("?")[0].split("#")[0];
  const indice = limpio.lastIndexOf(".");
  return indice >= 0 ? limpio.slice(indice) : "";
};
const esArchivoPermitido = (nombre = "") => EXTENSIONES_DOCUMENTO_PERMITIDAS.includes(obtenerExtensionArchivo(nombre));
const permiteAsignarContenedor = (operacion, servicios = [], estados = []) => {
  const descripcion =
    servicios.find((servicio) => String(servicio.id_tipo_servicio) === String(operacion?.id_tipo_servicio))?.descripcion ||
    operacion?.tipo_servicio ||
    "";
  const tipo = String(descripcion).trim().toLowerCase();
  const estadoOperacion = String(
    estados.find((estado) => String(estado.id_estado_operacion) === String(operacion?.id_estado_operacion))?.descripcion ||
    operacion?.estado_operacion ||
    ""
  ).trim().toLowerCase();
  const esLcl = Number(operacion?.lcl) === 1 || operacion?.lcl === true;
  return !esLcl &&
    estadoOperacion !== "cerrado" &&
    (tipo === "maritimo" || tipo === "terrestre" || tipo === "bimodal");
};
const obtenerTipoServicioOperacion = (operacion, servicios = []) => {
  const descripcion =
    servicios.find((servicio) => String(servicio.id_tipo_servicio) === String(operacion?.id_tipo_servicio))?.descripcion ||
    operacion?.tipo_servicio ||
    "";
  return String(descripcion).trim().toLowerCase();
};
const obtenerEtiquetasDocumentoTransporte = (operacion, servicios = []) => {
  const tipo = obtenerTipoServicioOperacion(operacion, servicios);

  if (tipo === "maritimo" || tipo === "bimodal") {
    return {
      madre: "MBL (Master Bill of Lading)",
      hijo: "HBL (House Bill of Lading)",
      mostrarHijo: true,
    };
  }

  if (tipo === "aereo") {
    return {
      madre: "AWBL (Air Way Bill)",
      hijo: "",
      mostrarHijo: false,
    };
  }

  if (tipo === "terrestre") {
    return {
      madre: "CRT (Carta porte)",
      hijo: "",
      mostrarHijo: false,
    };
  }

  return {
    madre: "Nro. madre",
    hijo: "Nro. hijo",
    mostrarHijo: true,
  };
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
const etaOperacion = (operacion) => toDateInputValue(operacion?.eta);
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
  const [containerTypes, setContainerTypes] = useState([]);
  const [operationCosts, setOperationCosts] = useState([]);
  const [operationSales, setOperationSales] = useState([]);
  const [operationDocuments, setOperationDocuments] = useState([]);
  const [tiposCosto, setTiposCosto] = useState([]);
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierRoutes, setSupplierRoutes] = useState([]);
  const [services, setServices] = useState([]);
  const [nationalizations, setNationalizations] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [form, setForm] = useState(() => crearOperacionInicial());
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
  const [assignmentContext, setAssignmentContext] = useState("existing");
  const [assignmentMode, setAssignmentMode] = useState("create");
  const [pendingContainerAssignments, setPendingContainerAssignments] = useState([]);
  const [quickContainer, setQuickContainer] = useState(contenedorInit);
  const [quickContainerErrors, setQuickContainerErrors] = useState({});
  const [quickContainerType, setQuickContainerType] = useState(itemInit);
  const [pendingOperationCosts, setPendingOperationCosts] = useState([]);
  const [pendingOperationSales, setPendingOperationSales] = useState([]);
  const [pendingOperationDocuments, setPendingOperationDocuments] = useState([]);
  const [costForm, setCostForm] = useState(movimientoInit);
  const [saleForm, setSaleForm] = useState(movimientoInit);
  const [documentForm, setDocumentForm] = useState(documentoInit);
  const [costErrors, setCostErrors] = useState({});
  const [saleErrors, setSaleErrors] = useState({});
  const [documentErrors, setDocumentErrors] = useState({});
  const [costMode, setCostMode] = useState("create");
  const [saleMode, setSaleMode] = useState("create");
  const [documentMode, setDocumentMode] = useState("create");
  const [documentFileInputKey, setDocumentFileInputKey] = useState(0);
  const [movementView, setMovementView] = useState("costs");
  const [savingOperation, setSavingOperation] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingQuickContainer, setSavingQuickContainer] = useState(false);

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

  const leerArchivoComoBase64 = (archivo) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(archivo);
    });

  const loadAll = useCallback(async () => {
    const [ops, cont, asg, cty, costsData, salesData, docsData, tc, td, mon, c, p, pr, s, n, st] = await Promise.all([
      request(`${API}/operaciones`),
      request(`${API}/contenedores`),
      request(`${API}/operacion-contenedor`),
      request(`${API}/tipo-contenedor`),
      request(`${API}/costo-operacion`),
      request(`${API}/venta-operacion`),
      request(`${API}/documento`),
      request(`${API}/tipo-costo`),
      request(`${API}/tipo-documento`),
      request(`${API}/moneda`),
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
    setContainerTypes(Array.isArray(cty) ? cty : []);
    setOperationCosts(Array.isArray(costsData) ? costsData : []);
    setOperationSales(Array.isArray(salesData) ? salesData : []);
    setOperationDocuments(Array.isArray(docsData) ? docsData : []);
    setTiposCosto(Array.isArray(tc) ? tc : []);
    setTiposDocumento(Array.isArray(td) ? td : []);
    setMonedas(Array.isArray(mon) ? mon : []);
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
    if (v.fecha_asignacion && v.etd && v.etd < v.fecha_asignacion) {
      e.etd = "La fecha de salida ETD no puede ser anterior a la fecha de asignacion.";
    }
    if (v.fecha_asignacion && v.eta && v.eta < v.fecha_asignacion) {
      e.eta = "La fecha de llegada ETA no puede ser anterior a la fecha de asignacion.";
    }
    if (v.etd && v.eta && v.eta < v.etd) {
      e.eta = "La fecha de llegada ETA no puede ser anterior a la fecha de salida ETD.";
    }
    return e;
  };
  const validateClient = (v) => {
    const e = {};
    const nit = String(v.nit || "").trim();

    if (!text(v.razon_social)) e.razon_social = "Razon social obligatoria.";
    if (!NIT.test(nit)) {
      e.nit = "El NIT debe tener entre 5 y 12 digitos, solo numeros.";
    } else if (
      clients.some((client) => String(client.nit || "").trim() === nit)
    ) {
      e.nit = "Ya existe un cliente registrado con ese NIT.";
    }
    if (!text(v.contacto)) e.contacto = "Contacto obligatorio.";
    if (String(v.telefono || "").trim() && !PHONE.test(String(v.telefono).trim())) e.telefono = "Telefono invalido.";
    if (String(v.correo || "").trim() && !EMAIL.test(String(v.correo).trim())) e.correo = "Correo invalido.";
    return e;
  };
  const validateSupplier = (v) => {
    const e = {};
    const nit = String(v.nit || "").trim();

    if (!text(v.empresa)) e.empresa = "Empresa obligatoria.";
    if (!NIT.test(nit)) {
      e.nit = "El NIT debe tener entre 5 y 12 digitos, solo numeros.";
    } else if (
      suppliers.some((supplier) => String(supplier.nit || "").trim() === nit)
    ) {
      e.nit = "Ya existe un proveedor registrado con ese NIT.";
    }
    if (!text(v.contacto)) e.contacto = "Contacto obligatorio.";
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
  const validateQuickContainer = (contenedor) => {
    const e = {};
    if (!text(contenedor.numero_contenedor)) {
      e.numero_contenedor = "El numero de contenedor es obligatorio.";
    } else if (text(contenedor.numero_contenedor).length > 70) {
      e.numero_contenedor = "El numero de contenedor no puede superar 70 caracteres.";
    } else {
      const numeroNormalizado = text(contenedor.numero_contenedor).toUpperCase();
      const duplicado = containers.some(
        (item) => text(item.numero_contenedor).toUpperCase() === numeroNormalizado
      );
      if (duplicado) e.numero_contenedor = "Ya existe un contenedor registrado con ese numero.";
    }

    if (!contenedor.id_tipo_contenedor) e.id_tipo_contenedor = "Selecciona el tipo de contenedor.";
    if (text(contenedor.naviera).length > 50) e.naviera = "La naviera no puede superar 50 caracteres.";
    if (contenedor.peso_bruto !== "" && Number.isNaN(Number(contenedor.peso_bruto))) e.peso_bruto = "El peso bruto debe ser numerico.";
    return e;
  };
  const obtenerOperacionAsignacion = (assignment = assignmentForm) => {
    if (assignmentContext === "new") return form;
    if (assignmentContext === "edit-pending") return editForm;
    if (!assignment.id_operacion) return null;

    return rows.find((row) => String(row.id_operacion) === String(assignment.id_operacion)) || null;
  };
  const validateAssignment = (v) => {
    const e = {};
    const operacion = obtenerOperacionAsignacion(v);
    if (!v.id_contenedor) e.id_contenedor = "Selecciona un contenedor.";
    if (!v.id_operacion && assignmentContext !== "new" && assignmentContext !== "edit-pending") {
      e.id_operacion = "Selecciona una operacion.";
    }
    if (!permiteAsignarContenedor(operacion, services, statuses)) {
      e.id_operacion = "Solo se puede asignar contenedor a operaciones no LCL, no cerradas, con servicio Maritimo, Terrestre o Bimodal.";
    }
    if (!etaOperacion(operacion)) {
      e.fecha_llegada_puerto = "Completa la ETA de la operacion para asignar un contenedor.";
    } else if (!v.fecha_llegada_puerto) {
      e.fecha_llegada_puerto = "Fecha de llegada al puerto obligatoria.";
    }
    if (v.fecha_devolucion && v.fecha_devolucion < v.fecha_llegada_puerto) {
      e.fecha_devolucion = "La fecha de devolucion no puede ser menor a la fecha de llegada al puerto.";
    }
    const yaPendiente = pendingContainerAssignments.some(
      (assignment) =>
        String(assignment.id_contenedor) === String(v.id_contenedor) &&
        (!v.tempId || assignment.tempId !== v.tempId)
    );
    if (yaPendiente) {
      e.id_contenedor = "Ese contenedor ya esta agregado a esta operacion.";
    }
    return e;
  };
  const validateMovimiento = (v) => {
    const e = {};
    if (!v.id_operacion) e.id_operacion = "Selecciona una operacion.";
    if (!v.id_tipo_costo) e.id_tipo_costo = "Selecciona un tipo de costo.";
    if (!v.id_moneda) e.id_moneda = "Selecciona una moneda.";
    if (v.monto === "" || Number.isNaN(Number(v.monto)) || Number(v.monto) < 0) {
      e.monto = "Ingresa un monto valido.";
    }
    return e;
  };
  const movimientosDeOperacion = (items, movimiento, esPendiente) =>
    items.filter((item) =>
      esPendiente
        ? true
        : String(item.id_operacion) === String(movimiento.id_operacion)
    );

  const validarCostoOperacion = (costo, modo) => {
    const esPendiente = modo === "create-pending" || modo === "edit-pending";
    const e = validateMovimiento(esPendiente ? { ...costo, id_operacion: "pendiente" } : costo);
    const costosBase = esPendiente
      ? pendingOperationCosts
      : movimientosDeOperacion(operationCosts, costo, false);
    const ventasBase = esPendiente
      ? pendingOperationSales
      : movimientosDeOperacion(operationSales, costo, false);

    const costoExistente = costosBase.find(
      (item) =>
        String(item.id_tipo_costo) === String(costo.id_tipo_costo) &&
        (esPendiente
          ? item.tempId !== costo.tempId
          : String(item.id_costo) !== String(costo.id_costo || ""))
    );

    if (!e.id_tipo_costo && costoExistente) {
      e.id_tipo_costo = "Ya existe un costo con ese tipo de costo para esta operacion.";
    }

    const ventaExistente = ventasBase.find(
      (item) => String(item.id_tipo_costo) === String(costo.id_tipo_costo)
    );

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

  const validarVentaOperacion = (venta, modo) => {
    const esPendiente = modo === "create-pending" || modo === "edit-pending";
    const e = validateMovimiento(esPendiente ? { ...venta, id_operacion: "pendiente" } : venta);
    const ventasBase = esPendiente
      ? pendingOperationSales
      : movimientosDeOperacion(operationSales, venta, false);
    const costosBase = esPendiente
      ? pendingOperationCosts
      : movimientosDeOperacion(operationCosts, venta, false);

    const ventaExistente = ventasBase.find(
      (item) =>
        String(item.id_tipo_costo) === String(venta.id_tipo_costo) &&
        (esPendiente
          ? item.tempId !== venta.tempId
          : String(item.id_venta) !== String(venta.id_venta || ""))
    );

    if (!e.id_tipo_costo && ventaExistente) {
      e.id_tipo_costo = "Ya existe una venta con ese tipo de costo para esta operacion.";
    }

    const costoExistente = costosBase.find(
      (item) => String(item.id_tipo_costo) === String(venta.id_tipo_costo)
    );

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
  const validateDocumento = (v, isPending = false) => {
    const e = {};
    if (!v.id_tipo_documento) e.id_tipo_documento = "Selecciona un tipo de documento.";
    if (!isPending && !v.id_operacion) e.id_operacion = "Selecciona una operacion.";
    if (!text(v.numero_documento)) e.numero_documento = "El numero de documento es obligatorio.";
    else if (text(v.numero_documento).length > 50) e.numero_documento = "El numero de documento no puede superar 50 caracteres.";
    if (!v.fecha_documento) e.fecha_documento = "La fecha del documento es obligatoria.";
    if (!text(v.ruta_documento) && !v.archivo_base64) e.ruta_documento = "Selecciona un archivo.";
    if (v.archivo_nombre && !esArchivoPermitido(v.archivo_nombre)) e.ruta_documento = MENSAJE_ARCHIVO_INVALIDO;
    if (!text(v.descripcion)) e.descripcion = "La descripcion es obligatoria.";
    else if (text(v.descripcion).length > 50) e.descripcion = "La descripcion no puede superar 50 caracteres.";
    return e;
  };

  const payload = (v) => ({
    ...v,
    lcl: Number(v.lcl) === 1 || v.lcl === true ? 1 : 0,
    porducto: text(v.porducto),
    origen: text(v.origen),
    destino: text(v.destino),
    nro_madre: text(v.nro_madre),
    nro_hijo: obtenerEtiquetasDocumentoTransporte(v, services).mostrarHijo ? text(v.nro_hijo) : "",
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
  const movimientoPayload = (v) => ({
    id_operacion: Number(v.id_operacion),
    id_tipo_costo: Number(v.id_tipo_costo),
    id_moneda: Number(v.id_moneda),
    monto: Number(v.monto),
    observacion: text(v.observacion),
  });
  const documentoPayload = (v) => ({
    id_tipo_documento: Number(v.id_tipo_documento),
    id_operacion: Number(v.id_operacion),
    numero_documento: text(v.numero_documento),
    fecha_documento: v.fecha_documento,
    ruta_documento: text(v.ruta_documento),
    descripcion: text(v.descripcion),
    archivo_nombre: v.archivo_nombre || null,
    archivo_base64: v.archivo_base64 || null,
  });

  const selected = useMemo(() => rows.find((r) => r.id_operacion === selectedId) || null, [rows, selectedId]);
  const availableContainers = useMemo(
    () =>
      containers.filter(
        (container) =>
          !pendingContainerAssignments.some(
            (assignment) => String(assignment.id_contenedor) === String(container.id_contenedor)
          ) &&
          !containerAssignments.some(
            (assignment) =>
              String(assignment.id_contenedor) === String(container.id_contenedor) &&
              !operacionCerrada(assignment)
          )
      ),
    [containerAssignments, containers, pendingContainerAssignments]
  );
  const filtered = useMemo(() => rows.filter((r) => [r.codigo_operacion, r.cliente, r.proveedor, r.tipo_servicio, r.porducto, r.origen, r.destino, r.cantidad, r.observacion, r.estado_operacion].some((x) => String(x || "").toLowerCase().includes(search.trim().toLowerCase()))), [rows, search]);

  const loadNextCode = async () => {
    const data = await request(`${API}/operaciones/siguiente-codigo`);
    setNextCode(data.codigo_operacion || "");
  };
  const openNew = () => {
    setEditForm(null);
    setForm(crearOperacionInicial());
    setAssignmentForm(asignacionInit);
    setAssignmentContext("new");
    setPendingContainerAssignments([]);
    setPendingOperationCosts([]);
    setPendingOperationSales([]);
    setPendingOperationDocuments([]);
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
    setAssignmentContext("existing");
    setAssignmentMode("create");
    setAssignmentForm(asignacionInit);
    setAssignmentErrors({});
    setPendingContainerAssignments([]);
    setPendingOperationDocuments([]);
    setErrors({});
    modal("editOperationModal");
  };
  const openDelete = (row) => { if (row) { setToDelete(row); modal("deleteOperationModal"); } };
  const openInfoForSelected = () => {
    if (!selected) return;
    modal("operationInfoModal");
  };
  const openCostForSelected = () => {
    if (!selected) return;
    setMovementView("costs");
    modal("operationMovementsModal");
  };
  const openSaleForSelected = () => {
    if (!selected) return;
    setMovementView("sales");
    modal("operationMovementsModal");
  };
  const openDocumentsForSelected = () => {
    if (!selected) return;
    modal("operationDocumentsModal");
  };
  const openCostForOperation = (operationState) => {
    setCostForm({ ...movimientoInit, id_operacion: operationState.id_operacion ? String(operationState.id_operacion) : "" });
    setCostErrors({});
    setCostMode(operationState.id_operacion ? "create" : "create-pending");
    modal("addCostFromOperationModal");
  };
  const openSaleForOperation = (operationState) => {
    setSaleForm({ ...movimientoInit, id_operacion: operationState.id_operacion ? String(operationState.id_operacion) : "" });
    setSaleErrors({});
    setSaleMode(operationState.id_operacion ? "create" : "create-pending");
    modal("addSaleFromOperationModal");
  };
  const buildPendingMovement = (movement, tempId = null) => {
    const tipoCosto = tiposCosto.find((tipo) => String(tipo.id_tipo_costo) === String(movement.id_tipo_costo));
    const moneda = monedas.find((item) => String(item.id_moneda) === String(movement.id_moneda));
    return {
      ...movement,
      tempId: tempId || `${movement.id_tipo_costo}-${movement.id_moneda}-${Date.now()}`,
      tipo_costo: tipoCosto?.descripcion || "",
      moneda: moneda?.descripcion || "",
      codigo_moneda: moneda?.codigo || "",
    };
  };
  const buildPendingDocument = (documento, tempId = null) => {
    const tipoDocumento = tiposDocumento.find((tipo) => String(tipo.id_tipo_documento) === String(documento.id_tipo_documento));
    return {
      ...documento,
      tempId: tempId || `${documento.id_tipo_documento}-${Date.now()}`,
      tipo_documento: tipoDocumento?.descripcion || "",
    };
  };
  const seleccionarArchivoDocumento = async (archivo) => {
    if (!archivo) return;

    if (!esArchivoPermitido(archivo.name)) {
      setDocumentForm((actual) => ({
        ...actual,
        archivo_nombre: "",
        archivo_base64: "",
      }));
      setDocumentErrors((prev) => ({ ...prev, ruta_documento: MENSAJE_ARCHIVO_INVALIDO }));
      return;
    }

    try {
      const archivoBase64 = await leerArchivoComoBase64(archivo);
      setDocumentForm((actual) => ({
        ...actual,
        archivo_nombre: archivo.name,
        archivo_base64: archivoBase64,
        ruta_documento: `/uploads/documentos/${archivo.name}`,
      }));
      setDocumentErrors((prev) => ({ ...prev, ruta_documento: undefined }));
    } catch (error) {
      alert(error.message || "No se pudo leer el archivo");
    }
  };
  const editPendingCost = (cost) => {
    setCostForm({ ...cost });
    setCostErrors({});
    setCostMode("edit-pending");
    modal("addCostFromOperationModal");
  };
  const editPendingSale = (sale) => {
    setSaleForm({ ...sale });
    setSaleErrors({});
    setSaleMode("edit-pending");
    modal("addSaleFromOperationModal");
  };
  const deletePendingCost = (tempId) => {
    setPendingOperationCosts((items) => items.filter((item) => item.tempId !== tempId));
  };
  const deletePendingSale = (tempId) => {
    setPendingOperationSales((items) => items.filter((item) => item.tempId !== tempId));
  };
  const editPendingDocument = (documento) => {
    setDocumentForm({ ...documento });
    setDocumentErrors({});
    setDocumentMode("edit-pending");
    setDocumentFileInputKey((key) => key + 1);
    modal("addDocumentFromOperationModal");
  };
  const deletePendingDocument = (tempId) => {
    setPendingOperationDocuments((items) => items.filter((item) => item.tempId !== tempId));
  };
  const editOperationCost = (cost) => {
    setCostForm({
      ...movimientoInit,
      ...cost,
      id_operacion: String(cost.id_operacion ?? ""),
      id_tipo_costo: String(cost.id_tipo_costo ?? ""),
      id_moneda: String(cost.id_moneda ?? ""),
      monto: cost.monto ?? "",
      observacion: cost.observacion || "",
    });
    setCostErrors({});
    setCostMode("edit");
    modal("addCostFromOperationModal");
  };
  const editOperationSale = (sale) => {
    setSaleForm({
      ...movimientoInit,
      ...sale,
      id_operacion: String(sale.id_operacion ?? ""),
      id_tipo_costo: String(sale.id_tipo_costo ?? ""),
      id_moneda: String(sale.id_moneda ?? ""),
      monto: sale.monto ?? "",
      observacion: sale.observacion || "",
    });
    setSaleErrors({});
    setSaleMode("edit");
    modal("addSaleFromOperationModal");
  };
  const editOperationDocument = (documento) => {
    setDocumentForm({
      ...documentoInit,
      ...documento,
      id_operacion: String(documento.id_operacion ?? ""),
      id_tipo_documento: String(documento.id_tipo_documento ?? ""),
      fecha_documento: documento.fecha_documento?.slice(0, 10) || "",
      archivo_nombre: "",
      archivo_base64: "",
    });
    setDocumentErrors({});
    setDocumentMode("edit");
    setDocumentFileInputKey((key) => key + 1);
    modal("addDocumentFromOperationModal");
  };
  const openDocumentForOperation = (operationState) => {
    setDocumentForm({ ...documentoInit, id_operacion: operationState.id_operacion ? String(operationState.id_operacion) : "" });
    setDocumentErrors({});
    setDocumentMode(operationState.id_operacion ? "create" : "create-pending");
    setDocumentFileInputKey((key) => key + 1);
    modal("addDocumentFromOperationModal");
  };
  const openAssignContainer = (state) => {
    if (!permiteAsignarContenedor(state, services, statuses)) return;
    const esOperacionNueva = !state?.id_operacion;
    const operacionGuardada = rows.find((row) => String(row.id_operacion) === String(state.id_operacion));
    const cambioServicioPendiente =
      state?.id_operacion &&
      String(state.id_tipo_servicio || "") !== String(operacionGuardada?.id_tipo_servicio || "");
    const cambioEstadoPendiente =
      state?.id_operacion &&
      String(state.id_estado_operacion || "") !== String(operacionGuardada?.id_estado_operacion || "");
    const cambioLclPendiente =
      state?.id_operacion &&
      (Number(state.lcl) === 1 || state.lcl === true) !== (Number(operacionGuardada?.lcl) === 1);
    const context = esOperacionNueva || cambioServicioPendiente || cambioEstadoPendiente || cambioLclPendiente
      ? (esOperacionNueva ? "new" : "edit-pending")
      : "existing";
    const eta = etaOperacion(state);
    setAssignmentContext(context);
    setAssignmentMode("create");
    setAssignmentForm({
      ...asignacionInit,
      id_operacion: state.id_operacion ? String(state.id_operacion) : "",
      fecha_llegada_puerto: eta,
      fecha_devolucion_limite: calcularFechaLimite(eta),
    });
    setAssignmentErrors({});
    modal("assignContainerModal");
  };
  const editPendingContainerAssignment = (assignment) => {
    setAssignmentContext("new");
    setAssignmentMode("edit-pending");
    const eta = etaOperacion(form);
    setAssignmentForm({
      ...assignment,
      fecha_llegada_puerto: eta,
      fecha_devolucion_limite: calcularFechaLimite(eta),
    });
    setAssignmentErrors({});
    modal("assignContainerModal");
  };
  const editExistingContainerAssignment = (assignment) => {
    setAssignmentContext("existing");
    setAssignmentMode("edit-existing");
    const operacionAsignada = rows.find((row) => String(row.id_operacion) === String(assignment.id_operacion));
    const eta = etaOperacion(operacionAsignada);
    setAssignmentForm({
      ...asignacionInit,
      ...assignment,
      id_contenedor: String(assignment.id_contenedor ?? ""),
      id_operacion: String(assignment.id_operacion ?? ""),
      fecha_llegada_puerto: eta,
      fecha_devolucion_limite: calcularFechaLimite(eta),
      fecha_devolucion: assignment.fecha_devolucion || "",
    });
    setAssignmentErrors({});
    modal("assignContainerModal");
  };
  const saveAssignment = async () => {
    if (savingAssignment) return;
    const e = validateAssignment(assignmentForm);
    if (Object.keys(e).length) return setAssignmentErrors(e);

    setSavingAssignment(true);
    if (assignmentContext === "new" || assignmentContext === "edit-pending") {
      const container = containers.find((item) => String(item.id_contenedor) === String(assignmentForm.id_contenedor));
      if (assignmentMode === "edit-pending") {
        setPendingContainerAssignments((actuales) =>
          actuales.map((assignment) =>
            assignment.tempId === assignmentForm.tempId
              ? {
                  ...assignmentForm,
                  numero_contenedor: container?.numero_contenedor || "",
                  tipo_contenedor: container?.tipo_contenedor || "",
                  naviera: container?.naviera || "",
                  peso_bruto: container?.peso_bruto ?? "",
                }
              : assignment
          )
        );
      } else {
        setPendingContainerAssignments((actuales) => [
          ...actuales,
          {
            ...assignmentForm,
            tempId: `${assignmentForm.id_contenedor}-${Date.now()}`,
            numero_contenedor: container?.numero_contenedor || "",
            tipo_contenedor: container?.tipo_contenedor || "",
            naviera: container?.naviera || "",
            peso_bruto: container?.peso_bruto ?? "",
          },
        ]);
      }
      hideModal("assignContainerModal");
      setAssignmentForm(asignacionInit);
      setAssignmentMode("create");
      setAssignmentErrors({});
      setSavingAssignment(false);
      return;
    }

    if (assignmentMode === "edit-existing") {
      try {
        await request(`${API}/operacion-contenedor/${assignmentForm.id_asignacion}`, {
          method: "PUT",
          body: JSON.stringify({
            id_contenedor: Number(assignmentForm.id_contenedor),
            id_operacion: Number(assignmentForm.id_operacion),
            fecha_llegada_puerto: assignmentForm.fecha_llegada_puerto,
            fecha_devolucion: assignmentForm.fecha_devolucion || null,
          }),
        });
        await loadAll();
        hideModal("assignContainerModal");
        setAssignmentForm(asignacionInit);
        setAssignmentMode("create");
        setAssignmentErrors({});
      } catch (error) {
        alert(error.message || "Error al actualizar asignacion");
      } finally {
        setSavingAssignment(false);
      }
      return;
    }

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
      await loadAll();
      hideModal("assignContainerModal");
      setAssignmentForm(asignacionInit);
      setAssignmentMode("create");
      setAssignmentErrors({});
    } catch (error) {
      alert(error.message || "Error al asignar contenedor");
    } finally {
      setSavingAssignment(false);
    }
  };
  const saveCostFromOperation = async () => {
    const isPending = costMode === "create-pending" || costMode === "edit-pending";
    const e = validarCostoOperacion(costForm, costMode);
    if (Object.keys(e).length) return setCostErrors(e);

    if (isPending) {
      if (costMode === "edit-pending") {
        setPendingOperationCosts((items) =>
          items.map((item) => item.tempId === costForm.tempId ? buildPendingMovement(costForm, costForm.tempId) : item)
        );
      } else {
        setPendingOperationCosts((items) => [...items, buildPendingMovement(costForm)]);
      }
      hideModal("addCostFromOperationModal");
      setCostForm(movimientoInit);
      setCostErrors({});
      setCostMode("create");
      return;
    }

    try {
      await request(`${API}/costo-operacion${costMode === "edit" ? `/${costForm.id_costo}` : ""}`, {
        method: costMode === "edit" ? "PUT" : "POST",
        body: JSON.stringify(movimientoPayload(costForm)),
      });
      await loadAll();
      hideModal("addCostFromOperationModal");
      setCostForm(movimientoInit);
      setCostErrors({});
      setCostMode("create");
    } catch (error) {
      alert(error.message || "Error al registrar costo");
    }
  };
  const saveSaleFromOperation = async () => {
    const isPending = saleMode === "create-pending" || saleMode === "edit-pending";
    const e = validarVentaOperacion(saleForm, saleMode);
    if (Object.keys(e).length) return setSaleErrors(e);

    if (isPending) {
      if (saleMode === "edit-pending") {
        setPendingOperationSales((items) =>
          items.map((item) => item.tempId === saleForm.tempId ? buildPendingMovement(saleForm, saleForm.tempId) : item)
        );
      } else {
        setPendingOperationSales((items) => [...items, buildPendingMovement(saleForm)]);
      }
      hideModal("addSaleFromOperationModal");
      setSaleForm(movimientoInit);
      setSaleErrors({});
      setSaleMode("create");
      return;
    }

    try {
      await request(`${API}/venta-operacion${saleMode === "edit" ? `/${saleForm.id_venta}` : ""}`, {
        method: saleMode === "edit" ? "PUT" : "POST",
        body: JSON.stringify(movimientoPayload(saleForm)),
      });
      await loadAll();
      hideModal("addSaleFromOperationModal");
      setSaleForm(movimientoInit);
      setSaleErrors({});
      setSaleMode("create");
    } catch (error) {
      alert(error.message || "Error al registrar venta");
    }
  };
  const saveDocumentFromOperation = async () => {
    const isPending = documentMode === "create-pending" || documentMode === "edit-pending";
    const e = validateDocumento(documentForm, isPending);
    if (Object.keys(e).length) return setDocumentErrors(e);

    if (isPending) {
      if (documentMode === "edit-pending") {
        setPendingOperationDocuments((items) =>
          items.map((item) => item.tempId === documentForm.tempId ? buildPendingDocument(documentForm, documentForm.tempId) : item)
        );
      } else {
        setPendingOperationDocuments((items) => [...items, buildPendingDocument(documentForm)]);
      }
      hideModal("addDocumentFromOperationModal");
      setDocumentForm(documentoInit);
      setDocumentErrors({});
      setDocumentMode("create");
      setDocumentFileInputKey((key) => key + 1);
      return;
    }

    try {
      await request(`${API}/documento${documentMode === "edit" ? `/${documentForm.id_documento}` : ""}`, {
        method: documentMode === "edit" ? "PUT" : "POST",
        body: JSON.stringify(documentoPayload(documentForm)),
      });
      await loadAll();
      hideModal("addDocumentFromOperationModal");
      setDocumentForm(documentoInit);
      setDocumentErrors({});
      setDocumentMode("create");
      setDocumentFileInputKey((key) => key + 1);
    } catch (error) {
      alert(error.message || "Error al registrar documento");
    }
  };
  const deleteOperationCost = async (idCosto) => {
    try {
      await request(`${API}/costo-operacion/${idCosto}`, { method: "DELETE" });
      await loadAll();
    } catch (error) {
      alert(error.message || "Error al eliminar costo");
    }
  };
  const deleteOperationSale = async (idVenta) => {
    try {
      await request(`${API}/venta-operacion/${idVenta}`, { method: "DELETE" });
      await loadAll();
    } catch (error) {
      alert(error.message || "Error al eliminar venta");
    }
  };
  const deleteOperationDocument = async (idDocumento) => {
    try {
      await request(`${API}/documento/${idDocumento}`, { method: "DELETE" });
      await loadAll();
    } catch (error) {
      alert(error.message || "Error al eliminar documento");
    }
  };

  const saveNew = async () => {
    if (savingOperation) return;
    const e = validateOp({ ...form, omitir_validacion_estado: true });
    if (Object.keys(e).length) return setErrors(e);
    const debeAsignarContenedores =
      pendingContainerAssignments.length > 0 &&
      !(Number(form.lcl) === 1 || form.lcl === true) &&
      permiteAsignarContenedor(form, services, statuses);

    try {
      setSavingOperation(true);
      const operacionCreada = await request(`${API}/operaciones`, {
        method: "POST",
        body: JSON.stringify(payload(form)),
      });

      if (debeAsignarContenedores) {
        await Promise.all(
          pendingContainerAssignments.map((assignment) =>
            request(`${API}/operacion-contenedor`, {
              method: "POST",
              body: JSON.stringify({
                id_contenedor: Number(assignment.id_contenedor),
                id_operacion: Number(operacionCreada.id_operacion),
                fecha_llegada_puerto: assignment.fecha_llegada_puerto,
                fecha_devolucion: assignment.fecha_devolucion || null,
              }),
            })
          )
        );
      }

      if (pendingOperationCosts.length > 0) {
        await Promise.all(
          pendingOperationCosts.map((cost) =>
            request(`${API}/costo-operacion`, {
              method: "POST",
              body: JSON.stringify({
                ...movimientoPayload(cost),
                id_operacion: Number(operacionCreada.id_operacion),
              }),
            })
          )
        );
      }

      if (pendingOperationSales.length > 0) {
        await Promise.all(
          pendingOperationSales.map((sale) =>
            request(`${API}/venta-operacion`, {
              method: "POST",
              body: JSON.stringify({
                ...movimientoPayload(sale),
                id_operacion: Number(operacionCreada.id_operacion),
              }),
            })
          )
        );
      }

      if (pendingOperationDocuments.length > 0) {
        await Promise.all(
          pendingOperationDocuments.map((documento) =>
            request(`${API}/documento`, {
              method: "POST",
              body: JSON.stringify({
                ...documentoPayload(documento),
                id_operacion: Number(operacionCreada.id_operacion),
              }),
            })
          )
        );
      }

      await loadAll();
      hideModal("addOperationModal");
      setForm(crearOperacionInicial());
      setAssignmentForm(asignacionInit);
      setPendingContainerAssignments([]);
      setPendingOperationCosts([]);
      setPendingOperationSales([]);
      setPendingOperationDocuments([]);
      setAssignmentErrors({});
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingOperation(false);
    }
  };
  const saveEdit = async () => {
    if (savingOperation) return;
    const e = validateOp(editForm || crearOperacionInicial());
    if (Object.keys(e).length) return setErrors(e);
    const debeConservarContenedores =
      !(Number(editForm.lcl) === 1 || editForm.lcl === true) &&
      permiteAsignarContenedor(editForm, services, statuses);

    try {
      setSavingOperation(true);
      await request(`${API}/operaciones/${editForm.id_operacion}`, {
        method: "PUT",
        body: JSON.stringify(payload(editForm)),
      });

      if (debeConservarContenedores && pendingContainerAssignments.length > 0) {
        await Promise.all(
          pendingContainerAssignments.map((assignment) =>
            request(`${API}/operacion-contenedor`, {
              method: "POST",
              body: JSON.stringify({
                id_contenedor: Number(assignment.id_contenedor),
                id_operacion: Number(editForm.id_operacion),
                fecha_llegada_puerto: assignment.fecha_llegada_puerto,
                fecha_devolucion: assignment.fecha_devolucion || null,
              }),
            })
          )
        );
      }

      if (pendingOperationDocuments.length > 0) {
        await Promise.all(
          pendingOperationDocuments.map((documento) =>
            request(`${API}/documento`, {
              method: "POST",
              body: JSON.stringify({
                ...documentoPayload(documento),
                id_operacion: Number(editForm.id_operacion),
              }),
            })
          )
        );
      }

      await loadAll();
      hideModal("editOperationModal");
      setPendingContainerAssignments([]);
      setPendingOperationDocuments([]);
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingOperation(false);
    }
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
      const data = await request(`${API}/clientes`, { method: "POST", body: JSON.stringify({ ...quickClient, nit: onlyDigits(quickClient.nit), telefono: text(quickClient.telefono), correo: text(quickClient.correo).toLowerCase(), direccion: text(quickClient.direccion), observacion: text(quickClient.observacion) }) });
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
      const data = await request(`${API}/proveedores`, { method: "POST", body: JSON.stringify({ ...quickSupplier, nit: onlyDigits(quickSupplier.nit), telefono: text(quickSupplier.telefono), correo: text(quickSupplier.correo).toLowerCase(), id_tipo_servicio: Number(quickSupplier.id_tipo_servicio) }) });
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
  const openQuickContainer = () => {
    setQuickContainer(contenedorInit);
    setQuickContainerErrors({});
    modal("quickContainerFromOperationModal");
  };
  const saveQuickContainer = async () => {
    if (savingQuickContainer) return;
    const e = validateQuickContainer(quickContainer);
    if (Object.keys(e).length) return setQuickContainerErrors(e);

    try {
      setSavingQuickContainer(true);
      const data = await request(`${API}/contenedores`, {
        method: "POST",
        body: JSON.stringify({
          numero_contenedor: text(quickContainer.numero_contenedor).toUpperCase(),
          id_tipo_contenedor: Number(quickContainer.id_tipo_contenedor),
          naviera: text(quickContainer.naviera),
          peso_bruto: quickContainer.peso_bruto,
        }),
      });
      const containersData = await request(`${API}/contenedores`);
      setContainers(Array.isArray(containersData) ? containersData : []);
      setAssignmentForm((actual) => ({ ...actual, id_contenedor: String(data.id_contenedor) }));
      hideModal("quickContainerFromOperationModal");
      setQuickContainer(contenedorInit);
      setQuickContainerErrors({});
    } catch (error) {
      alert(error.message || "Error al crear contenedor");
    } finally {
      setSavingQuickContainer(false);
    }
  };
  const openQuickContainerType = () => {
    setQuickContainerType(itemInit);
    setQuickErrors({});
    modal("quickContainerTypeFromOperationModal");
  };
  const saveQuickContainerType = async () => {
    const e = validateItem(quickContainerType);
    if (Object.keys(e).length) return setQuickErrors(e);

    try {
      const data = await request(`${API}/tipo-contenedor`, {
        method: "POST",
        body: JSON.stringify({ descripcion: text(quickContainerType.descripcion) }),
      });
      const typesData = await request(`${API}/tipo-contenedor`);
      setContainerTypes(Array.isArray(typesData) ? typesData : []);
      setQuickContainer((current) => ({
        ...current,
        id_tipo_contenedor: String(data.id_tipo_contenedor),
      }));
      hideModal("quickContainerTypeFromOperationModal");
      setQuickContainerType(itemInit);
      setQuickErrors({});
    } catch (error) {
      alert(error.message || "Error al crear tipo de contenedor");
    }
  };

  const field = (state, setter, name, label, type = "text", errs = errors) => {
    const isNit = name === "nit";

    return (
      <div className="mb-3">
        <label className="form-label">{label}</label>
        <input
          type={isNit ? "tel" : type}
          className={`form-control ${errs[name] ? "is-invalid" : ""}`}
          value={state[name] || ""}
          inputMode={isNit ? "numeric" : undefined}
          pattern={isNit ? "\\d{5,12}" : undefined}
          maxLength={isNit ? 12 : undefined}
          onChange={(e) =>
            setter({
              ...state,
              [name]: isNit ? onlyDigits(e.target.value) : e.target.value,
            })
          }
        />
        {errs[name] ? <div className="invalid-feedback">{errs[name]}</div> : null}
      </div>
    );
  };
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
  const selectSimple = (state, setter, name, label, list, idKey, textKey, errs) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <select className={`form-select ${errs[name] ? "is-invalid" : ""}`} value={state[name] || ""} onChange={(e) => setter({ ...state, [name]: e.target.value })}>
        <option value="">Seleccionar</option>
        {list.map((item) => <option key={item[idKey]} value={item[idKey]}>{item[textKey]}</option>)}
      </select>
      {errs[name] ? <div className="invalid-feedback">{errs[name]}</div> : null}
    </div>
  );
  const movimientoForm = (state, setter, errs) => {
    const operacion = rows.find((row) => String(row.id_operacion) === String(state.id_operacion));

    return (
      <>
        <div className="mb-3">
          <label className="form-label">Operacion</label>
          <input className="form-control" value={operacion?.codigo_operacion || selected?.codigo_operacion || nextCode || ""} readOnly disabled />
          {errs.id_operacion ? <div className="invalid-feedback d-block">{errs.id_operacion}</div> : null}
        </div>
        {selectSimple(state, setter, "id_tipo_costo", "Tipo de costo", tiposCosto, "id_tipo_costo", "descripcion", errs)}
        {selectSimple(state, setter, "id_moneda", "Moneda", monedas, "id_moneda", "descripcion", errs)}
        {field(state, setter, "monto", "Monto", "number", errs)}
        {textareaField(state, setter, "observacion", "Observacion", errs)}
      </>
    );
  };
  const renderDocumentoActual = (documento) => {
    if (documento?.archivo_base64) return null;
    const nombre = documento?.archivo_base64 ? documento.archivo_nombre : obtenerNombreDocumento(documento?.ruta_documento);
    if (!nombre) return null;

    return (
      <div className="mb-3">
        <label className="form-label">{documento?.archivo_base64 ? "Archivo seleccionado" : "Documento actual"}</label>
        <div className="form-control bg-light">
          {documento?.archivo_base64 || !documento?.ruta_documento || !documento?.id_documento ? (
            <span>{nombre}</span>
          ) : (
            <a href={`http://localhost:3001${documento.ruta_documento}`} target="_blank" rel="noreferrer">{nombre}</a>
          )}
        </div>
      </div>
    );
  };
  const documentoFormView = (state, setter, errs) => {
    const operacion = rows.find((row) => String(row.id_operacion) === String(state.id_operacion));

    return (
      <>
        <div className="mb-3">
          <label className="form-label">Operacion</label>
          <input className="form-control" value={operacion?.codigo_operacion || selected?.codigo_operacion || nextCode || ""} readOnly disabled />
          {errs.id_operacion ? <div className="invalid-feedback d-block">{errs.id_operacion}</div> : null}
        </div>
        {selectSimple(state, setter, "id_tipo_documento", "Tipo de documento", tiposDocumento, "id_tipo_documento", "descripcion", errs)}
        {field(state, setter, "numero_documento", "Numero de documento", "text", errs)}
        {field(state, setter, "fecha_documento", "Fecha del documento", "date", errs)}
        <div className="mb-3">
          <label className="form-label">{state.id_documento ? "Reemplazar archivo" : "Archivo"}</label>
          <input key={documentFileInputKey} type="file" accept={ACCEPT_DOCUMENTOS} className={`form-control ${errs.ruta_documento ? "is-invalid" : ""}`} onChange={(e) => seleccionarArchivoDocumento(e.target.files?.[0])} />
          {errs.ruta_documento ? <div className="invalid-feedback">{errs.ruta_documento}</div> : null}
        </div>
        {renderDocumentoActual(state)}
        {field(state, setter, "descripcion", "Descripcion", "text", errs)}
      </>
    );
  };
  const removePendingContainerAssignment = (tempId) => {
    setPendingContainerAssignments((actuales) =>
      actuales.filter((assignment) => assignment.tempId !== tempId)
    );
  };
  const operationContainerAssignments = (idOperacion) =>
    containerAssignments.filter(
      (assignment) => String(assignment.id_operacion) === String(idOperacion)
    );
  const costsByOperation = (idOperacion) =>
    operationCosts.filter((cost) => String(cost.id_operacion) === String(idOperacion));
  const salesByOperation = (idOperacion) =>
    operationSales.filter((sale) => String(sale.id_operacion) === String(idOperacion));
  const documentsByOperation = (idOperacion) =>
    operationDocuments.filter((documento) => String(documento.id_operacion) === String(idOperacion));
  const deleteOperationContainerAssignment = async (idAsignacion) => {
    try {
      await request(`${API}/operacion-contenedor/${idAsignacion}`, { method: "DELETE" });
      await loadAll();
    } catch (error) {
      alert(error.message || "Error al eliminar asignacion");
    }
  };
  const pendingContainerAssignmentsTable = () => {
    if (pendingContainerAssignments.length === 0) return null;

    return (
      <div className="table-responsive mt-3">
        <table className="table table-sm table-bordered align-middle m-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 48 }} className="text-center">#</th>
              <th>Contenedor</th>
              <th>Tipo</th>
              <th>Naviera</th>
              <th>Llegada puerto</th>
              <th>Devolucion limite</th>
              <th>Devolucion</th>
              <th style={{ width: 150 }} className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pendingContainerAssignments.map((assignment, index) => (
              <tr key={assignment.tempId}>
                <td className="text-center">{index + 1}</td>
                <td>{assignment.numero_contenedor}</td>
                <td>{assignment.tipo_contenedor || "-"}</td>
                <td>{assignment.naviera || "-"}</td>
                <td>{assignment.fecha_llegada_puerto || "-"}</td>
                <td>{calcularFechaLimite(assignment.fecha_llegada_puerto) || "-"}</td>
                <td>{assignment.fecha_devolucion || "-"}</td>
                <td className="text-center">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => editPendingContainerAssignment(assignment)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removePendingContainerAssignment(assignment.tempId)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  const operationContainerAssignmentsTable = (state) => {
    if (!state.id_operacion) return null;
    const assignments = operationContainerAssignments(state.id_operacion);
    if (assignments.length === 0) return null;

    return (
      <div className="table-responsive mt-3">
        <table className="table table-sm table-bordered align-middle m-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 48 }} className="text-center">#</th>
              <th>Contenedor</th>
              <th>Tipo</th>
              <th>Naviera</th>
              <th>Llegada puerto</th>
              <th>Devolucion limite</th>
              <th>Devolucion</th>
              <th style={{ width: 150 }} className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment, index) => (
              <tr key={assignment.id_asignacion}>
                <td className="text-center">{index + 1}</td>
                <td>{assignment.numero_contenedor}</td>
                <td>{assignment.tipo_contenedor || "-"}</td>
                <td>{assignment.naviera || "-"}</td>
                <td>{assignment.fecha_llegada_puerto || "-"}</td>
                <td>{assignment.fecha_devolucion_limite || "-"}</td>
                <td>{assignment.fecha_devolucion || "-"}</td>
                <td className="text-center">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => editExistingContainerAssignment(assignment)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => deleteOperationContainerAssignment(assignment.id_asignacion)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  const movementTable = (title, newLabel, rowsData, onNew, onEdit, onDelete, idKey) => (
    <div className="mt-4">
      <div className="d-flex align-items-center gap-2 mb-2">
        <h6 className="m-0">{title}</h6>
        <button type="button" className="btn btn-sm btn-orange" onClick={onNew}>
          {newLabel}
        </button>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-bordered align-middle m-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 48 }} className="text-center">#</th>
              <th>Tipo de costo</th>
              <th>Moneda</th>
              <th>Monto</th>
              <th>Observacion</th>
              <th style={{ width: 150 }} className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rowsData.map((item, index) => (
              <tr key={item[idKey]}>
                <td className="text-center">{index + 1}</td>
                <td>{item.tipo_costo || "-"}</td>
                <td>{item.moneda ? `${item.moneda} (${item.codigo_moneda})` : "-"}</td>
                <td>{Number(item.monto || 0).toFixed(2)}</td>
                <td>{item.observacion || "-"}</td>
                <td className="text-center">
                  <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => onEdit(item)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDelete(item[idKey])}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {rowsData.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-3 text-muted">No hay registros asociados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
  const documentTable = (title, rowsData, onNew, onEdit, onDelete, idKey) => (
    <div className="mt-4">
      <div className="d-flex align-items-center gap-2 mb-2">
        <h6 className="m-0">{title}</h6>
        <button type="button" className="btn btn-sm btn-orange" onClick={onNew}>
          Nuevo documento
        </button>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-bordered align-middle m-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 48 }} className="text-center">#</th>
              <th>Tipo</th>
              <th>Numero</th>
              <th>Fecha</th>
              <th>Nombre</th>
              <th>Descripcion</th>
              <th style={{ width: 150 }} className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rowsData.map((item, index) => (
              <tr key={item[idKey]}>
                <td className="text-center">{index + 1}</td>
                <td>{item.tipo_documento || "-"}</td>
                <td>{item.numero_documento || "-"}</td>
                <td>{fmtDate(item.fecha_documento)}</td>
                <td>
                  {item.ruta_documento && item.id_documento ? (
                    <a href={`http://localhost:3001${item.ruta_documento}`} target="_blank" rel="noreferrer">
                      {obtenerNombreDocumento(item.ruta_documento)}
                    </a>
                  ) : (
                    obtenerNombreDocumento(item.ruta_documento) || item.archivo_nombre || "-"
                  )}
                </td>
                <td>{item.descripcion || "-"}</td>
                <td className="text-center">
                  <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => onEdit(item)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDelete(item[idKey])}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {rowsData.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-3 text-muted">No hay documentos asociados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
  const operationMovementsSection = (state) => {
    const isExisting = Boolean(state.id_operacion);

    return (
      <div className="col-12">
        {movementTable(
          isExisting ? "Costos asociados" : "Costos por registrar",
          "Nuevo costo",
          isExisting ? costsByOperation(state.id_operacion) : pendingOperationCosts,
          () => openCostForOperation(state),
          isExisting ? editOperationCost : editPendingCost,
          isExisting ? deleteOperationCost : deletePendingCost,
          isExisting ? "id_costo" : "tempId"
        )}
        {movementTable(
          isExisting ? "Ventas asociadas" : "Ventas por registrar",
          "Nueva venta",
          isExisting ? salesByOperation(state.id_operacion) : pendingOperationSales,
          () => openSaleForOperation(state),
          isExisting ? editOperationSale : editPendingSale,
          isExisting ? deleteOperationSale : deletePendingSale,
          isExisting ? "id_venta" : "tempId"
        )}
      </div>
    );
  };
  const operationDocumentsSection = (state) => {
    const isExisting = Boolean(state.id_operacion);

    return (
      <div className="col-12">
        {documentTable(
          isExisting ? "Documentos asociados" : "Documentos por registrar",
          isExisting ? documentsByOperation(state.id_operacion) : pendingOperationDocuments,
          () => openDocumentForOperation(state),
          isExisting ? editOperationDocument : editPendingDocument,
          isExisting ? deleteOperationDocument : deletePendingDocument,
          isExisting ? "id_documento" : "tempId"
        )}
      </div>
    );
  };
  const movementTotals = (items) =>
    Object.values(
      items.reduce((acc, item) => {
        const key = item.moneda ? `${item.moneda}${item.codigo_moneda ? ` (${item.codigo_moneda})` : ""}` : "Sin moneda";
        acc[key] = acc[key] || { label: key, total: 0 };
        acc[key].total += Number(item.monto || 0);
        return acc;
      }, {})
    );
  const infoField = (label, value) => (
    <div className="col-md-4">
      <div className="border rounded p-2 h-100 text-center">
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{value || "-"}</div>
      </div>
    </div>
  );
  const readonlyContainersTable = (items) => (
    <div className="table-responsive">
      <table className="table table-sm table-bordered align-middle m-0">
        <thead className="table-light">
          <tr>
            <th style={{ width: 48 }} className="text-center">#</th>
              <th className="text-center">Contenedor</th>
              <th className="text-center">Tipo</th>
              <th className="text-center">Naviera</th>
              <th className="text-center">Llegada puerto</th>
              <th className="text-center">Devolucion limite</th>
              <th className="text-center">Devolucion</th>
          </tr>
        </thead>
        <tbody>
          {items.map((assignment, index) => (
            <tr key={assignment.id_asignacion || assignment.tempId}>
              <td className="text-center">{index + 1}</td>
              <td className="text-center">{assignment.numero_contenedor || "-"}</td>
              <td className="text-center">{assignment.tipo_contenedor || "-"}</td>
              <td className="text-center">{assignment.naviera || "-"}</td>
              <td className="text-center">{assignment.fecha_llegada_puerto || "-"}</td>
              <td className="text-center">{assignment.fecha_devolucion_limite || calcularFechaLimite(assignment.fecha_llegada_puerto) || "-"}</td>
              <td className="text-center">{assignment.fecha_devolucion || "-"}</td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-3 text-muted">No hay contenedores asignados.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
  const readonlyMovementsTable = (title, items) => (
    <div className="mt-4">
      <div className="text-center mb-2">
        <h6 className="m-0">{title}</h6>
        <span className="text-muted small">{items.length} registro(s)</span>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-bordered align-middle m-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 48 }} className="text-center">#</th>
              <th className="text-center">Tipo de costo</th>
              <th className="text-center">Moneda</th>
              <th className="text-center">Monto</th>
              <th className="text-center">Observacion</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id_costo || item.id_venta || item.tempId}>
                <td className="text-center">{index + 1}</td>
                <td className="text-center">{item.tipo_costo || "-"}</td>
                <td className="text-center">{item.moneda ? `${item.moneda} (${item.codigo_moneda})` : "-"}</td>
                <td className="text-center">{Number(item.monto || 0).toFixed(2)}</td>
                <td className="text-center">{item.observacion || "-"}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-3 text-muted">No hay registros asociados.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {items.length > 0 ? (
        <div className="d-flex flex-wrap gap-3 mt-2 text-muted small">
          {movementTotals(items).map((total) => (
            <span key={total.label}>
              Total {total.label}: <strong>{total.total.toFixed(2)}</strong>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
  const readonlyDocumentsTable = (items) => (
    <div className="mt-4">
      <div className="text-center mb-2">
        <h6 className="m-0">Documentos asociados</h6>
        <span className="text-muted small">{items.length} registro(s)</span>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-bordered align-middle m-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 48 }} className="text-center">#</th>
              <th className="text-center">Tipo</th>
              <th className="text-center">Numero</th>
              <th className="text-center">Fecha</th>
              <th className="text-center">Nombre</th>
              <th className="text-center">Descripcion</th>
            </tr>
          </thead>
          <tbody>
            {items.map((documento, index) => (
              <tr key={documento.id_documento || documento.tempId}>
                <td className="text-center">{index + 1}</td>
                <td className="text-center">{documento.tipo_documento || "-"}</td>
                <td className="text-center">{documento.numero_documento || "-"}</td>
                <td className="text-center">{fmtDate(documento.fecha_documento)}</td>
                <td className="text-center">
                  {documento.ruta_documento ? (
                    <a href={`http://localhost:3001${documento.ruta_documento}`} target="_blank" rel="noreferrer">
                      {obtenerNombreDocumento(documento.ruta_documento)}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="text-center">{documento.descripcion || "-"}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-3 text-muted">No hay documentos asociados.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
  const operationInfoSection = (operation) => {
    if (!operation) return null;
    const containersInfo = operationContainerAssignments(operation.id_operacion);
    const costsInfo = costsByOperation(operation.id_operacion);
    const salesInfo = salesByOperation(operation.id_operacion);
    const documentsInfo = documentsByOperation(operation.id_operacion);
    const isLcl = Number(operation.lcl) === 1;
    const showContainersInfo = !isLcl && permiteAsignarContenedor(operation, services, statuses);

    return (
      <div>
        <h6 className="mb-2 text-center">Datos de la operacion</h6>
        <div className="row g-2">
          {infoField("Codigo", operation.codigo_operacion)}
          {infoField("Fecha de asignacion", fmtDate(operation.fecha_asignacion))}
          {infoField("Cliente", operation.cliente)}
          {infoField("Proveedor", operation.proveedor)}
          {infoField("Tipo de servicio", operation.tipo_servicio)}
          {infoField("Producto", operation.porducto)}
          {infoField("Origen", operation.origen)}
          {infoField("Destino", operation.destino)}
          {infoField("LCL", isLcl ? "Si" : "No")}
          {isLcl ? infoField("Cantidad", operation.cantidad) : null}
          {isLcl ? infoField("Volumen", operation.volumen) : null}
          {isLcl ? infoField("Peso", operation.peso) : null}
          {infoField("Nro. madre", operation.nro_madre)}
          {infoField("Nro. hijo", operation.nro_hijo)}
          {infoField("ETD", fmtDate(operation.etd))}
          {infoField("ETA", fmtDate(operation.eta))}
          {infoField("Nacionalizacion", operation.tipo_nacionalizacion)}
          {infoField("Estado", operation.estado_operacion)}
          <div className="col-12">
            <div className="border rounded p-2 text-center">
              <div className="text-muted small">Observaciones</div>
              <div className="fw-semibold">{operation.observacion || "-"}</div>
            </div>
          </div>
        </div>

        {showContainersInfo ? (
          <>
            <h6 className="mt-4 mb-2 text-center">Contenedores asignados</h6>
            {readonlyContainersTable(containersInfo)}
          </>
        ) : null}
        {readonlyMovementsTable("Costos asociados", costsInfo)}
        {readonlyMovementsTable("Ventas asociadas", salesInfo)}
        {readonlyDocumentsTable(documentsInfo)}
      </div>
    );
  };
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
  const opForm = (state, setter, { isNew = false } = {}) => {
    const etiquetasDocumento = obtenerEtiquetasDocumentoTransporte(state, services);
    const actualizarServicio = (idTipoServicio) => {
      const siguienteEstado = { ...state, id_tipo_servicio: idTipoServicio };
      const siguientesEtiquetas = obtenerEtiquetasDocumentoTransporte(siguienteEstado, services);
      setter({
        ...siguienteEstado,
        ...(siguientesEtiquetas.mostrarHijo ? {} : { nro_hijo: "" }),
      });
    };

    return (
    <form><div className="row g-3">
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label">Codigo de operacion</label>
          <input className="form-control" value={state.id_operacion ? state.codigo_operacion || "" : nextCode} readOnly disabled />
        </div>
      </div>
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label">Fecha de asignacion</label>
          <input
            type="date"
            className={`form-control ${errors.fecha_asignacion ? "is-invalid" : ""}`}
            value={state.fecha_asignacion || ""}
            readOnly
            disabled
          />
          {errors.fecha_asignacion ? (
            <div className="invalid-feedback d-block">{errors.fecha_asignacion}</div>
          ) : null}
        </div>
      </div>
      <div className="col-md-6">{selectField(state, setter, "id_cliente", "Cliente", clients, "id_cliente", "razon_social", "client")}</div>
      <div className="col-md-6">{selectField(state, setter, "id_proveedor", "Proveedor", suppliers, "id_proveedor", "empresa", "supplier")}</div>
      <div className="col-12">{supplierRouteField(state, setter)}</div>
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label">Tipo de servicio</label>
          <div className="d-flex gap-2 align-items-start">
            <select className={`form-select ${errors.id_tipo_servicio ? "is-invalid" : ""}`} value={state.id_tipo_servicio || ""} onChange={(e) => actualizarServicio(e.target.value)}>
              <option value="">Seleccionar</option>
              {services.map((item) => <option key={item.id_tipo_servicio} value={item.id_tipo_servicio}>{item.descripcion}</option>)}
            </select>
            <button type="button" className="btn btn-outline-primary quick-add-button" onClick={() => openQuick("service")} title="Crear Tipo de servicio" aria-label="Crear Tipo de servicio">
              <i className={quickIcons.service} aria-hidden="true" />
            </button>
          </div>
          {errors.id_tipo_servicio ? <div className="invalid-feedback d-block">{errors.id_tipo_servicio}</div> : null}
        </div>
      </div>
      <div className="col-md-6">{field(state, setter, "porducto", "Producto")}</div>
      <div className="col-md-6">{field(state, setter, "origen", "Origen")}</div>
      <div className="col-md-6">{field(state, setter, "destino", "Destino")}</div>
      <div className="col-12">{checkboxField(state, setter, "lcl", "LCL (Less than Container Load)")}</div>
      {(Number(state.lcl) === 1 || state.lcl === true) ? (
        <>
          <div className="col-md-4">{field(state, setter, "cantidad", "Cantidad")}</div>
          <div className="col-md-4">{field(state, setter, "volumen", "Volumen", "number")}</div>
          <div className="col-md-4">{field(state, setter, "peso", "Peso", "number")}</div>
        </>
      ) : null}
      <div className={etiquetasDocumento.mostrarHijo ? "col-md-6" : "col-12"}>{field(state, setter, "nro_madre", etiquetasDocumento.madre)}</div>
      {etiquetasDocumento.mostrarHijo ? (
        <div className="col-md-6">{field(state, setter, "nro_hijo", etiquetasDocumento.hijo)}</div>
      ) : null}
      <div className="col-12">{textareaField(state, setter, "observacion", "Observaciones")}</div>
      <div className="col-md-4">{field(state, setter, "etd", "ETD (fecha de salida)", "date")}</div>
      <div className="col-md-4">{field(state, setter, "eta", "ETA (fecha de llegada)", "date")}</div>
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
      {!(Number(state.lcl) === 1 || state.lcl === true) && permiteAsignarContenedor(state, services, statuses) ? (
        <div className="col-12">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => openAssignContainer(state)}
          >
            Asignar contenedor
          </button>
          {assignmentContext === "new" && pendingContainerAssignments.length > 0 && !state.id_operacion ? (
            <small className="text-muted ms-2">Los contenedores se asignaran al guardar la operacion.</small>
          ) : null}
          {!state.id_operacion ? (
            pendingContainerAssignmentsTable()
          ) : (
            <>
              {operationContainerAssignmentsTable(state)}
              {pendingContainerAssignmentsTable()}
            </>
          )}
        </div>
      ) : null}
      {!(Number(state.lcl) === 1 || state.lcl === true) && !permiteAsignarContenedor(state, services, statuses) ? (
        <div className="col-12">
          <small className="text-muted">La asignacion de contenedores solo aplica para servicios Maritimo o Terrestre.</small>
        </div>
      ) : null}
      {operationMovementsSection(state)}
      {operationDocumentsSection(state)}
    </div></form>
    );
  };

  return (
    <>
      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Operaciones</h1>
          <small className="text-muted">{selected ? <>Seleccionado: <strong>{selected.codigo_operacion}</strong></> : "Selecciona una operacion para Editar o Eliminar"}</small>
        </div>
        <div className="ui-card mb-3"><div className="d-flex flex-wrap gap-2"><button className="btn btn-orange" type="button" onClick={openNew}>Nuevo</button><button className="btn btn-primary" type="button" onClick={() => openEdit(selected)} disabled={!selected}>Editar</button><button className="btn btn-danger" type="button" onClick={() => openDelete(selected)} disabled={!selected}>Eliminar</button><button className="btn btn-info-operation" type="button" onClick={openInfoForSelected} disabled={!selected}>Informacion</button><button className="btn btn-costs" type="button" onClick={openCostForSelected} disabled={!selected}>Costos</button><button className="btn btn-sales" type="button" onClick={openSaleForSelected} disabled={!selected}>Ventas</button><button className="btn btn-documents" type="button" onClick={openDocumentsForSelected} disabled={!selected}>Documentos</button></div></div>
        <div className="ui-card mb-3"><div className="row g-2 align-items-end"><div className="col-md-9"><label className="form-label">Buscar</label><input className="form-control" placeholder="Codigo, cliente, proveedor, servicio, producto, origen, destino..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="col-md-3 d-flex gap-2"><button className="btn btn-secondary w-100" type="button" onClick={() => setSearch("")}>Limpiar</button></div></div></div>
        <div className="table-responsive ui-card"><table className="table table-hover table-bordered align-middle m-0"><thead className="table-light"><tr><th style={{ width: 48 }} className="text-center">#</th><th>Codigo</th><th>Fecha de asignación</th><th>Cliente</th><th>Proveedor</th><th>Servicio</th><th>Producto</th><th>Origen</th><th>Destino</th><th>LCL</th><th>Cantidad</th><th>Volumen</th><th>Peso</th><th>Nro. madre</th><th>Nro. hijo</th><th>Observaciones</th><th>ETD</th><th>ETA</th><th>Nacionalización</th><th>Estado</th><th>Registro</th></tr></thead><tbody>{filtered.map((r, i) => <tr key={r.id_operacion} className={r.id_operacion === selectedId ? "row-selected" : ""} onClick={() => setSelectedId(r.id_operacion)} style={{ cursor: "pointer" }}><td className="text-center">{i + 1}</td><td>{r.codigo_operacion}</td><td>{fmtDate(r.fecha_asignacion)}</td><td>{r.cliente}</td><td>{r.proveedor}</td><td>{r.tipo_servicio}</td><td>{r.porducto}</td><td>{r.origen}</td><td>{r.destino}</td><td>{Number(r.lcl) === 1 ? "Si" : "No"}</td><td>{r.cantidad || "-"}</td><td>{r.volumen ?? "-"}</td><td>{r.peso ?? "-"}</td><td>{r.nro_madre || "-"}</td><td>{r.nro_hijo || "-"}</td><td>{r.observacion || "-"}</td><td>{fmtDate(r.etd)}</td><td>{fmtDate(r.eta)}</td><td>{r.tipo_nacionalizacion}</td><td>{r.estado_operacion}</td><td>{fmtDateTime(r.fecha_registro)}</td></tr>)}{filtered.length === 0 ? <tr><td colSpan={21} className="text-center py-4 text-muted">No hay operaciones activas con los filtros actuales.</td></tr> : null}</tbody></table></div>
      </div>

      <div className="modal fade" id="addOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-xl"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Nueva operacion</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{opForm(form, setForm, { isNew: true })}</div><div className="modal-footer"><button type="button" className="btn btn-secondary" data-bs-dismiss="modal" disabled={savingOperation}>Cancelar</button><button type="button" className="btn btn-success" onClick={saveNew} disabled={savingOperation}>{savingOperation ? "Guardando..." : "Guardar"}</button></div></div></div></div>
      <div className="modal fade" id="editOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-xl"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Editar operacion</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{editForm ? opForm(editForm, setEditForm) : null}</div><div className="modal-footer"><button type="button" className="btn btn-secondary" data-bs-dismiss="modal" disabled={savingOperation}>Cancelar</button><button type="button" className="btn btn-primary" onClick={saveEdit} disabled={savingOperation}>{savingOperation ? "Guardando..." : "Guardar cambios"}</button></div></div></div></div>
      <div className="modal fade" id="operationInfoModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-xl"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Informacion de operacion {selected?.codigo_operacion || ""}</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{operationInfoSection(selected)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div></div></div></div>
      <div className="modal fade" id="assignContainerModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Asignar contenedor</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">
        {assignmentErrors.id_operacion ? <div className="alert alert-warning py-2">{assignmentErrors.id_operacion}</div> : null}
        <div className="mb-3">
          <label className="form-label">Contenedor</label>
          <div className="d-flex gap-2 align-items-start">
            <select className={`form-select ${assignmentErrors.id_contenedor ? "is-invalid" : ""}`} value={assignmentForm.id_contenedor} onChange={(e) => setAssignmentForm({ ...assignmentForm, id_contenedor: e.target.value })}>
              <option value="">Seleccionar</option>
              {containers
                .filter((container) =>
                  availableContainers.some((item) => String(item.id_contenedor) === String(container.id_contenedor)) ||
                  String(container.id_contenedor) === String(assignmentForm.id_contenedor)
                )
                .map((container) => (
                <option key={container.id_contenedor} value={container.id_contenedor}>{container.numero_contenedor} - {container.tipo_contenedor || "Sin tipo"}</option>
              ))}
            </select>
            <button type="button" className="btn btn-outline-primary" onClick={openQuickContainer} title="Crear contenedor" aria-label="Crear contenedor">
              +
            </button>
          </div>
          {assignmentErrors.id_contenedor ? <div className="invalid-feedback d-block">{assignmentErrors.id_contenedor}</div> : null}
        </div>
        <div className="mb-3">
          <label className="form-label">Fecha de llegada al puerto</label>
          <input type="date" className={`form-control ${assignmentErrors.fecha_llegada_puerto ? "is-invalid" : ""}`} value={assignmentForm.fecha_llegada_puerto} readOnly disabled />
          {assignmentErrors.fecha_llegada_puerto ? <div className="invalid-feedback d-block">{assignmentErrors.fecha_llegada_puerto}</div> : null}
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
      </div><div className="modal-footer"><button type="button" className="btn btn-secondary" data-bs-dismiss="modal" disabled={savingAssignment}>Cancelar</button><button type="button" className="btn btn-success" onClick={saveAssignment} disabled={savingAssignment}>{savingAssignment ? "Guardando..." : assignmentMode === "create" ? (assignmentContext === "new" || assignmentContext === "edit-pending" ? "Aceptar" : "Guardar asignacion") : "Guardar cambios"}</button></div></div></div></div>
      <div className="modal fade" id="operationMovementsModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-xl"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">{movementView === "costs" ? "Costos" : "Ventas"} de operacion {selected?.codigo_operacion || ""}</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{selected && movementView === "costs" ? movementTable("Costos asociados", "Nuevo costo", costsByOperation(selected.id_operacion), () => openCostForOperation(selected), editOperationCost, deleteOperationCost, "id_costo") : null}{selected && movementView === "sales" ? movementTable("Ventas asociadas", "Nueva venta", salesByOperation(selected.id_operacion), () => openSaleForOperation(selected), editOperationSale, deleteOperationSale, "id_venta") : null}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div></div></div></div>
      <div className="modal fade" id="operationDocumentsModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-xl"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Documentos de operacion {selected?.codigo_operacion || ""}</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{selected ? documentTable("Documentos asociados", documentsByOperation(selected.id_operacion), () => openDocumentForOperation(selected), editOperationDocument, deleteOperationDocument, "id_documento") : null}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div></div></div></div>
      <div className="modal fade" id="addCostFromOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">{costMode === "edit" ? "Editar costo" : "Agregar costo"}</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{movimientoForm(costForm, setCostForm, costErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveCostFromOperation}>{costMode === "edit" ? "Guardar cambios" : "Guardar"}</button></div></div></div></div>
      <div className="modal fade" id="addSaleFromOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">{saleMode === "edit" ? "Editar venta" : "Agregar venta"}</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{movimientoForm(saleForm, setSaleForm, saleErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveSaleFromOperation}>{saleMode === "edit" ? "Guardar cambios" : "Guardar"}</button></div></div></div></div>
      <div className="modal fade" id="addDocumentFromOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">{documentMode === "edit" || documentMode === "edit-pending" ? "Editar documento" : "Agregar documento"}</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{documentoFormView(documentForm, setDocumentForm, documentErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className={documentMode === "edit" || documentMode === "edit-pending" ? "btn btn-primary" : "btn btn-success"} onClick={saveDocumentFromOperation}>{documentMode === "edit" || documentMode === "edit-pending" ? "Guardar cambios" : "Guardar"}</button></div></div></div></div>
      <div className="modal fade" id="quickContainerFromOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear contenedor</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body"><ContainerFormFields contenedor={quickContainer} setContenedor={setQuickContainer} errores={quickContainerErrors} tiposContenedor={containerTypes} onCreateTipoContenedor={openQuickContainerType} /></div><div className="modal-footer"><button type="button" className="btn btn-secondary" data-bs-dismiss="modal" disabled={savingQuickContainer}>Cancelar</button><button type="button" className="btn btn-success" onClick={saveQuickContainer} disabled={savingQuickContainer}>{savingQuickContainer ? "Guardando..." : "Guardar"}</button></div></div></div></div>
      <div className="modal fade" id="quickContainerTypeFromOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Nuevo tipo de contenedor</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickContainerType, setQuickContainerType, "descripcion", "Descripcion", "text", quickErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveQuickContainerType}>Guardar</button></div></div></div></div>
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
