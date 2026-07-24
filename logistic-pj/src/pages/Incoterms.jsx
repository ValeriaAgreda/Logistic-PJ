import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";

const API = "http://localhost:3001/api/incoterms";
const inicial = { descripcion: "" };

const Incoterms = () => {
  const [registros, setRegistros] = useState([]);
  const [nuevo, setNuevo] = useState(inicial);
  const [seleccionado, setSeleccionado] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [errores, setErrores] = useState({});
  const [search, setSearch] = useState("");

  const validar = (registro) => {
    const e = {};
    const descripcion = String(registro?.descripcion || "").trim();
    if (!descripcion) {
      e.descripcion = "La descripcion es obligatoria.";
    } else if (descripcion.length > 50) {
      e.descripcion = "La descripcion no puede superar 50 caracteres.";
    } else if (!/^[A-Za-z]+$/.test(descripcion)) {
      e.descripcion = "La descripcion solo puede contener letras.";
    }
    return e;
  };

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error en la solicitud");
    return data;
  };

  const cargar = useCallback(async () => {
    try {
      const data = await request(API);
      setRegistros(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener Incoterms:", error);
      alert(error.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setNuevo(inicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addIncotermModal")).show();
  };

  const abrirEditar = (registro) => {
    if (!registro) return;
    setSeleccionado({ ...registro });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editIncotermModal")).show();
  };

  const abrirEliminar = (registro) => {
    if (!registro) return;
    setAEliminar(registro);
    new bootstrap.Modal(document.getElementById("deleteIncotermModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevo);
    if (Object.keys(e).length) return setErrores(e);
    try {
      await request(API, {
        method: "POST",
        body: JSON.stringify({ descripcion: nuevo.descripcion.trim().toUpperCase() }),
      });
      await cargar();
      bootstrap.Modal.getInstance(document.getElementById("addIncotermModal"))?.hide();
      setNuevo(inicial);
      setErrores({});
    } catch (error) {
      alert(error.message);
    }
  };

  const guardarEdicion = async () => {
    if (!seleccionado) return;
    const e = validar(seleccionado);
    if (Object.keys(e).length) return setErrores(e);
    try {
      await request(`${API}/${seleccionado.id_incoterm}`, {
        method: "PUT",
        body: JSON.stringify({
          descripcion: seleccionado.descripcion.trim().toUpperCase(),
        }),
      });
      await cargar();
      bootstrap.Modal.getInstance(document.getElementById("editIncotermModal"))?.hide();
      setSeleccionado(null);
      setSelectedId(null);
      setErrores({});
    } catch (error) {
      alert(error.message);
    }
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    try {
      await request(`${API}/${aEliminar.id_incoterm}`, { method: "DELETE" });
      await cargar();
      bootstrap.Modal.getInstance(document.getElementById("deleteIncotermModal"))?.hide();
      setAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const seleccionadoTabla = useMemo(
    () => registros.find((item) => item.id_incoterm === selectedId) || null,
    [registros, selectedId]
  );

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registros.filter(
      (item) => !q || String(item.descripcion || "").toLowerCase().includes(q)
    );
  }, [registros, search]);

  const campoDescripcion = (state, setter) => (
    <div className="mb-3">
      <label className="form-label">Descripcion</label>
      <input
        type="text"
        maxLength={50}
        className={`form-control ${errores.descripcion ? "is-invalid" : ""}`}
        value={state.descripcion || ""}
        onChange={(event) =>
          setter({
            ...state,
            descripcion: event.target.value.replace(/[^A-Za-z]/g, "").toUpperCase(),
          })
        }
        placeholder="Ejemplo: FOB"
      />
      {errores.descripcion ? (
        <div className="invalid-feedback">{errores.descripcion}</div>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestion de Incoterms</h1>
          <small className="text-muted">
            {seleccionadoTabla ? (
              <>Seleccionado: <strong>{seleccionadoTabla.descripcion}</strong></>
            ) : (
              "Selecciona un Incoterm para Editar/Eliminar"
            )}
          </small>
        </div>

        <div className="ui-card mb-3">
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-orange" type="button" onClick={abrirNuevo}>
              Nuevo
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!seleccionadoTabla}
              onClick={() => abrirEditar(seleccionadoTabla)}
            >
              Editar
            </button>
            <button
              className="btn btn-danger"
              type="button"
              disabled={!seleccionadoTabla}
              onClick={() => abrirEliminar(seleccionadoTabla)}
            >
              Eliminar
            </button>
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
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="col-12 col-md-3">
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
                <th>Descripcion</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item, index) => (
                <tr
                  key={item.id_incoterm}
                  className={item.id_incoterm === selectedId ? "row-selected" : ""}
                  onClick={() => setSelectedId(item.id_incoterm)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="text-center">{index + 1}</td>
                  <td>{item.descripcion}</td>
                </tr>
              ))}
              {!filtrados.length ? (
                <tr>
                  <td colSpan={2} className="text-center py-4 text-muted">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal fade" id="addIncotermModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar Incoterm</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">{campoDescripcion(nuevo, setNuevo)}</div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-success" onClick={guardarNuevo}>Guardar</button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="editIncotermModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar Incoterm</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {seleccionado ? campoDescripcion(seleccionado, setSeleccionado) : null}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-primary" onClick={guardarEdicion}>Guardar cambios</button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="deleteIncotermModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar Incoterm</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {aEliminar ? (
                <p>¿Seguro que deseas desactivar <strong>{aEliminar.descripcion}</strong>?</p>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-danger" onClick={eliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Incoterms;
