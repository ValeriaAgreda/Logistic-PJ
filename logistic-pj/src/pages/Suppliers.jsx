import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/suppliers.css";
import * as bootstrap from "bootstrap";

const Suppliers = () => {
  const [proveedores, setProveedores] = useState([]);
  const [nuevo, setNuevo] = useState({
    razon_social: "",
    tipo_servicio: "",
    contacto: "",
    telefono: "",
    email: "",
    direccion: "",
    state: 1,
  });

  const [seleccionado, setSeleccionado] = useState(null);
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [erroresEdit, setErroresEdit] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [tipoServicio, setTipoServicio] = useState("ALL");
  const [status, setStatus] = useState("ALL");


  const validar = (d) => {
    const e = {};
    if (!d.razon_social?.trim()) e.razon_social = "La razón social es obligatoria.";
    if (!d.contacto?.trim()) e.contacto = "El contacto es obligatorio.";
    if (!/^[67]\d{7}$/.test(String(d.telefono || "").trim()))
      e.telefono = "Teléfono: 8 dígitos y empieza con 6 o 7.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || "").trim()))
      e.email = "Email no válido.";
    if (!d.direccion?.trim()) e.direccion = "La dirección es obligatoria.";
    if (!d.tipo_servicio) e.tipo_servicio = "Selecciona el tipo de servicio.";
    return e;
  };

  const cargar = async () => {
    const res = await fetch("http://localhost:3001/api/proveedores", {
      credentials: "include",
    });
    const data = await res.json();
    setProveedores(data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = () => {
    setNuevo({
      razon_social: "",
      tipo_servicio: "",
      contacto: "",
      telefono: "",
      email: "",
      direccion: "",
      state: 1,
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("addSupplierModal")).show();
  };

  const abrirEditar = (p) => {
    if (!p) return;
    setSeleccionado({ ...p });
    setErroresEdit({});
    new bootstrap.Modal(document.getElementById("editSupplierModal")).show();
  };

  const abrirEliminar = (p) => {
  setProveedorAEliminar(p);
  new bootstrap.Modal(document.getElementById("deleteSupplierModal")).show();
};

  const guardarNuevo = async () => {
    const e = validar(nuevo);
    if (Object.keys(e).length) return setErrores(e);

    const body = { ...nuevo, email: nuevo.email.trim().toLowerCase() };

    const res = await fetch("http://localhost:3001/api/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      cargar();
      bootstrap.Modal.getInstance(document.getElementById("addSupplierModal")).hide();
    }
  };

  const guardarEdicion = async () => {
    const e = validar(seleccionado);
    if (Object.keys(e).length) return setErroresEdit(e);

    const body = { ...seleccionado, email: seleccionado.email.trim().toLowerCase() };

    const res = await fetch(`http://localhost:3001/api/proveedores/${seleccionado.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      cargar();
      bootstrap.Modal.getInstance(document.getElementById("editSupplierModal")).hide();
    }
  };

  const eliminar = async () => {
    const res = await fetch(`http://localhost:3001/api/proveedores/${proveedorAEliminar.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      cargar();
      bootstrap.Modal.getInstance(document.getElementById("deleteSupplierModal")).hide();
      setSelectedId(null);
      setProveedorAEliminar(null);
    }
  };

  const input = (label, value, onChange, error, type = "text") => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <input
        type={type}
        className={`form-control ${error ? "is-invalid" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );

  const selectedSupplier = useMemo(
    () => proveedores.find((p) => p.id === selectedId) || null,
    [proveedores, selectedId]
  );

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return proveedores.filter((p) => {
      const matchesSearch =
        !q ||
        String(p.razon_social || "").toLowerCase().includes(q) ||
        String(p.contacto || "").toLowerCase().includes(q) ||
        String(p.telefono || "").toLowerCase().includes(q) ||
        String(p.email || "").toLowerCase().includes(q);

      const matchesTipo =
        tipoServicio === "ALL" ? true : String(p.tipo_servicio) === String(tipoServicio);

      const matchesStatus =
        status === "ALL" ? true : String(p.state) === String(status);

      return matchesSearch && matchesStatus && matchesTipo;
    });
  }, [proveedores, search, tipoServicio, status]);

  const toolbarActions = [
    { id: "new", label: "Nuevo", className: "btn btn-orange", onClick: abrirNuevo, disabled: false },
    {
      id: "edit",
      label: "Editar",
      className: "btn btn-primary",
      onClick: () => abrirEditar(selectedSupplier),
      disabled: !selectedSupplier,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(selectedSupplier),
      disabled: !selectedSupplier,
    },
    { id: "refresh", label: "Refrescar", className: "btn btn-outline-light", onClick: cargar, disabled: false },
  ];

  return (
    <div className="d-flex">
      <Sidebar />

      <div className="page-container flex-grow-1 p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Proveedores</h1>

          {selectedSupplier ? (
            <small className="text-muted">
              Seleccionado: <strong>{selectedSupplier.razon_social}</strong>
            </small>
          ) : (
            <small className="text-muted">Selecciona un proveedor para Editar/Eliminar</small>
          )}
        </div>

        {/* Toolbar */}
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

        {/* Filtros */}
        <div className="ui-card mb-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-6">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Razón social, contacto, teléfono, correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Tipo de servicio</label>
              <select
                className="form-select"
                value={tipoServicio}
                onChange={(e) => setTipoServicio(e.target.value)}
              >
                <option value="ALL">Todos</option>
                <option value="Marítimo">Marítimo</option>
                <option value="Aéreo">Aéreo</option>
                <option value="Terrestre">Terrestre</option>
                <option value="Bimodal">Bimodal</option>
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">Todos</option>
                <option value="1">Activos</option>
                <option value="0">Inactivos</option>
              </select>
            </div>

            <div className="col-12 col-md-3 d-flex gap-2">
              <button
                className="btn btn-secondary w-100"
                type="button"
                onClick={() => {
                  setSearch("");
                  setTipoServicio("ALL");
                   setStatus("ALL");
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="table-responsive ui-card">
          <table className="table table-hover table-bordered align-middle m-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 48 }} className="text-center">#</th>
                <th>Razón social</th>
                <th>Tipo de servicio</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th style={{ width: 120 }} className="text-center">Estado</th>

              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((p, idx) => {
                const isSelected = p.id === selectedId;

                return (
                  <tr
                    key={p.id}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(p.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{p.razon_social}</td>
                    <td>{p.tipo_servicio}</td>
                    <td>{p.contacto}</td>
                    <td>{p.telefono}</td>
                    <td>{p.email}</td>
                    <td className="text-center">
                      {Number(p.state) === 1 && (
                        <span className="badge bg-success">Activo</span>
                      )}
                      {Number(p.state) === 0 && (
                        <span className="badge bg-danger">Inactivo</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar */}
      <div className="modal fade" id="addSupplierModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {input("Razón social", nuevo.razon_social, (v) => setNuevo({ ...nuevo, razon_social: v }), errores.razon_social)}
              {input("Contacto", nuevo.contacto, (v) => setNuevo({ ...nuevo, contacto: v }), errores.contacto)}
              {input("Teléfono", nuevo.telefono, (v) => setNuevo({ ...nuevo, telefono: v }), errores.telefono)}
              {input("Correo", nuevo.email, (v) => setNuevo({ ...nuevo, email: v }), errores.email, "email")}
              {input("Dirección", nuevo.direccion, (v) => setNuevo({ ...nuevo, direccion: v }), errores.direccion)}

              <label className="form-label">Tipo de servicio</label>
              <select
                className={`form-select ${errores.tipo_servicio ? "is-invalid" : ""}`}
                value={nuevo.tipo_servicio}
                onChange={(e) => setNuevo({ ...nuevo, tipo_servicio: e.target.value })}
              >
                <option value="">Seleccionar</option>
                <option value="Marítimo">Marítimo</option>
                <option value="Aéreo">Aéreo</option>
                <option value="Terrestre">Terrestre</option>
                <option value="Bimodal">Bimodal</option>
              </select>
              {errores.tipo_servicio && <div className="invalid-feedback">{errores.tipo_servicio}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-success" onClick={guardarNuevo}>Guardar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editar */}
      <div className="modal fade" id="editSupplierModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {seleccionado && (
                <>
                  {input("Razón social", seleccionado.razon_social, (v) => setSeleccionado({ ...seleccionado, razon_social: v }), erroresEdit.razon_social)}
                  {input("Contacto", seleccionado.contacto, (v) => setSeleccionado({ ...seleccionado, contacto: v }), erroresEdit.contacto)}
                  {input("Teléfono", seleccionado.telefono, (v) => setSeleccionado({ ...seleccionado, telefono: v }), erroresEdit.telefono)}
                  {input("Correo", seleccionado.email, (v) => setSeleccionado({ ...seleccionado, email: v }), erroresEdit.email, "email")}
                  {input("Dirección", seleccionado.direccion, (v) => setSeleccionado({ ...seleccionado, direccion: v }), erroresEdit.direccion)}

                  <label className="form-label">Tipo de servicio</label>
                  <select
                    className={`form-select ${erroresEdit.tipo_servicio ? "is-invalid" : ""}`}
                    value={seleccionado.tipo_servicio}
                    onChange={(e) => setSeleccionado({ ...seleccionado, tipo_servicio: e.target.value })}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Marítimo">Marítimo</option>
                    <option value="Aéreo">Aéreo</option>
                    <option value="Terrestre">Terrestre</option>
                    <option value="Bimodal">Bimodal</option>
                  </select>
                  {erroresEdit.tipo_servicio && <div className="invalid-feedback">{erroresEdit.tipo_servicio}</div>}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-primary" onClick={guardarEdicion}>Guardar cambios</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Eliminar */}
      <div className="modal fade" id="deleteSupplierModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {proveedorAEliminar && (
                <p>
                  ¿Seguro que deseas eliminar al proveedor <strong>{proveedorAEliminar.razon_social}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-danger" onClick={eliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Suppliers;