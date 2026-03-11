import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/clients.css";
import * as bootstrap from "bootstrap";

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [nuevoCliente, setNuevoCliente] = useState({
    razon_social: "",
    nit: "",
    direccion: "",
    telefono: "",
    email: "",
    state: 1,
  });
  const [errores, setErrores] = useState({});
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteAEliminar, setClienteAEliminar] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const fetchClients = async () => {
    const res = await fetch("http://localhost:3001/api/clientes", {
      credentials: "include",
    });
    const data = await res.json();
    setClients(data);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const abrirModalNuevo = () => {
    setNuevoCliente({
      razon_social: "",
      nit: "",
      direccion: "",
      telefono: "",
      email: "",
      state: 1,
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("addModal")).show();
  };

  const abrirModalEditar = (cliente) => {
    setClienteSeleccionado({ ...cliente });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editModal")).show();
  };

  const abrirModalEliminar = (cliente) => {
    setClienteAEliminar(cliente);
    new bootstrap.Modal(document.getElementById("deleteModal")).show();
  };

  const validar = (c) => {
    const e = {};
    if (!c.razon_social?.trim()) e.razon_social = "La razón social es obligatoria.";
    if (!/^\d{5,15}$/.test(String(c.nit || "").trim())) e.nit = "El NIT debe tener entre 5 y 15 dígitos.";
    if (!c.direccion?.trim()) e.direccion = "La dirección es obligatoria.";
    if (!/^[67]\d{7}$/.test(String(c.telefono || "").trim())) e.telefono = "El teléfono debe tener 8 dígitos y empezar con 6 o 7.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email || "").trim())) e.email = "Email no válido.";
    return e;
  };

  const guardarNuevo = async () => {
    const errs = validar(nuevoCliente);
    if (Object.keys(errs).length > 0) return setErrores(errs);

    const body = { ...nuevoCliente, email: nuevoCliente.email.trim().toLowerCase() };

    const res = await fetch("http://localhost:3001/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      fetchClients();
      bootstrap.Modal.getInstance(document.getElementById("addModal")).hide();
    }
  };

  const guardarEdicion = async () => {
    const errs = validar(clienteSeleccionado);
    if (Object.keys(errs).length > 0) return setErrores(errs);

    const body = { ...clienteSeleccionado, email: clienteSeleccionado.email.trim().toLowerCase() };

    const res = await fetch(`http://localhost:3001/api/clientes/${clienteSeleccionado.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      fetchClients();
      bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
    }
  };

  const confirmarEliminar = async () => {
    const res = await fetch(`http://localhost:3001/api/clientes/${clienteAEliminar.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      fetchClients();
      bootstrap.Modal.getInstance(document.getElementById("deleteModal")).hide();
      setClienteAEliminar(null);
      setSelectedId(null);
    }
  };

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedId) || null,
    [clients, selectedId]
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();

    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        String(c.razon_social || "").toLowerCase().includes(q) ||
        String(c.nit || "").toLowerCase().includes(q) ||
        String(c.telefono || "").toLowerCase().includes(q) ||
        String(c.direccion || "").toLowerCase().includes(q)||
        String(c.email || "").toLowerCase().includes(q);

      const matchesStatus =
        status === "ALL" ? true : String(c.state) === String(status);

      return matchesSearch && matchesStatus;
    });
  }, [clients, search, status]);

  const toolbarActions = [
    {
      id: "new",
      label: "Nuevo",
      className: "btn btn-orange",
      onClick: abrirModalNuevo,
      disabled: false,
    },
    {
      id: "edit",
      label: "Editar",
      className: "btn btn-primary",
      onClick: () => abrirModalEditar(selectedClient),
      disabled: !selectedClient,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirModalEliminar(selectedClient),
      disabled: !selectedClient,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: fetchClients,
      disabled: false,
    },
  ];

  return (
    <div className="d-flex">
      <Sidebar />

      <div className="page-container flex-grow-1 p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Clientes</h1>
          {selectedClient ? (
            <small className="text-muted">
              Seleccionado: <strong>{selectedClient.razon_social}</strong>
            </small>
          ) : (
            <small className="text-muted">Selecciona un cliente para Editar/Eliminar</small>
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
                placeholder="Razón social, NIT, teléfono, dirección, correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                className="btn btn-secondary  w-100"
                type="button"
                onClick={() => {
                  setSearch("");
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
                <th>NIT</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Correo</th>
                <th style={{ width: 120 }} className="text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((c, idx) => {
                const isSelected = c.id === selectedId;

                return (
                  <tr
                    key={c.id}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(c.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{c.razon_social}</td>
                    <td>{c.nit}</td>
                    <td>{c.telefono}</td>
                    <td>{c.direccion}</td>
                    <td>{c.email}</td>
                    <td className="text-center">
                      {Number(c.state) === 1 && (
                        <span className="badge bg-success">Activo</span>
                      )}
                      {Number(c.state) === 0 && (
                        <span className="badge bg-danger">Inactivo</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
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
      <div className="modal fade" id="addModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar cliente</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <form>
                {[
                  ["razon_social", "Razón social"],
                  ["nit", "NIT"],
                  ["telefono", "Teléfono"],
                  ["direccion", "Dirección"],
                  ["email", "Correo"],
                ].map(([field, label]) => (
                  <div className="mb-3" key={field}>
                    <label className="form-label">{label}</label>
                    <input
                      type={field === "email" ? "email" : "text"}
                      className={`form-control ${errores[field] ? "is-invalid" : ""}`}
                      value={nuevoCliente[field]}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, [field]: e.target.value })}
                    />
                    {errores[field] && <div className="invalid-feedback">{errores[field]}</div>}
                  </div>
                ))}
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-success" onClick={guardarNuevo}>Guardar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editar */}
      <div className="modal fade" id="editModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar cliente</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {clienteSeleccionado && (
                <form>
                  {[
                    ["razon_social", "Razón social"],
                    ["nit", "NIT"],
                    ["telefono", "Teléfono"],
                    ["direccion", "Dirección"],
                    ["email", "Correo"],
                  ].map(([field, label]) => (
                    <div className="mb-3" key={field}>
                      <label className="form-label">{label}</label>
                      <input
                        type={field === "email" ? "email" : "text"}
                        className={`form-control ${errores[field] ? "is-invalid" : ""}`}
                        value={clienteSeleccionado[field]}
                        onChange={(e) =>
                          setClienteSeleccionado({ ...clienteSeleccionado, [field]: e.target.value })
                        }
                      />
                      {errores[field] && <div className="invalid-feedback">{errores[field]}</div>}
                    </div>
                  ))}
                </form>
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
      <div className="modal fade" id="deleteModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Confirmar eliminación</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {clienteAEliminar && (
                <p>
                  ¿Seguro que deseas eliminar a <strong>{clienteAEliminar.razon_social}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-danger" onClick={confirmarEliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clients;