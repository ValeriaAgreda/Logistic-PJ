import React, { useEffect, useMemo, useState } from "react";
import * as bootstrap from "bootstrap";

const cuentaInicial = {
  id_proveedor: "",
  banco: "",
  nro_cuenta: "",
  moneda: "",
  titular: "",
  observacion: "",
};

const NUMERO_CUENTA_REGEX = /^[A-Za-z0-9\s-]{5,34}$/;

const SupplierAccounts = () => {
  const [cuentas, setCuentas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [nuevaCuenta, setNuevaCuenta] = useState(cuentaInicial);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [cuentaAEliminar, setCuentaAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const validar = (cuenta) => {
    const e = {};

    if (!cuenta.id_proveedor) {
      e.id_proveedor = "El proveedor es obligatorio.";
    }

    if (!cuenta.banco || !cuenta.banco.trim()) {
      e.banco = "El banco es obligatorio.";
    } else if (cuenta.banco.trim().length > 50) {
      e.banco = "El banco no puede superar 50 caracteres.";
    }

    if (!cuenta.nro_cuenta || !cuenta.nro_cuenta.trim()) {
      e.nro_cuenta = "El numero de cuenta es obligatorio.";
    } else if (!NUMERO_CUENTA_REGEX.test(cuenta.nro_cuenta.trim())) {
      e.nro_cuenta =
        "El numero de cuenta debe tener entre 5 y 34 caracteres y solo puede contener letras, numeros, espacios o guiones.";
    }

    if (!cuenta.moneda || !cuenta.moneda.trim()) {
      e.moneda = "La moneda es obligatoria.";
    } else if (cuenta.moneda.trim().length > 50) {
      e.moneda = "La moneda no puede superar 50 caracteres.";
    }

    if (!cuenta.titular || !cuenta.titular.trim()) {
      e.titular = "El titular es obligatorio.";
    } else if (cuenta.titular.trim().length > 50) {
      e.titular = "El titular no puede superar 50 caracteres.";
    }

    if (cuenta.observacion && cuenta.observacion.trim().length > 100) {
      e.observacion = "La observacion no puede superar 100 caracteres.";
    }

    return e;
  };

  const cargarCuentas = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/proveedor-cuenta", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener cuentas de proveedor");
        return;
      }

      setCuentas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener cuentas de proveedor:", error);
    }
  };

  const cargarCatalogos = async () => {
    try {
      const [resProveedores, resMonedas] = await Promise.all([
        fetch("http://localhost:3001/api/proveedores", {
          credentials: "include",
        }),
        fetch("http://localhost:3001/api/moneda", {
          credentials: "include",
        }),
      ]);

      const [dataProveedores, dataMonedas] = await Promise.all([
        resProveedores.json(),
        resMonedas.json(),
      ]);

      if (resProveedores.ok) {
        setProveedores(Array.isArray(dataProveedores) ? dataProveedores : []);
      } else {
        console.error(dataProveedores?.error || "Error al obtener proveedores");
      }

      if (resMonedas.ok) {
        setMonedas(Array.isArray(dataMonedas) ? dataMonedas : []);
      } else {
        console.error(dataMonedas?.error || "Error al obtener monedas");
      }
    } catch (error) {
      console.error("Error al cargar catalogos de cuentas de proveedor:", error);
    }
  };

  useEffect(() => {
    cargarCuentas();
    cargarCatalogos();
  }, []);

  const abrirNuevo = () => {
    setNuevaCuenta(cuentaInicial);
    setErrores({});
    new bootstrap.Modal(document.getElementById("addProveedorCuentaModal")).show();
  };

  const abrirEditar = (cuenta) => {
    if (!cuenta) return;
    setCuentaSeleccionada({
      ...cuenta,
      id_proveedor: String(cuenta.id_proveedor),
    });
    setErrores({});
    new bootstrap.Modal(document.getElementById("editProveedorCuentaModal")).show();
  };

  const abrirEliminar = (cuenta) => {
    if (!cuenta) return;
    setCuentaAEliminar(cuenta);
    new bootstrap.Modal(document.getElementById("deleteProveedorCuentaModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevaCuenta);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/proveedor-cuenta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id_proveedor: Number(nuevaCuenta.id_proveedor),
          banco: nuevaCuenta.banco.trim(),
          nro_cuenta: nuevaCuenta.nro_cuenta.trim(),
          moneda: nuevaCuenta.moneda.trim().toUpperCase(),
          titular: nuevaCuenta.titular.trim(),
          observacion: nuevaCuenta.observacion.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear cuenta de proveedor");
        return;
      }

      await cargarCuentas();
      bootstrap.Modal.getInstance(
        document.getElementById("addProveedorCuentaModal")
      )?.hide();
      setNuevaCuenta(cuentaInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear cuenta de proveedor:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!cuentaSeleccionada) return;

    const e = validar(cuentaSeleccionada);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/proveedor-cuenta/${cuentaSeleccionada.id_cuenta}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id_proveedor: Number(cuentaSeleccionada.id_proveedor),
            banco: cuentaSeleccionada.banco.trim(),
            nro_cuenta: cuentaSeleccionada.nro_cuenta.trim(),
            moneda: cuentaSeleccionada.moneda.trim().toUpperCase(),
            titular: cuentaSeleccionada.titular.trim(),
            observacion: String(cuentaSeleccionada.observacion || "").trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar cuenta de proveedor");
        return;
      }

      await cargarCuentas();
      bootstrap.Modal.getInstance(
        document.getElementById("editProveedorCuentaModal")
      )?.hide();
      setCuentaSeleccionada(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar cuenta de proveedor:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarCuenta = async () => {
    if (!cuentaAEliminar) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/proveedor-cuenta/${cuentaAEliminar.id_cuenta}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar cuenta de proveedor");
        return;
      }

      await cargarCuentas();
      bootstrap.Modal.getInstance(
        document.getElementById("deleteProveedorCuentaModal")
      )?.hide();
      setCuentaAEliminar(null);
      setSelectedId(null);
    } catch (error) {
      console.error("Error al eliminar cuenta de proveedor:", error);
      alert("Error en el servidor");
    }
  };

  const cuentaSeleccionadaTabla = useMemo(
    () => cuentas.find((cuenta) => cuenta.id_cuenta === selectedId) || null,
    [cuentas, selectedId]
  );

  const cuentasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();

    return cuentas.filter(
      (cuenta) =>
        !q ||
        String(cuenta.empresa || "").toLowerCase().includes(q) ||
        String(cuenta.banco || "").toLowerCase().includes(q) ||
        String(cuenta.nro_cuenta || "").toLowerCase().includes(q) ||
        String(cuenta.moneda || "").toLowerCase().includes(q) ||
        String(cuenta.titular || "").toLowerCase().includes(q) ||
        String(cuenta.observacion || "").toLowerCase().includes(q)
    );
  }, [cuentas, search]);

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
      onClick: () => abrirEditar(cuentaSeleccionadaTabla),
      disabled: !cuentaSeleccionadaTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(cuentaSeleccionadaTabla),
      disabled: !cuentaSeleccionadaTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: async () => {
        await cargarCuentas();
        await cargarCatalogos();
      },
      disabled: false,
    },
  ];

  return (
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Cuenta de Proveedores</h1>

          {cuentaSeleccionadaTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{cuentaSeleccionadaTabla.empresa}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona una cuenta para Editar/Eliminar
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
                placeholder="Proveedor, banco, nro. cuenta, moneda, titular..."
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
                <th>Banco</th>
                <th>Nro. Cuenta</th>
                <th>Moneda</th>
                <th>Titular</th>
                <th>Observacion</th>
              </tr>
            </thead>
            <tbody>
              {cuentasFiltradas.map((cuenta, idx) => {
                const isSelected = cuenta.id_cuenta === selectedId;

                return (
                  <tr
                    key={cuenta.id_cuenta}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(cuenta.id_cuenta)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{cuenta.empresa}</td>
                    <td>{cuenta.banco}</td>
                    <td>{cuenta.nro_cuenta}</td>
                    <td>{cuenta.moneda}</td>
                    <td>{cuenta.titular}</td>
                    <td>{cuenta.observacion || "-"}</td>
                  </tr>
                );
              })}

              {cuentasFiltradas.length === 0 && (
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

      <div
        className="modal fade"
        id="addProveedorCuentaModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar cuenta de proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Proveedor</label>
                <select
                  className={`form-select ${errores.id_proveedor ? "is-invalid" : ""}`}
                  value={nuevaCuenta.id_proveedor}
                  onChange={(e) =>
                    setNuevaCuenta({
                      ...nuevaCuenta,
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

              {[
                ["banco", "Banco"],
                ["nro_cuenta", "Numero de cuenta"],
                ["titular", "Titular"],
              ].map(([campo, label]) => (
                <div className="mb-3" key={campo}>
                  <label className="form-label">{label}</label>
                  <input
                    type="text"
                    className={`form-control ${errores[campo] ? "is-invalid" : ""}`}
                    value={nuevaCuenta[campo]}
                    onChange={(e) =>
                      setNuevaCuenta({
                        ...nuevaCuenta,
                        [campo]: e.target.value,
                      })
                    }
                  />
                  {errores[campo] && (
                    <div className="invalid-feedback">{errores[campo]}</div>
                  )}
                </div>
              ))}

              <div className="mb-3">
                <label className="form-label">Moneda</label>
                <select
                  className={`form-select ${errores.moneda ? "is-invalid" : ""}`}
                  value={nuevaCuenta.moneda}
                  onChange={(e) =>
                    setNuevaCuenta({
                      ...nuevaCuenta,
                      moneda: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar</option>
                  {monedas.map((moneda) => (
                    <option key={moneda.id_moneda} value={moneda.codigo}>
                      {moneda.descripcion} ({moneda.codigo})
                    </option>
                  ))}
                </select>
                {errores.moneda && (
                  <div className="invalid-feedback">{errores.moneda}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Observacion</label>
                <textarea
                  className={`form-control ${errores.observacion ? "is-invalid" : ""}`}
                  value={nuevaCuenta.observacion}
                  onChange={(e) =>
                    setNuevaCuenta({
                      ...nuevaCuenta,
                      observacion: e.target.value,
                    })
                  }
                  rows={3}
                />
                {errores.observacion && (
                  <div className="invalid-feedback">{errores.observacion}</div>
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
        id="editProveedorCuentaModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar cuenta de proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {cuentaSeleccionada && (
                <>
                  <div className="mb-3">
                    <label className="form-label">Proveedor</label>
                    <select
                      className={`form-select ${errores.id_proveedor ? "is-invalid" : ""}`}
                      value={cuentaSeleccionada.id_proveedor}
                      onChange={(e) =>
                        setCuentaSeleccionada({
                          ...cuentaSeleccionada,
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

                  {[
                    ["banco", "Banco"],
                    ["nro_cuenta", "Numero de cuenta"],
                    ["titular", "Titular"],
                  ].map(([campo, label]) => (
                    <div className="mb-3" key={campo}>
                      <label className="form-label">{label}</label>
                      <input
                        type="text"
                        className={`form-control ${errores[campo] ? "is-invalid" : ""}`}
                        value={cuentaSeleccionada[campo] || ""}
                        onChange={(e) =>
                          setCuentaSeleccionada({
                            ...cuentaSeleccionada,
                            [campo]: e.target.value,
                          })
                        }
                      />
                      {errores[campo] && (
                        <div className="invalid-feedback">{errores[campo]}</div>
                      )}
                    </div>
                  ))}

                  <div className="mb-3">
                    <label className="form-label">Moneda</label>
                    <select
                      className={`form-select ${errores.moneda ? "is-invalid" : ""}`}
                      value={cuentaSeleccionada.moneda || ""}
                      onChange={(e) =>
                        setCuentaSeleccionada({
                          ...cuentaSeleccionada,
                          moneda: e.target.value,
                        })
                      }
                    >
                      <option value="">Seleccionar</option>
                      {monedas.map((moneda) => (
                        <option key={moneda.id_moneda} value={moneda.codigo}>
                          {moneda.descripcion} ({moneda.codigo})
                        </option>
                      ))}
                    </select>
                    {errores.moneda && (
                      <div className="invalid-feedback">{errores.moneda}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Observacion</label>
                    <textarea
                      className={`form-control ${errores.observacion ? "is-invalid" : ""}`}
                      value={cuentaSeleccionada.observacion || ""}
                      onChange={(e) =>
                        setCuentaSeleccionada({
                          ...cuentaSeleccionada,
                          observacion: e.target.value,
                        })
                      }
                      rows={3}
                    />
                    {errores.observacion && (
                      <div className="invalid-feedback">{errores.observacion}</div>
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
        id="deleteProveedorCuentaModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar cuenta de proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {cuentaAEliminar && (
                <p>
                  Seguro que deseas desactivar la cuenta de{" "}
                  <strong>{cuentaAEliminar.empresa}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarCuenta}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SupplierAccounts;

