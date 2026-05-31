import React, { useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";

const rutaInicial = {
  origen: "",
  destino: "",
};

const RouteCatalog = () => {
  const [rutas, setRutas] = useState([]);
  const [nuevaRuta, setNuevaRuta] = useState(rutaInicial);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [rutaAEliminar, setRutaAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const validar = (ruta) => {
    const e = {};

    if (!ruta.origen || !ruta.origen.trim()) {
      e.origen = "El origen es obligatorio.";
    } else if (ruta.origen.trim().length > 50) {
      e.origen = "El origen no puede superar 50 caracteres.";
    }

    if (!ruta.destino || !ruta.destino.trim()) {
      e.destino = "El destino es obligatorio.";
    } else if (ruta.destino.trim().length > 50) {
      e.destino = "El destino no puede superar 50 caracteres.";
    }

    return e;
  };

  const cargarRutas = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/ruta", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener rutas");
        return;
      }

      setRutas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener rutas:", error);
    }
  };

  useEffect(() => {
    cargarRutas();
  }, []);

  const abrirNuevo = () => {
    setNuevaRuta(rutaInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addRutaModal")).show();
  };

  const abrirEditar = (ruta) => {
    if (!ruta) return;
    setRutaSeleccionada({ ...ruta });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editRutaModal")).show();
  };

  const abrirEliminar = (ruta) => {
    if (!ruta) return;
    setRutaAEliminar(ruta);
    new bootstrap.Modal(document.getElementById("deleteRutaModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevaRuta);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          origen: nuevaRuta.origen.trim(),
          destino: nuevaRuta.destino.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear ruta");
        return;
      }

      await cargarRutas();
      bootstrap.Modal.getInstance(document.getElementById("addRutaModal"))?.hide();
      setNuevaRuta(rutaInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear ruta:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!rutaSeleccionada) return;

    const e = validar(rutaSeleccionada);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/ruta/${rutaSeleccionada.id_ruta}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            origen: rutaSeleccionada.origen.trim(),
            destino: rutaSeleccionada.destino.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar ruta");
        return;
      }

      await cargarRutas();
      bootstrap.Modal.getInstance(document.getElementById("editRutaModal"))?.hide();
      setRutaSeleccionada(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar ruta:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarRuta = async () => {
    if (!rutaAEliminar) return;

    try {
      const res = await fetch(`http://localhost:3001/api/ruta/${rutaAEliminar.id_ruta}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar ruta");
        return;
      }

      await cargarRutas();
      bootstrap.Modal.getInstance(document.getElementById("deleteRutaModal"))?.hide();
      setRutaAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar ruta:", error);
      alert("Error en el servidor");
    }
  };

  const rutaSeleccionadaTabla = useMemo(
    () => rutas.find((ruta) => ruta.id_ruta === selectedId) || null,
    [rutas, selectedId]
  );

  const rutasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rutas.filter(
      (ruta) =>
        !q ||
        String(ruta.origen || "").toLowerCase().includes(q) ||
        String(ruta.destino || "").toLowerCase().includes(q)
    );
  }, [rutas, search]);

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
      onClick: () => abrirEditar(rutaSeleccionadaTabla),
      disabled: !rutaSeleccionadaTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(rutaSeleccionadaTabla),
      disabled: !rutaSeleccionadaTabla,
    },
  ];

  return (
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Rutas</h1>

          {rutaSeleccionadaTabla ? (
            <small className="text-muted">
              Seleccionado:{" "}
              <strong>
                {rutaSeleccionadaTabla.origen} - {rutaSeleccionadaTabla.destino}
              </strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona una ruta para Editar/Eliminar
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
                placeholder="Buscar por origen o destino..."
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
                <th style={{ width: 48 }} className="text-center">
                  #
                </th>
                <th>Origen</th>
                <th>Destino</th>
              </tr>
            </thead>
            <tbody>
              {rutasFiltradas.map((ruta, idx) => {
                const isSelected = ruta.id_ruta === selectedId;

                return (
                  <tr
                    key={ruta.id_ruta}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(ruta.id_ruta)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{ruta.origen}</td>
                    <td>{ruta.destino}</td>
                  </tr>
                );
              })}

              {rutasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-muted">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal fade" id="addRutaModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar ruta</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {[
                ["origen", "Origen"],
                ["destino", "Destino"],
              ].map(([campo, label]) => (
                <div className="mb-3" key={campo}>
                  <label className="form-label">{label}</label>
                  <input
                    type="text"
                    className={`form-control ${errores[campo] ? "is-invalid" : ""}`}
                    value={nuevaRuta[campo]}
                    onChange={(e) =>
                      setNuevaRuta({
                        ...nuevaRuta,
                        [campo]: e.target.value,
                      })
                    }
                  />
                  {errores[campo] && (
                    <div className="invalid-feedback">{errores[campo]}</div>
                  )}
                </div>
              ))}
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

      <div className="modal fade" id="editRutaModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar ruta</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {rutaSeleccionada && (
                <>
                  {[
                    ["origen", "Origen"],
                    ["destino", "Destino"],
                  ].map(([campo, label]) => (
                    <div className="mb-3" key={campo}>
                      <label className="form-label">{label}</label>
                      <input
                        type="text"
                        className={`form-control ${errores[campo] ? "is-invalid" : ""}`}
                        value={rutaSeleccionada[campo] || ""}
                        onChange={(e) =>
                          setRutaSeleccionada({
                            ...rutaSeleccionada,
                            [campo]: e.target.value,
                          })
                        }
                      />
                      {errores[campo] && (
                        <div className="invalid-feedback">{errores[campo]}</div>
                      )}
                    </div>
                  ))}
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

      <div className="modal fade" id="deleteRutaModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar ruta</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {rutaAEliminar && (
                <p>
                  Seguro que deseas desactivar la ruta{" "}
                  <strong>
                    {rutaAEliminar.origen} - {rutaAEliminar.destino}
                  </strong>
                  ?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarRuta}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RouteCatalog;

