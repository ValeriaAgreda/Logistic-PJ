import React, { useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";

const tipoInicial = {
  descripcion: "",
};

const DocumentType = () => {
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [nuevoTipo, setNuevoTipo] = useState(tipoInicial);
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [tipoAEliminar, setTipoAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const validar = (tipo) => {
    const e = {};

    if (!tipo.descripcion || !tipo.descripcion.trim()) {
      e.descripcion = "La descripcion es obligatoria.";
    } else if (tipo.descripcion.trim().length > 50) {
      e.descripcion = "La descripcion no puede superar 50 caracteres.";
    }

    return e;
  };

  const cargarTiposDocumento = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/tipo-documento", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener tipos de documento");
        return;
      }

      setTiposDocumento(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener tipos de documento:", error);
    }
  };

  useEffect(() => {
    cargarTiposDocumento();
  }, []);

  const abrirNuevo = () => {
    setNuevoTipo(tipoInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addTipoDocumentoModal")).show();
  };

  const abrirEditar = (tipo) => {
    if (!tipo) return;
    setTipoSeleccionado({ ...tipo });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editTipoDocumentoModal")).show();
  };

  const abrirEliminar = (tipo) => {
    if (!tipo) return;
    setTipoAEliminar(tipo);
    new bootstrap.Modal(document.getElementById("deleteTipoDocumentoModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevoTipo);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/tipo-documento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          descripcion: nuevoTipo.descripcion.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear tipo de documento");
        return;
      }

      await cargarTiposDocumento();
      bootstrap.Modal.getInstance(
        document.getElementById("addTipoDocumentoModal")
      )?.hide();
      setNuevoTipo(tipoInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear tipo de documento:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!tipoSeleccionado) return;

    const e = validar(tipoSeleccionado);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/tipo-documento/${tipoSeleccionado.id_tipo_documento}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            descripcion: tipoSeleccionado.descripcion.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar tipo de documento");
        return;
      }

      await cargarTiposDocumento();
      bootstrap.Modal.getInstance(
        document.getElementById("editTipoDocumentoModal")
      )?.hide();
      setTipoSeleccionado(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar tipo de documento:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarTipoDocumento = async () => {
    if (!tipoAEliminar) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/tipo-documento/${tipoAEliminar.id_tipo_documento}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar tipo de documento");
        return;
      }

      await cargarTiposDocumento();
      bootstrap.Modal.getInstance(
        document.getElementById("deleteTipoDocumentoModal")
      )?.hide();
      setTipoAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar tipo de documento:", error);
      alert("Error en el servidor");
    }
  };

  const tipoSeleccionadoTabla = useMemo(
    () =>
      tiposDocumento.find((t) => t.id_tipo_documento === selectedId) || null,
    [tiposDocumento, selectedId]
  );

  const tiposFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    return tiposDocumento.filter(
      (t) => !q || String(t.descripcion || "").toLowerCase().includes(q)
    );
  }, [tiposDocumento, search]);

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
      onClick: () => abrirEditar(tipoSeleccionadoTabla),
      disabled: !tipoSeleccionadoTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(tipoSeleccionadoTabla),
      disabled: !tipoSeleccionadoTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: cargarTiposDocumento,
      disabled: false,
    },
  ];

  return (
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestion de Tipos de Documento</h1>

          {tipoSeleccionadoTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{tipoSeleccionadoTabla.descripcion}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona un tipo de documento para Editar/Eliminar
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
                placeholder="Buscar por descripcion..."
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
                <th>Descripcion</th>
              </tr>
            </thead>
            <tbody>
              {tiposFiltrados.map((t, idx) => {
                const isSelected = t.id_tipo_documento === selectedId;

                return (
                  <tr
                    key={t.id_tipo_documento}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(t.id_tipo_documento)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{t.descripcion}</td>
                  </tr>
                );
              })}

              {tiposFiltrados.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center py-4 text-muted">
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
        id="addTipoDocumentoModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar tipo de documento</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Descripcion</label>
                <input
                  type="text"
                  className={`form-control ${
                    errores.descripcion ? "is-invalid" : ""
                  }`}
                  value={nuevoTipo.descripcion}
                  onChange={(e) =>
                    setNuevoTipo({
                      ...nuevoTipo,
                      descripcion: e.target.value,
                    })
                  }
                />
                {errores.descripcion && (
                  <div className="invalid-feedback">
                    {errores.descripcion}
                  </div>
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
        id="editTipoDocumentoModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar tipo de documento</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {tipoSeleccionado && (
                <div className="mb-3">
                  <label className="form-label">Descripcion</label>
                  <input
                    type="text"
                    className={`form-control ${
                      errores.descripcion ? "is-invalid" : ""
                    }`}
                    value={tipoSeleccionado.descripcion || ""}
                    onChange={(e) =>
                      setTipoSeleccionado({
                        ...tipoSeleccionado,
                        descripcion: e.target.value,
                      })
                    }
                  />
                  {errores.descripcion && (
                    <div className="invalid-feedback">
                      {errores.descripcion}
                    </div>
                  )}
                </div>
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
        id="deleteTipoDocumentoModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar tipo de documento</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {tipoAEliminar && (
                <p>
                  Seguro que deseas desactivar{" "}
                  <strong>{tipoAEliminar.descripcion}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarTipoDocumento}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DocumentType;

