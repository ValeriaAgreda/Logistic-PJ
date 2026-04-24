import React, { useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";

const relacionInicial = {
  id_proveedor: "",
  id_ruta: "",
};

const SupplierRoutes = () => {
  const [relaciones, setRelaciones] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [nuevaRelacion, setNuevaRelacion] = useState(relacionInicial);
  const [relacionSeleccionada, setRelacionSeleccionada] = useState(null);
  const [relacionAEliminar, setRelacionAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [search, setSearch] = useState("");

  const construirKey = (idProveedor, idRuta) => `${idProveedor}-${idRuta}`;

  const validar = (relacion) => {
    const e = {};

    if (!relacion.id_proveedor) {
      e.id_proveedor = "El proveedor es obligatorio.";
    }

    if (!relacion.id_ruta) {
      e.id_ruta = "La ruta es obligatoria.";
    }

    return e;
  };

  const cargarRelaciones = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/proveedor-ruta", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener rutas de proveedor");
        return;
      }

      setRelaciones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener rutas de proveedor:", error);
    }
  };

  const cargarCatalogos = async () => {
    try {
      const [resProveedores, resRutas] = await Promise.all([
        fetch("http://localhost:3001/api/proveedores", {
          credentials: "include",
        }),
        fetch("http://localhost:3001/api/ruta", {
          credentials: "include",
        }),
      ]);

      const [dataProveedores, dataRutas] = await Promise.all([
        resProveedores.json(),
        resRutas.json(),
      ]);

      if (resProveedores.ok) {
        setProveedores(Array.isArray(dataProveedores) ? dataProveedores : []);
      } else {
        console.error(dataProveedores?.error || "Error al obtener proveedores");
      }

      if (resRutas.ok) {
        setRutas(Array.isArray(dataRutas) ? dataRutas : []);
      } else {
        console.error(dataRutas?.error || "Error al obtener rutas");
      }
    } catch (error) {
      console.error("Error al cargar catalogos de proveedor-ruta:", error);
    }
  };

  useEffect(() => {
    cargarRelaciones();
    cargarCatalogos();
  }, []);

  const abrirNuevo = () => {
    setNuevaRelacion(relacionInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addProveedorRutaModal")).show();
  };

  const abrirEditar = (relacion) => {
    if (!relacion) return;
    setRelacionSeleccionada({
      ...relacion,
      id_proveedor: String(relacion.id_proveedor),
      id_ruta: String(relacion.id_ruta),
      original_id_proveedor: relacion.id_proveedor,
      original_id_ruta: relacion.id_ruta,
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editProveedorRutaModal")).show();
  };

  const abrirEliminar = (relacion) => {
    if (!relacion) return;
    setRelacionAEliminar(relacion);
    new bootstrap.Modal(document.getElementById("deleteProveedorRutaModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevaRelacion);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/proveedor-ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id_proveedor: Number(nuevaRelacion.id_proveedor),
          id_ruta: Number(nuevaRelacion.id_ruta),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear ruta de proveedor");
        return;
      }

      await cargarRelaciones();
      bootstrap.Modal.getInstance(
        document.getElementById("addProveedorRutaModal")
      )?.hide();
      setNuevaRelacion(relacionInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear ruta de proveedor:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!relacionSeleccionada) return;

    const e = validar(relacionSeleccionada);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/proveedor-ruta/${relacionSeleccionada.original_id_proveedor}/${relacionSeleccionada.original_id_ruta}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            nuevo_id_proveedor: Number(relacionSeleccionada.id_proveedor),
            nuevo_id_ruta: Number(relacionSeleccionada.id_ruta),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar ruta de proveedor");
        return;
      }

      await cargarRelaciones();
      bootstrap.Modal.getInstance(
        document.getElementById("editProveedorRutaModal")
      )?.hide();
      setRelacionSeleccionada(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar ruta de proveedor:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarRelacion = async () => {
    if (!relacionAEliminar) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/proveedor-ruta/${relacionAEliminar.id_proveedor}/${relacionAEliminar.id_ruta}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar ruta de proveedor");
        return;
      }

      await cargarRelaciones();
      bootstrap.Modal.getInstance(
        document.getElementById("deleteProveedorRutaModal")
      )?.hide();
      setRelacionAEliminar(null);
      setSelectedKey(null);
    } catch (error) {
      console.error("Error al eliminar ruta de proveedor:", error);
      alert("Error en el servidor");
    }
  };

  const relacionSeleccionadaTabla = useMemo(
    () =>
      relaciones.find(
        (relacion) =>
          construirKey(relacion.id_proveedor, relacion.id_ruta) === selectedKey
      ) || null,
    [relaciones, selectedKey]
  );

  const relacionesFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();

    return relaciones.filter(
      (relacion) =>
        !q ||
        String(relacion.empresa || "").toLowerCase().includes(q) ||
        String(relacion.origen || "").toLowerCase().includes(q) ||
        String(relacion.destino || "").toLowerCase().includes(q)
    );
  }, [relaciones, search]);

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
      onClick: () => abrirEditar(relacionSeleccionadaTabla),
      disabled: !relacionSeleccionadaTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(relacionSeleccionadaTabla),
      disabled: !relacionSeleccionadaTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: async () => {
        await cargarRelaciones();
        await cargarCatalogos();
      },
      disabled: false,
    },
  ];

  return (
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Ruta de Proveedores</h1>

          {relacionSeleccionadaTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{relacionSeleccionadaTabla.empresa}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona una relacion para Editar/Eliminar
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
                placeholder="Proveedor, origen o destino..."
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
                <th>Proveedor</th>
                <th>Origen</th>
                <th>Destino</th>
              </tr>
            </thead>
            <tbody>
              {relacionesFiltradas.map((relacion, idx) => {
                const key = construirKey(relacion.id_proveedor, relacion.id_ruta);
                const isSelected = key === selectedKey;

                return (
                  <tr
                    key={key}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedKey(key)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{relacion.empresa}</td>
                    <td>{relacion.origen}</td>
                    <td>{relacion.destino}</td>
                  </tr>
                );
              })}

              {relacionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="modal fade"
        id="addProveedorRutaModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar ruta de proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Proveedor</label>
                <select
                  className={`form-select ${errores.id_proveedor ? "is-invalid" : ""}`}
                  value={nuevaRelacion.id_proveedor}
                  onChange={(e) =>
                    setNuevaRelacion({
                      ...nuevaRelacion,
                      id_proveedor: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar</option>
                  {proveedores.map((proveedor) => (
                    <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>
                      {proveedor.empresa}
                    </option>
                  ))}
                </select>
                {errores.id_proveedor && (
                  <div className="invalid-feedback">{errores.id_proveedor}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Ruta</label>
                <select
                  className={`form-select ${errores.id_ruta ? "is-invalid" : ""}`}
                  value={nuevaRelacion.id_ruta}
                  onChange={(e) =>
                    setNuevaRelacion({
                      ...nuevaRelacion,
                      id_ruta: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar</option>
                  {rutas.map((ruta) => (
                    <option key={ruta.id_ruta} value={ruta.id_ruta}>
                      {ruta.origen} - {ruta.destino}
                    </option>
                  ))}
                </select>
                {errores.id_ruta && (
                  <div className="invalid-feedback">{errores.id_ruta}</div>
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
        id="editProveedorRutaModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar ruta de proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {relacionSeleccionada && (
                <>
                  <div className="mb-3">
                    <label className="form-label">Proveedor</label>
                    <select
                      className={`form-select ${errores.id_proveedor ? "is-invalid" : ""}`}
                      value={relacionSeleccionada.id_proveedor}
                      onChange={(e) =>
                        setRelacionSeleccionada({
                          ...relacionSeleccionada,
                          id_proveedor: e.target.value,
                        })
                      }
                    >
                      <option value="">Seleccionar</option>
                      {proveedores.map((proveedor) => (
                        <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>
                          {proveedor.empresa}
                        </option>
                      ))}
                    </select>
                    {errores.id_proveedor && (
                      <div className="invalid-feedback">{errores.id_proveedor}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Ruta</label>
                    <select
                      className={`form-select ${errores.id_ruta ? "is-invalid" : ""}`}
                      value={relacionSeleccionada.id_ruta}
                      onChange={(e) =>
                        setRelacionSeleccionada({
                          ...relacionSeleccionada,
                          id_ruta: e.target.value,
                        })
                      }
                    >
                      <option value="">Seleccionar</option>
                      {rutas.map((ruta) => (
                        <option key={ruta.id_ruta} value={ruta.id_ruta}>
                          {ruta.origen} - {ruta.destino}
                        </option>
                      ))}
                    </select>
                    {errores.id_ruta && (
                      <div className="invalid-feedback">{errores.id_ruta}</div>
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
        id="deleteProveedorRutaModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar ruta de proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {relacionAEliminar && (
                <p>
                  Seguro que deseas eliminar la ruta{" "}
                  <strong>
                    {relacionAEliminar.origen} - {relacionAEliminar.destino}
                  </strong>{" "}
                  del proveedor <strong>{relacionAEliminar.empresa}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarRelacion}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SupplierRoutes;

