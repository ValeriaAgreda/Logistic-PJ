import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";
import "../styles/operations.css";

const API = "http://localhost:3001/api";
const opInit = { codigo_operacion: "", fecha_asignacion: "", id_cliente: "", id_proveedor: "", id_tipo_servicio: "", porducto: "", origen: "", destino: "", cantidad: "", nro_madre: "", nro_hijo: "", etd: "", eta: "", id_tipo_nacionalizacion: "", id_estado_operacion: "" };
const clientInit = { razon_social: "", nit: "", contacto: "", telefono: "", correo: "", direccion: "", observacion: "" };
const supplierInit = { empresa: "", nit: "", contacto: "", telefono: "", correo: "", direccion: "", lugar_origen: "", id_tipo_servicio: "" };
const itemInit = { descripcion: "" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIT = /^\d{5,15}$/;
const PHONE = /^[67]\d{7}$/;

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

const Operations = () => {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
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
    const [ops, c, p, s, n, st] = await Promise.all([
      request(`${API}/operaciones`),
      request(`${API}/clientes`),
      request(`${API}/proveedores`),
      request(`${API}/tipo-servicio`),
      request(`${API}/tipo-nacionalizacion`),
      request(`${API}/estado-operacion`),
    ]);
    setRows(Array.isArray(ops) ? ops : []);
    setClients(Array.isArray(c) ? c : []);
    setSuppliers(Array.isArray(p) ? p : []);
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
    if (!v.codigo_operacion.trim()) e.codigo_operacion = "Codigo obligatorio.";
    if (!v.fecha_asignacion) e.fecha_asignacion = "Fecha obligatoria.";
    if (!v.id_cliente) e.id_cliente = "Selecciona un cliente.";
    if (!v.id_proveedor) e.id_proveedor = "Selecciona un proveedor.";
    if (!v.id_tipo_servicio) e.id_tipo_servicio = "Selecciona un tipo de servicio.";
    if (!v.porducto.trim()) e.porducto = "Producto obligatorio.";
    if (!v.origen.trim()) e.origen = "Origen obligatorio.";
    if (!v.destino.trim()) e.destino = "Destino obligatorio.";
    if (!v.cantidad || Number(v.cantidad) <= 0) e.cantidad = "Cantidad invalida.";
    if (!v.id_tipo_nacionalizacion) e.id_tipo_nacionalizacion = "Selecciona un tipo.";
    if (!v.id_estado_operacion) e.id_estado_operacion = "Selecciona un estado.";
    if (v.etd && v.eta && v.etd > v.eta) e.eta = "ETA no puede ser menor a ETD.";
    return e;
  };
  const validateClient = (v) => {
    const e = {};
    if (!v.razon_social.trim()) e.razon_social = "Razon social obligatoria.";
    if (!NIT.test(String(v.nit).trim())) e.nit = "NIT invalido.";
    if (!v.contacto.trim()) e.contacto = "Contacto obligatorio.";
    if (!PHONE.test(String(v.telefono).trim())) e.telefono = "Telefono invalido.";
    if (!EMAIL.test(String(v.correo).trim())) e.correo = "Correo invalido.";
    if (!v.direccion.trim()) e.direccion = "Direccion obligatoria.";
    return e;
  };
  const validateSupplier = (v) => {
    const e = validateClient({ ...v, razon_social: v.empresa });
    delete e.razon_social;
    if (!v.empresa.trim()) e.empresa = "Empresa obligatoria.";
    if (!v.lugar_origen.trim()) e.lugar_origen = "Lugar de origen obligatorio.";
    if (!v.id_tipo_servicio) e.id_tipo_servicio = "Selecciona un tipo de servicio.";
    return e;
  };
  const validateItem = (v) => {
    const e = {};
    if (!v.descripcion.trim()) e.descripcion = "Descripcion obligatoria.";
    return e;
  };

  const payload = (v) => ({
    ...v,
    codigo_operacion: v.codigo_operacion.trim(),
    porducto: v.porducto.trim(),
    origen: v.origen.trim(),
    destino: v.destino.trim(),
    nro_madre: v.nro_madre.trim(),
    nro_hijo: v.nro_hijo.trim(),
    cantidad: Number(v.cantidad),
    id_cliente: Number(v.id_cliente),
    id_proveedor: Number(v.id_proveedor),
    id_tipo_servicio: Number(v.id_tipo_servicio),
    id_tipo_nacionalizacion: Number(v.id_tipo_nacionalizacion),
    id_estado_operacion: Number(v.id_estado_operacion),
    etd: v.etd || null,
    eta: v.eta || null,
  });

  const selected = useMemo(() => rows.find((r) => r.id_operacion === selectedId) || null, [rows, selectedId]);
  const filtered = useMemo(() => rows.filter((r) => [r.codigo_operacion, r.cliente, r.proveedor, r.tipo_servicio, r.porducto, r.origen, r.destino, r.estado_operacion].some((x) => String(x || "").toLowerCase().includes(search.trim().toLowerCase()))), [rows, search]);

  const openNew = () => { setEditForm(null); setForm(opInit); setErrors({}); modal("addOperationModal"); };
  const openEdit = (row) => {
    if (!row) return;
    setEditForm({ ...opInit, ...row, fecha_asignacion: row.fecha_asignacion?.slice(0, 10) || "", etd: row.etd?.slice(0, 10) || "", eta: row.eta?.slice(0, 10) || "", cantidad: row.cantidad ?? "", id_cliente: String(row.id_cliente || ""), id_proveedor: String(row.id_proveedor || ""), id_tipo_servicio: String(row.id_tipo_servicio || ""), id_tipo_nacionalizacion: String(row.id_tipo_nacionalizacion || ""), id_estado_operacion: String(row.id_estado_operacion || "") });
    setErrors({});
    modal("editOperationModal");
  };
  const openDelete = (row) => { if (row) { setToDelete(row); modal("deleteOperationModal"); } };

  const saveNew = async () => {
    const e = validateOp(form);
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
      const data = await request(`${API}/clientes`, { method: "POST", body: JSON.stringify({ ...quickClient, correo: quickClient.correo.trim().toLowerCase(), observacion: quickClient.observacion.trim() }) });
      await loadAll(); activeSetter((c) => ({ ...c, id_cliente: String(data.id_cliente) })); hideModal("quickClientModal");
    } catch (error) { alert(error.message); }
  };
  const saveQuickService = async () => {
    const e = validateItem(quickService);
    if (Object.keys(e).length) return setQuickErrors(e);
    try {
      const data = await request(`${API}/tipo-servicio`, { method: "POST", body: JSON.stringify({ descripcion: quickService.descripcion.trim() }) });
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
      const data = await request(`${API}/proveedores`, { method: "POST", body: JSON.stringify({ ...quickSupplier, correo: quickSupplier.correo.trim().toLowerCase(), id_tipo_servicio: Number(quickSupplier.id_tipo_servicio) }) });
      await loadAll(); activeSetter((c) => ({ ...c, id_proveedor: String(data.id_proveedor) })); hideModal("quickSupplierModal");
    } catch (error) { alert(error.message); }
  };
  const saveQuickNationalization = async () => {
    const e = validateItem(quickNationalization);
    if (Object.keys(e).length) return setQuickErrors(e);
    try {
      const data = await request(`${API}/tipo-nacionalizacion`, { method: "POST", body: JSON.stringify({ descripcion: quickNationalization.descripcion.trim() }) });
      await loadAll(); activeSetter((c) => ({ ...c, id_tipo_nacionalizacion: String(data.id_tipo_nacionalizacion) })); hideModal("quickNationalizationModal");
    } catch (error) { alert(error.message); }
  };
  const saveQuickStatus = async () => {
    const e = validateItem(quickStatus);
    if (Object.keys(e).length) return setQuickErrors(e);
    try {
      const data = await request(`${API}/estado-operacion`, { method: "POST", body: JSON.stringify({ descripcion: quickStatus.descripcion.trim() }) });
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
  const selectField = (state, setter, name, label, list, idKey, textKey, quickType, errs = errors) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <div className="d-flex gap-2 align-items-start">
        <select className={`form-select ${errs[name] ? "is-invalid" : ""}`} value={state[name] || ""} onChange={(e) => setter({ ...state, [name]: e.target.value })}>
          <option value="">Seleccionar</option>
          {list.map((item) => <option key={item[idKey]} value={item[idKey]}>{item[textKey]}</option>)}
        </select>
        <button type="button" className="btn btn-outline-primary quick-add-button" onClick={() => openQuick(quickType)} title={`Crear ${label}`}>[P]</button>
      </div>
      {errs[name] ? <div className="invalid-feedback d-block">{errs[name]}</div> : null}
    </div>
  );
  const opForm = (state, setter) => (
    <form><div className="row g-3">
      <div className="col-md-6">{field(state, setter, "codigo_operacion", "Codigo de operacion")}</div>
      <div className="col-md-6">{field(state, setter, "fecha_asignacion", "Fecha de asignacion", "date")}</div>
      <div className="col-md-6">{selectField(state, setter, "id_cliente", "Cliente", clients, "id_cliente", "razon_social", "client")}</div>
      <div className="col-md-6">{selectField(state, setter, "id_proveedor", "Proveedor", suppliers, "id_proveedor", "empresa", "supplier")}</div>
      <div className="col-md-6">{selectField(state, setter, "id_tipo_servicio", "Tipo de servicio", services, "id_tipo_servicio", "descripcion", "service")}</div>
      <div className="col-md-6">{field(state, setter, "porducto", "Producto")}</div>
      <div className="col-md-6">{field(state, setter, "origen", "Origen")}</div>
      <div className="col-md-6">{field(state, setter, "destino", "Destino")}</div>
      <div className="col-md-4">{field(state, setter, "cantidad", "Cantidad", "number")}</div>
      <div className="col-md-4">{field(state, setter, "nro_madre", "Nro. madre")}</div>
      <div className="col-md-4">{field(state, setter, "nro_hijo", "Nro. hijo")}</div>
      <div className="col-md-4">{field(state, setter, "etd", "ETD", "date")}</div>
      <div className="col-md-4">{field(state, setter, "eta", "ETA", "date")}</div>
      <div className="col-md-4">{selectField(state, setter, "id_tipo_nacionalizacion", "Tipo de nacionalizacion", nationalizations, "id_tipo_nacionalizacion", "descripcion", "nationalization")}</div>
      <div className="col-12">{selectField(state, setter, "id_estado_operacion", "Estado de operacion", statuses, "id_estado_operacion", "descripcion", "status")}</div>
    </div></form>
  );

  return (
    <>
      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestion de Operaciones</h1>
          <small className="text-muted">{selected ? <>Seleccionado: <strong>{selected.codigo_operacion}</strong></> : "Selecciona una operacion para Editar o Eliminar"}</small>
        </div>
        <div className="ui-card mb-3"><div className="d-flex flex-wrap gap-2"><button className="btn btn-orange" type="button" onClick={openNew}>Nuevo</button><button className="btn btn-primary" type="button" onClick={() => openEdit(selected)} disabled={!selected}>Editar</button><button className="btn btn-danger" type="button" onClick={() => openDelete(selected)} disabled={!selected}>Eliminar</button><button className="btn btn-outline-light" type="button" onClick={() => loadAll().catch((e) => alert(e.message))}>Refrescar</button></div></div>
        <div className="ui-card mb-3"><div className="row g-2 align-items-end"><div className="col-md-9"><label className="form-label">Buscar</label><input className="form-control" placeholder="Codigo, cliente, proveedor, servicio, producto, origen, destino..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="col-md-3 d-flex gap-2"><button className="btn btn-secondary w-100" type="button" onClick={() => setSearch("")}>Limpiar</button></div></div></div>
        <div className="table-responsive ui-card"><table className="table table-hover table-bordered align-middle m-0"><thead className="table-light"><tr><th style={{ width: 48 }} className="text-center">#</th><th>Codigo</th><th>Fecha de asignación</th><th>Cliente</th><th>Proveedor</th><th>Servicio</th><th>Producto</th><th>Origen</th><th>Destino</th><th>Cantidad</th><th>Estado</th><th>Registro</th></tr></thead><tbody>{filtered.map((r, i) => <tr key={r.id_operacion} className={r.id_operacion === selectedId ? "row-selected" : ""} onClick={() => setSelectedId(r.id_operacion)} style={{ cursor: "pointer" }}><td className="text-center">{i + 1}</td><td>{r.codigo_operacion}</td><td>{fmtDate(r.fecha_asignacion)}</td><td>{r.cliente}</td><td>{r.proveedor}</td><td>{r.tipo_servicio}</td><td>{r.porducto}</td><td>{r.origen}</td><td>{r.destino}</td><td>{r.cantidad}</td><td>{r.estado_operacion}</td><td>{fmtDateTime(r.fecha_registro)}</td></tr>)}{filtered.length === 0 ? <tr><td colSpan={12} className="text-center py-4 text-muted">No hay operaciones activas con los filtros actuales.</td></tr> : null}</tbody></table></div>
      </div>

      <div className="modal fade" id="addOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-xl"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Nueva operacion</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{opForm(form, setForm)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveNew}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="editOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-xl"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Editar operacion</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{editForm ? opForm(editForm, setEditForm) : null}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-primary" onClick={saveEdit}>Guardar cambios</button></div></div></div></div>
      <div className="modal fade" id="deleteOperationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Eliminar operacion</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{toDelete ? <p>Seguro que deseas desactivar la operacion <strong>{toDelete.codigo_operacion}</strong>?</p> : null}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-danger" onClick={remove}>Eliminar</button></div></div></div></div>
      <div className="modal fade" id="quickClientModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear cliente rapido</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickClient, setQuickClient, "razon_social", "Razon social", "text", quickErrors)}{field(quickClient, setQuickClient, "nit", "NIT", "text", quickErrors)}{field(quickClient, setQuickClient, "contacto", "Contacto", "text", quickErrors)}{field(quickClient, setQuickClient, "telefono", "Telefono", "text", quickErrors)}{field(quickClient, setQuickClient, "correo", "Correo", "email", quickErrors)}{field(quickClient, setQuickClient, "direccion", "Direccion", "text", quickErrors)}<div className="mb-3"><label className="form-label">Observacion</label><textarea className="form-control" rows="3" value={quickClient.observacion} onChange={(e) => setQuickClient({ ...quickClient, observacion: e.target.value })} /></div></div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveQuickClient}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="quickServiceModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear tipo de servicio rapido</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickService, setQuickService, "descripcion", "Descripcion", "text", quickErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={() => saveQuickService()}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="quickSupplierModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear proveedor rapido</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickSupplier, setQuickSupplier, "empresa", "Empresa", "text", quickErrors)}{field(quickSupplier, setQuickSupplier, "nit", "NIT", "text", quickErrors)}{field(quickSupplier, setQuickSupplier, "contacto", "Contacto", "text", quickErrors)}{field(quickSupplier, setQuickSupplier, "telefono", "Telefono", "text", quickErrors)}{field(quickSupplier, setQuickSupplier, "correo", "Correo", "email", quickErrors)}{field(quickSupplier, setQuickSupplier, "direccion", "Direccion", "text", quickErrors)}{field(quickSupplier, setQuickSupplier, "lugar_origen", "Lugar de origen", "text", quickErrors)}{selectField(quickSupplier, setQuickSupplier, "id_tipo_servicio", "Tipo de servicio", services, "id_tipo_servicio", "descripcion", "service-supplier", quickErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveQuickSupplier}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="quickNationalizationModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear tipo de nacionalizacion rapido</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickNationalization, setQuickNationalization, "descripcion", "Descripcion", "text", quickErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveQuickNationalization}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="quickStatusModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Crear estado de operacion rapido</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{field(quickStatus, setQuickStatus, "descripcion", "Descripcion", "text", quickErrors)}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={saveQuickStatus}>Guardar</button></div></div></div></div>
    </>
  );
};

export default Operations;

