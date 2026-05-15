import React, { useEffect, useMemo, useState } from "react";
import "../styles/clients.css";
import * as bootstrap from "bootstrap";

const clienteInicial = {
  razon_social: "",
  nit: "",
  contacto: "",
  telefono: "",
  correo: "",
  direccion: "",
  observacion: "",
  estado: 1,
};

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [nuevoCliente, setNuevoCliente] = useState(clienteInicial);
  const [errores, setErrores] = useState({});
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteAEliminar, setClienteAEliminar] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [search, setSearch] = useState("");

  const fetchClients = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/clientes", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al cargar clientes");
        return;
      }

      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const abrirModalNuevo = () => {
    setNuevoCliente(clienteInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addModal")).show();
  };

  const abrirModalEditar = (cliente) => {
    if (!cliente) return;
    setClienteSeleccionado({ ...cliente });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editModal")).show();
  };

  const abrirModalEliminar = (cliente) => {
    if (!cliente) return;
    setClienteAEliminar(cliente);
    new bootstrap.Modal(document.getElementById("deleteModal")).show();
  };

  const validar = (c) => {
    const e = {};

    if (!c.razon_social?.trim()) {
      e.razon_social = "La razón social es obligatoria.";
    }

    if (!/^\d{5,15}$/.test(String(c.nit || "").trim())) {
      e.nit = "El NIT debe tener entre 5 y 15 dígitos.";
    }

    if (!c.contacto?.trim()) {
      e.contacto = "El contacto es obligatorio.";
    }

    if (
      String(c.telefono || "").trim() &&
      !/^[67]\d{7}$/.test(String(c.telefono || "").trim())
    ) {
      e.telefono = "El teléfono debe tener 8 dígitos y empezar con 6 o 7.";
    }

    if (
      String(c.correo || "").trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.correo || "").trim())
    ) {
      e.correo = "El correo no es válido.";
    }

    return e;
  };

  const guardarNuevo = async () => {
    const errs = validar(nuevoCliente);
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }

    const body = {
      ...nuevoCliente,
      telefono: nuevoCliente.telefono.trim(),
      correo: nuevoCliente.correo.trim().toLowerCase(),
      direccion: nuevoCliente.direccion.trim(),
      observacion: nuevoCliente.observacion?.trim() || "",
    };

    try {
      const res = await fetch("http://localhost:3001/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear cliente");
        return;
      }

      await fetchClients();
      bootstrap.Modal.getInstance(document.getElementById("addModal"))?.hide();
      setNuevoCliente(clienteInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear cliente:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!clienteSeleccionado) return;

    const errs = validar(clienteSeleccionado);
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }

    const body = {
      ...clienteSeleccionado,
      telefono: String(clienteSeleccionado.telefono || "").trim(),
      correo: String(clienteSeleccionado.correo || "").trim().toLowerCase(),
      direccion: String(clienteSeleccionado.direccion || "").trim(),
      observacion: clienteSeleccionado.observacion?.trim() || "",
      estado: clienteSeleccionado.estado,
    };

    try {
      const res = await fetch(
        `http://localhost:3001/api/clientes/${clienteSeleccionado.id_cliente}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar cliente");
        return;
      }

      await fetchClients();
      bootstrap.Modal.getInstance(document.getElementById("editModal"))?.hide();
      setClienteSeleccionado(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
      alert("Error en el servidor");
    }
  };

  const confirmarEliminar = async () => {
    if (!clienteAEliminar) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/clientes/${clienteAEliminar.id_cliente}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar cliente");
        return;
      }

      await fetchClients();
      bootstrap.Modal.getInstance(document.getElementById("deleteModal"))?.hide();
      setClienteAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      alert("Error en el servidor");
    }
  };

  const selectedClient = useMemo(
    () => clients.find((c) => c.id_cliente === selectedId) || null,
    [clients, selectedId]
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();

    return clients.filter((c) => {
      return (
        !q ||
        String(c.razon_social || "").toLowerCase().includes(q) ||
        String(c.nit || "").toLowerCase().includes(q) ||
        String(c.contacto || "").toLowerCase().includes(q) ||
        String(c.telefono || "").toLowerCase().includes(q) ||
        String(c.direccion || "").toLowerCase().includes(q) ||
        String(c.correo || "").toLowerCase().includes(q) ||
        String(c.observacion || "").toLowerCase().includes(q)
      );
    });
  }, [clients, search]);

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
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Clientes</h1>
          {selectedClient ? (
            <small className="text-muted">
              Seleccionado: <strong>{selectedClient.razon_social}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona un cliente para Editar/Eliminar
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
            <div className="col-12 col-md-6">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Razón social, NIT, contacto, teléfono, dirección, correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3 d-flex gap-2">
              <button
                className="btn btn-secondary w-100"
                type="button"
                onClick={() => {
                  setSearch("");
                }}
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
                <th>Razón social</th>
                <th>NIT</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Correo</th>
              </tr>
            </thead>

            <tbody>
              {filteredClients.map((c, idx) => {
                const isSelected = c.id_cliente === selectedId;

                return (
                  <tr
                    key={c.id_cliente}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(c.id_cliente)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{c.razon_social}</td>
                    <td>{c.nit}</td>
                    <td>{c.contacto}</td>
                    <td>{c.telefono}</td>
                    <td>{c.direccion}</td>
                    <td>{c.correo}</td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal fade" id="addModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar cliente</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <form>
                {[
                  ["razon_social", "Razón social", "text"],
                  ["nit", "NIT", "text"],
                  ["contacto", "Contacto", "text"],
                  ["telefono", "Teléfono", "text"],
                  ["correo", "Correo", "email"],
                  ["direccion", "Dirección", "text"],
                ].map(([field, label, type]) => (
                  <div className="mb-3" key={field}>
                    <label className="form-label">{label}</label>
                    <input
                      type={type}
                      className={`form-control ${errores[field] ? "is-invalid" : ""}`}
                      value={nuevoCliente[field]}
                      onChange={(e) =>
                        setNuevoCliente({ ...nuevoCliente, [field]: e.target.value })
                      }
                    />
                    {errores[field] && (
                      <div className="invalid-feedback">{errores[field]}</div>
                    )}
                  </div>
                ))}

                <div className="mb-3">
                  <label className="form-label">Observación</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={nuevoCliente.observacion}
                    onChange={(e) =>
                      setNuevoCliente({
                        ...nuevoCliente,
                        observacion: e.target.value,
                      })
                    }
                  />
                </div>
              </form>
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

      <div className="modal fade" id="editModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar cliente</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {clienteSeleccionado && (
                <form>
                  {[
                    ["razon_social", "Razón social", "text"],
                    ["nit", "NIT", "text"],
                    ["contacto", "Contacto", "text"],
                    ["telefono", "Teléfono", "text"],
                    ["correo", "Correo", "email"],
                    ["direccion", "Dirección", "text"],
                  ].map(([field, label, type]) => (
                    <div className="mb-3" key={field}>
                      <label className="form-label">{label}</label>
                      <input
                        type={type}
                        className={`form-control ${errores[field] ? "is-invalid" : ""}`}
                        value={clienteSeleccionado[field] || ""}
                        onChange={(e) =>
                          setClienteSeleccionado({
                            ...clienteSeleccionado,
                            [field]: e.target.value,
                          })
                        }
                      />
                      {errores[field] && (
                        <div className="invalid-feedback">{errores[field]}</div>
                      )}
                    </div>
                  ))}

                  <div className="mb-3">
                    <label className="form-label">Observación</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={clienteSeleccionado.observacion || ""}
                      onChange={(e) =>
                        setClienteSeleccionado({
                          ...clienteSeleccionado,
                          observacion: e.target.value,
                        })
                      }
                    />
                  </div>
                </form>
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
                  ¿Seguro que deseas desactivar a{" "}
                  <strong>{clienteAEliminar.razon_social}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmarEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Clients;
