import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";
import "../styles/documents.css";

const documentoInicial = {
  id_tipo_documento: "",
  id_operacion: "",
  numero_documento: "",
  fecha_documento: "",
  ruta_documento: "",
  descripcion: "",
  archivo_nombre: "",
  archivo_base64: "",
};

const obtenerHeadersAuth = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id_usuario ? { "x-user-id": String(user.id_usuario) } : {};
  } catch {
    return {};
  }
};

const Documents = () => {
  const [documentos, setDocumentos] = useState([]);
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [operaciones, setOperaciones] = useState([]);
  const [nuevoDocumento, setNuevoDocumento] = useState(documentoInicial);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [documentoAEliminar, setDocumentoAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const leerArchivoComoBase64 = (archivo) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(archivo);
    });

  const request = async (url, options = {}) => {
    const res = await fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...obtenerHeadersAuth(),
        ...(options.headers || {}),
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || data?.detalle || "Error en la solicitud");
    }

    return data;
  };

  const validar = (documento) => {
    const e = {};
    if (!documento.id_tipo_documento) e.id_tipo_documento = "Selecciona un tipo de documento.";
    if (!documento.id_operacion) e.id_operacion = "Selecciona una operacion.";
    if (!documento.numero_documento?.trim()) e.numero_documento = "El numero de documento es obligatorio.";
    else if (documento.numero_documento.trim().length > 50) e.numero_documento = "El numero de documento no puede superar 50 caracteres.";
    if (!documento.fecha_documento) e.fecha_documento = "La fecha del documento es obligatoria.";
    if (!documento.ruta_documento?.trim() && !documento.archivo_base64) {
      e.ruta_documento = "Selecciona un archivo para guardar la ruta.";
    }
    if (!documento.descripcion?.trim()) e.descripcion = "La descripcion es obligatoria.";
    else if (documento.descripcion.trim().length > 50) e.descripcion = "La descripcion no puede superar 50 caracteres.";
    return e;
  };

  const cargarDatos = useCallback(async () => {
    try {
      const [documentosData, tiposData, operacionesData] = await Promise.all([
        request("http://localhost:3001/api/documento"),
        request("http://localhost:3001/api/tipo-documento"),
        request("http://localhost:3001/api/operaciones"),
      ]);

      setDocumentos(Array.isArray(documentosData) ? documentosData : []);
      setTiposDocumento(Array.isArray(tiposData) ? tiposData : []);
      setOperaciones(Array.isArray(operacionesData) ? operacionesData : []);
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      alert(error.message || "Error al cargar documentos");
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirNuevo = () => {
    setNuevoDocumento(documentoInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addDocumentoModal")).show();
  };

  const abrirEditar = (documento) => {
    if (!documento) return;
    setDocumentoSeleccionado({
      ...documentoInicial,
      ...documento,
      id_tipo_documento: String(documento.id_tipo_documento ?? ""),
      id_operacion: String(documento.id_operacion ?? ""),
      fecha_documento: documento.fecha_documento?.slice(0, 10) || "",
      archivo_nombre: "",
      archivo_base64: "",
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editDocumentoModal")).show();
  };

  const abrirEliminar = (documento) => {
    if (!documento) return;
    setDocumentoAEliminar(documento);
    new bootstrap.Modal(document.getElementById("deleteDocumentoModal")).show();
  };

  const normalizarPayload = (documento) => ({
    id_tipo_documento: Number(documento.id_tipo_documento),
    id_operacion: Number(documento.id_operacion),
    numero_documento: documento.numero_documento.trim(),
    fecha_documento: documento.fecha_documento,
    ruta_documento: documento.ruta_documento.trim(),
    descripcion: documento.descripcion.trim(),
    archivo_nombre: documento.archivo_nombre || null,
    archivo_base64: documento.archivo_base64 || null,
  });

  const seleccionarArchivo = async (archivo, state, setState) => {
    if (!archivo) return;

    try {
      const archivoBase64 = await leerArchivoComoBase64(archivo);
      setState({
        ...state,
        archivo_nombre: archivo.name,
        archivo_base64: archivoBase64,
        ruta_documento: `/uploads/documentos/${archivo.name}`,
      });
    } catch (error) {
      console.error("Error al leer archivo:", error);
      alert(error.message || "No se pudo leer el archivo");
    }
  };

  const guardarNuevo = async () => {
    const e = validar(nuevoDocumento);
    if (Object.keys(e).length > 0) return setErrores(e);

    try {
      await request("http://localhost:3001/api/documento", {
        method: "POST",
        body: JSON.stringify(normalizarPayload(nuevoDocumento)),
      });
      await cargarDatos();
      bootstrap.Modal.getInstance(document.getElementById("addDocumentoModal"))?.hide();
      setNuevoDocumento(documentoInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear documento:", error);
      alert(error.message || "Error al crear documento");
    }
  };

  const guardarEdicion = async () => {
    if (!documentoSeleccionado) return;
    const e = validar(documentoSeleccionado);
    if (Object.keys(e).length > 0) return setErrores(e);

    try {
      await request(`http://localhost:3001/api/documento/${documentoSeleccionado.id_documento}`, {
        method: "PUT",
        body: JSON.stringify(normalizarPayload(documentoSeleccionado)),
      });
      await cargarDatos();
      bootstrap.Modal.getInstance(document.getElementById("editDocumentoModal"))?.hide();
      setDocumentoSeleccionado(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar documento:", error);
      alert(error.message || "Error al actualizar documento");
    }
  };

  const eliminarDocumento = async () => {
    if (!documentoAEliminar) return;
    try {
      await request(`http://localhost:3001/api/documento/${documentoAEliminar.id_documento}`, { method: "DELETE" });
      await cargarDatos();
      bootstrap.Modal.getInstance(document.getElementById("deleteDocumentoModal"))?.hide();
      setDocumentoAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar documento:", error);
      alert(error.message || "Error al eliminar documento");
    }
  };

  const documentoSeleccionadoTabla = useMemo(() => documentos.find((d) => d.id_documento === selectedId) || null, [documentos, selectedId]);

  const documentosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documentos.filter((documento) => !q || [documento.tipo_documento, documento.codigo_operacion, documento.numero_documento, documento.ruta_documento, documento.descripcion].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [documentos, search]);

  const renderSelect = (label, field, state, setState, opciones, valueKey, labelBuilder) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <select className={`form-select ${errores[field] ? "is-invalid" : ""}`} value={state[field] || ""} onChange={(e) => setState({ ...state, [field]: e.target.value })}>
        <option value="">Seleccionar</option>
        {opciones.map((opcion) => <option key={opcion[valueKey]} value={opcion[valueKey]}>{labelBuilder(opcion)}</option>)}
      </select>
      {errores[field] ? <div className="invalid-feedback">{errores[field]}</div> : null}
    </div>
  );

  return (
    <>
      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Documentos</h1>
          {documentoSeleccionadoTabla ? <small className="text-muted">Seleccionado: <strong>{documentoSeleccionadoTabla.numero_documento}</strong></small> : <small className="text-muted">Selecciona un documento para Editar/Eliminar</small>}
        </div>

        <div className="ui-card mb-3"><div className="d-flex flex-wrap gap-2"><button className="btn btn-orange" onClick={abrirNuevo} type="button">Nuevo</button><button className="btn btn-primary" onClick={() => abrirEditar(documentoSeleccionadoTabla)} disabled={!documentoSeleccionadoTabla} type="button">Editar</button><button className="btn btn-danger" onClick={() => abrirEliminar(documentoSeleccionadoTabla)} disabled={!documentoSeleccionadoTabla} type="button">Eliminar</button><button className="btn btn-outline-light" onClick={cargarDatos} type="button">Refrescar</button></div></div>

        <div className="ui-card mb-3"><div className="row g-2 align-items-end"><div className="col-12 col-md-9"><label className="form-label">Buscar</label><input className="form-control" placeholder="Tipo, operacion, numero, ruta o descripcion..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="col-12 col-md-3 d-flex gap-2"><button className="btn btn-secondary w-100" type="button" onClick={() => setSearch("")}>Limpiar</button></div></div></div>

        <div className="table-responsive ui-card"><table className="table table-hover table-bordered align-middle m-0"><thead className="table-light"><tr><th style={{ width: 48 }} className="text-center">#</th><th>Tipo</th><th>Operacion</th><th>Numero</th><th>Fecha</th><th>Ruta</th><th>Descripcion</th><th>Registro</th></tr></thead><tbody>{documentosFiltrados.map((documento, idx) => <tr key={documento.id_documento} className={documento.id_documento === selectedId ? "row-selected" : ""} onClick={() => setSelectedId(documento.id_documento)} style={{ cursor: "pointer" }}><td className="text-center">{idx + 1}</td><td>{documento.tipo_documento}</td><td>{documento.codigo_operacion}</td><td>{documento.numero_documento}</td><td>{documento.fecha_documento ? new Date(documento.fecha_documento).toLocaleDateString("es-BO") : "-"}</td><td className="document-route">{documento.ruta_documento ? <a href={`http://localhost:3001${documento.ruta_documento}`} target="_blank" rel="noreferrer">{documento.ruta_documento}</a> : "-"}</td><td>{documento.descripcion}</td><td>{documento.fecha_registro ? new Date(documento.fecha_registro).toLocaleString("es-BO") : "-"}</td></tr>)}{documentosFiltrados.length === 0 ? <tr><td colSpan={8} className="text-center py-4 text-muted">No hay documentos activos con los filtros actuales.</td></tr> : null}</tbody></table></div>
      </div>

      <div className="modal fade" id="addDocumentoModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Agregar documento</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{renderSelect("Tipo de documento", "id_tipo_documento", nuevoDocumento, setNuevoDocumento, tiposDocumento, "id_tipo_documento", (o) => o.descripcion)}{renderSelect("Operacion", "id_operacion", nuevoDocumento, setNuevoDocumento, operaciones, "id_operacion", (o) => o.codigo_operacion)}<div className="mb-3"><label className="form-label">Numero de documento</label><input type="text" className={`form-control ${errores.numero_documento ? "is-invalid" : ""}`} value={nuevoDocumento.numero_documento} onChange={(e) => setNuevoDocumento({ ...nuevoDocumento, numero_documento: e.target.value })} />{errores.numero_documento ? <div className="invalid-feedback">{errores.numero_documento}</div> : null}</div><div className="mb-3"><label className="form-label">Fecha del documento</label><input type="date" className={`form-control ${errores.fecha_documento ? "is-invalid" : ""}`} value={nuevoDocumento.fecha_documento} onChange={(e) => setNuevoDocumento({ ...nuevoDocumento, fecha_documento: e.target.value })} />{errores.fecha_documento ? <div className="invalid-feedback">{errores.fecha_documento}</div> : null}</div><div className="mb-3"><label className="form-label">Archivo</label><input type="file" className={`form-control ${errores.ruta_documento ? "is-invalid" : ""}`} onChange={(e) => seleccionarArchivo(e.target.files?.[0], nuevoDocumento, setNuevoDocumento)} />{errores.ruta_documento ? <div className="invalid-feedback">{errores.ruta_documento}</div> : null}</div><div className="mb-3"><label className="form-label">Ruta guardada</label><input type="text" className="form-control" value={nuevoDocumento.archivo_nombre || nuevoDocumento.ruta_documento} readOnly /></div><div className="mb-3"><label className="form-label">Descripcion</label><input type="text" className={`form-control ${errores.descripcion ? "is-invalid" : ""}`} value={nuevoDocumento.descripcion} onChange={(e) => setNuevoDocumento({ ...nuevoDocumento, descripcion: e.target.value })} />{errores.descripcion ? <div className="invalid-feedback">{errores.descripcion}</div> : null}</div></div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-success" onClick={guardarNuevo}>Guardar</button></div></div></div></div>
      <div className="modal fade" id="editDocumentoModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Editar documento</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{documentoSeleccionado ? <>{renderSelect("Tipo de documento", "id_tipo_documento", documentoSeleccionado, setDocumentoSeleccionado, tiposDocumento, "id_tipo_documento", (o) => o.descripcion)}{renderSelect("Operacion", "id_operacion", documentoSeleccionado, setDocumentoSeleccionado, operaciones, "id_operacion", (o) => o.codigo_operacion)}<div className="mb-3"><label className="form-label">Numero de documento</label><input type="text" className={`form-control ${errores.numero_documento ? "is-invalid" : ""}`} value={documentoSeleccionado.numero_documento || ""} onChange={(e) => setDocumentoSeleccionado({ ...documentoSeleccionado, numero_documento: e.target.value })} />{errores.numero_documento ? <div className="invalid-feedback">{errores.numero_documento}</div> : null}</div><div className="mb-3"><label className="form-label">Fecha del documento</label><input type="date" className={`form-control ${errores.fecha_documento ? "is-invalid" : ""}`} value={documentoSeleccionado.fecha_documento || ""} onChange={(e) => setDocumentoSeleccionado({ ...documentoSeleccionado, fecha_documento: e.target.value })} />{errores.fecha_documento ? <div className="invalid-feedback">{errores.fecha_documento}</div> : null}</div><div className="mb-3"><label className="form-label">Reemplazar archivo</label><input type="file" className={`form-control ${errores.ruta_documento ? "is-invalid" : ""}`} onChange={(e) => seleccionarArchivo(e.target.files?.[0], documentoSeleccionado, setDocumentoSeleccionado)} />{errores.ruta_documento ? <div className="invalid-feedback">{errores.ruta_documento}</div> : null}</div><div className="mb-3"><label className="form-label">Ruta guardada</label><input type="text" className="form-control" value={documentoSeleccionado.archivo_nombre || documentoSeleccionado.ruta_documento || ""} readOnly /></div><div className="mb-3"><label className="form-label">Descripcion</label><input type="text" className={`form-control ${errores.descripcion ? "is-invalid" : ""}`} value={documentoSeleccionado.descripcion || ""} onChange={(e) => setDocumentoSeleccionado({ ...documentoSeleccionado, descripcion: e.target.value })} />{errores.descripcion ? <div className="invalid-feedback">{errores.descripcion}</div> : null}</div></> : null}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-primary" onClick={guardarEdicion}>Guardar cambios</button></div></div></div></div>
      <div className="modal fade" id="deleteDocumentoModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog modal-dialog-centered"><div className="modal-content shadow rounded-3"><div className="modal-header"><h5 className="modal-title">Eliminar documento</h5><button className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">{documentoAEliminar ? <p>Seguro que deseas desactivar el documento <strong>{documentoAEliminar.numero_documento}</strong>?</p> : null}</div><div className="modal-footer"><button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button className="btn btn-danger" onClick={eliminarDocumento}>Eliminar</button></div></div></div></div>
    </>
  );
};

export default Documents;

