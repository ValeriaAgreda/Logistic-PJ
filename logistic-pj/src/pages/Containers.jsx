import React, { useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";
import ContainerFormFields from "../components/ContainerFormFields";

const contenedorInicial = {
  numero_contenedor: "",
  id_tipo_contenedor: "",
  peso_bruto: "",
};

const obtenerUsuarioLogueado = () => {
  try {
    const usuario = localStorage.getItem("user");
    return usuario ? JSON.parse(usuario) : null;
  } catch {
    return null;
  }
};

const formatoFecha = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString("es-BO");
};

const Containers = () => {
  const [contenedores, setContenedores] = useState([]);
  const [tiposContenedor, setTiposContenedor] = useState([]);
  const [nuevoContenedor, setNuevoContenedor] = useState(contenedorInicial);
  const [contenedorSeleccionado, setContenedorSeleccionado] = useState(null);
  const [contenedorAEliminar, setContenedorAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const validar = (contenedor) => {
    const e = {};

    if (!contenedor.numero_contenedor || !contenedor.numero_contenedor.trim()) {
      e.numero_contenedor = "El numero de contenedor es obligatorio.";
    } else if (contenedor.numero_contenedor.trim().length > 70) {
      e.numero_contenedor = "El numero de contenedor no puede superar 70 caracteres.";
    } else {
      const numeroNormalizado = contenedor.numero_contenedor.trim().toUpperCase();
      const numeroDuplicado = contenedores.some(
        (item) =>
          String(item.numero_contenedor || "").trim().toUpperCase() === numeroNormalizado &&
          Number(item.id_contenedor) !== Number(contenedor.id_contenedor || 0)
      );

      if (numeroDuplicado) {
        e.numero_contenedor = "Ya existe un contenedor registrado con ese numero.";
      }
    }

    if (!contenedor.id_tipo_contenedor) {
      e.id_tipo_contenedor = "Selecciona el tipo de contenedor.";
    }

    if (
      contenedor.peso_bruto !== "" &&
      contenedor.peso_bruto !== null &&
      Number.isNaN(Number(contenedor.peso_bruto))
    ) {
      e.peso_bruto = "El peso bruto debe ser numerico.";
    }

    return e;
  };

  const cargarContenedores = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/contenedores", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener contenedores");
        return;
      }

      setContenedores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener contenedores:", error);
    }
  };

  const cargarTiposContenedor = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/tipo-contenedor", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener tipos de contenedor");
        return;
      }

      setTiposContenedor(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener tipos de contenedor:", error);
    }
  };

  useEffect(() => {
    cargarContenedores();
    cargarTiposContenedor();
  }, []);

  const abrirNuevo = () => {
    setNuevoContenedor(contenedorInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addContainerModal")).show();
  };

  const abrirEditar = (contenedor) => {
    if (!contenedor) return;
    setContenedorSeleccionado({
      ...contenedor,
      id_tipo_contenedor: String(contenedor.id_tipo_contenedor ?? ""),
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editContainerModal")).show();
  };

  const abrirEliminar = (contenedor) => {
    if (!contenedor) return;
    setContenedorAEliminar(contenedor);
    new bootstrap.Modal(document.getElementById("deleteContainerModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevoContenedor);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const usuarioLogueado = obtenerUsuarioLogueado();
      const res = await fetch("http://localhost:3001/api/contenedores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(usuarioLogueado?.id_usuario
            ? { "x-user-id": String(usuarioLogueado.id_usuario) }
            : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          numero_contenedor: nuevoContenedor.numero_contenedor.trim().toUpperCase(),
          id_tipo_contenedor: Number(nuevoContenedor.id_tipo_contenedor),
          peso_bruto: nuevoContenedor.peso_bruto,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear contenedor");
        return;
      }

      await cargarContenedores();
      bootstrap.Modal.getInstance(
        document.getElementById("addContainerModal")
      )?.hide();
      setNuevoContenedor(contenedorInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear contenedor:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!contenedorSeleccionado) return;

    const e = validar(contenedorSeleccionado);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/contenedores/${contenedorSeleccionado.id_contenedor}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            numero_contenedor: contenedorSeleccionado.numero_contenedor.trim().toUpperCase(),
            id_tipo_contenedor: Number(contenedorSeleccionado.id_tipo_contenedor),
            peso_bruto: contenedorSeleccionado.peso_bruto,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar contenedor");
        return;
      }

      await cargarContenedores();
      bootstrap.Modal.getInstance(
        document.getElementById("editContainerModal")
      )?.hide();
      setContenedorSeleccionado(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar contenedor:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarContenedor = async () => {
    if (!contenedorAEliminar) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/contenedores/${contenedorAEliminar.id_contenedor}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar contenedor");
        return;
      }

      await cargarContenedores();
      bootstrap.Modal.getInstance(
        document.getElementById("deleteContainerModal")
      )?.hide();
      setContenedorAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar contenedor:", error);
      alert("Error en el servidor");
    }
  };

  const contenedorSeleccionadoTabla = useMemo(
    () =>
      contenedores.find((contenedor) => contenedor.id_contenedor === selectedId) ||
      null,
    [contenedores, selectedId]
  );

  const contenedoresFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    return contenedores.filter(
      (contenedor) =>
        !q ||
        String(contenedor.numero_contenedor || "").toLowerCase().includes(q) ||
        String(contenedor.tipo_contenedor || "").toLowerCase().includes(q)
    );
  }, [contenedores, search]);

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
      onClick: () => abrirEditar(contenedorSeleccionadoTabla),
      disabled: !contenedorSeleccionadoTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(contenedorSeleccionadoTabla),
      disabled: !contenedorSeleccionadoTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: async () => {
        await cargarContenedores();
        await cargarTiposContenedor();
      },
      disabled: false,
    },
  ];

  return (
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Contenedores</h1>

          {contenedorSeleccionadoTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{contenedorSeleccionadoTabla.numero_contenedor}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona un contenedor para Editar/Eliminar
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
                placeholder="Buscar por numero o tipo..."
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
                <th>Numero</th>
                <th>Tipo</th>
                <th>Peso Bruto</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {contenedoresFiltrados.map((contenedor, idx) => {
                const isSelected = contenedor.id_contenedor === selectedId;

                return (
                  <tr
                    key={contenedor.id_contenedor}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(contenedor.id_contenedor)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{contenedor.numero_contenedor}</td>
                    <td>{contenedor.tipo_contenedor || "-"}</td>
                    <td>{contenedor.peso_bruto ?? "-"}</td>
                    <td>{formatoFecha(contenedor.fecha_registro)}</td>
                  </tr>
                );
              })}

              {contenedoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    No hay resultados con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal fade" id="addContainerModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar contenedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <ContainerFormFields
                contenedor={nuevoContenedor}
                setContenedor={setNuevoContenedor}
                errores={errores}
                tiposContenedor={tiposContenedor}
              />
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

      <div className="modal fade" id="editContainerModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar contenedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {contenedorSeleccionado && (
                <ContainerFormFields
                  contenedor={contenedorSeleccionado}
                  setContenedor={setContenedorSeleccionado}
                  errores={errores}
                  tiposContenedor={tiposContenedor}
                />
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

      <div className="modal fade" id="deleteContainerModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar contenedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {contenedorAEliminar && (
                <p>
                  Seguro que deseas desactivar el contenedor{" "}
                  <strong>{contenedorAEliminar.numero_contenedor}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarContenedor}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Containers;
