import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/containers.css";

const enumTipos = [
  // AJUSTA ESTOS VALORES PARA QUE COINCIDAN EXACTAMENTE CON TU ENUM EN MYSQL
  "FCL",
  "LCL",
  "GP20",
  "GP40",
  "HC40",
  "OpenTop",
  "FlatRack",
  "Reefer",
  "Otros",
];

const Containers = () => {
  const [contenedores, setContenedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [nuevo, setNuevo] = useState({
    numero: "",
    tipo: "",
    peso_bruto: "",
    peso_neto: "",
    dimensiones: "",
  });

  const [edit, setEdit] = useState(null); // objeto contenedor para edición
  const [idAEliminar, setIdAEliminar] = useState(null);

  const validar = (c) => {
    const e = {};
    if (!c.numero?.trim()) e.numero = "El número es obligatorio.";
    if (!c.tipo?.trim()) e.tipo = "El tipo es obligatorio.";
    if (c.peso_bruto !== "" && c.peso_bruto != null && isNaN(Number(c.peso_bruto)))
      e.peso_bruto = "Peso bruto debe ser numérico.";
    if (c.peso_neto !== "" && c.peso_neto != null && isNaN(Number(c.peso_neto)))
      e.peso_neto = "Peso neto debe ser numérico.";
    return e;
  };

  const cargar = async () => {
    try {
      setCargando(true);
      setError("");
      const res = await fetch("http://localhost:3001/api/contenedores", {
        credentials: "include",
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(`Error ${res.status}: ${txt || "No se pudo cargar"}`);
        setContenedores([]);
        return;
      }
      const data = await res.json();
      setContenedores(Array.isArray(data) ? data : []);
    } catch (_) {
      setError("No se pudo conectar con el servidor");
      setContenedores([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return (contenedores || []).filter((c) =>
      (c.numero || "").toLowerCase().includes(q)
    );
  }, [contenedores, busqueda]);

  const abrirNuevo = () => {
    setNuevo({ numero: "", tipo: "", peso_bruto: "", peso_neto: "", dimensiones: "" });
    window.bootstrap && new window.bootstrap.Modal("#modalAdd").show();
  };

  const abrirEditar = (c) => {
    setEdit({ ...c });
    window.bootstrap && new window.bootstrap.Modal("#modalEdit").show();
  };

  const abrirEliminar = (id) => {
    setIdAEliminar(id);
    window.bootstrap && new window.bootstrap.Modal("#modalDelete").show();
  };

  const guardarNuevo = async () => {
    const errs = validar(nuevo);
    if (Object.keys(errs).length) return setNuevo((n) => ({ ...n, _errors: errs }));

    const body = {
      numero: (nuevo.numero || "").trim().toUpperCase(),
      tipo: (nuevo.tipo || "").trim(),
      peso_bruto: nuevo.peso_bruto === "" ? null : Number(nuevo.peso_bruto),
      peso_neto: nuevo.peso_neto === "" ? null : Number(nuevo.peso_neto),
      dimensiones: nuevo.dimensiones?.trim() || null,
    };

    const res = await fetch("http://localhost:3001/api/contenedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await cargar();
      window.bootstrap.Modal.getInstance(document.getElementById("modalAdd")).hide();
    } else {
      alert("No se pudo guardar. Revisa los datos.");
    }
  };

  const guardarEdicion = async () => {
    const errs = validar(edit);
    if (Object.keys(errs).length) return setEdit((s) => ({ ...s, _errors: errs }));

    const body = {
      numero: (edit.numero || "").trim().toUpperCase(),
      tipo: (edit.tipo || "").trim(),
      peso_bruto: edit.peso_bruto === "" ? null : Number(edit.peso_bruto),
      peso_neto: edit.peso_neto === "" ? null : Number(edit.peso_neto),
      dimensiones: edit.dimensiones?.trim() || null,
      state: typeof edit.state === "number" ? edit.state : 1,
    };

    const res = await fetch(`http://localhost:3001/api/contenedores/${edit.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await cargar();
      window.bootstrap.Modal.getInstance(document.getElementById("modalEdit")).hide();
    } else {
      alert("No se pudo actualizar.");
    }
  };

  const eliminar = async () => {
    const res = await fetch(`http://localhost:3001/api/contenedores/${idAEliminar}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      await cargar();
      window.bootstrap.Modal.getInstance(document.getElementById("modalDelete")).hide();
    } else {
      alert("No se pudo eliminar.");
    }
  };

  const Input = ({ label, value, onChange, error, type = "text", placeholder }) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <input
        type={type}
        className={`form-control ${error ? "is-invalid" : ""}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );

  return (
    <div className="d-flex">
      <Sidebar />

      <div className="containers-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3>Gestión de Contenedores</h3>
          <button className="btn btn-orange" onClick={abrirNuevo}>+ Agregar contenedor</button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por número de contenedor"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <table className="table table-hover table-bordered">
            <thead className="table-light">
              <tr>
                <th>Número</th>
                <th>Tipo</th>
                <th>Peso Bruto (kg)</th>
                <th>Peso Neto (kg)</th>
                <th>Dimensiones</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="6" className="text-center">Cargando…</td></tr>
              ) : filtrados.length ? (
                filtrados.map((c) => (
                  <tr key={c.id}>
                    <td>{c.numero}</td>
                    <td>{c.tipo}</td>
                    <td>{c.peso_bruto ?? "-"}</td>
                    <td>{c.peso_neto ?? "-"}</td>
                    <td>{c.dimensiones ?? "-"}</td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-primary me-2" onClick={() => abrirEditar(c)}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => abrirEliminar(c.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar */}
      <div className="modal fade" id="modalAdd" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Agregar Contenedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <Input label="Número" value={nuevo.numero} onChange={(v) => setNuevo({ ...nuevo, numero: v })} error={nuevo._errors?.numero} placeholder="Ej: MSKU1234567" />
              <div className="mb-3">
                <label className="form-label">Tipo</label>
                <select
                  className={`form-select ${nuevo._errors?.tipo ? "is-invalid" : ""}`}
                  value={nuevo.tipo}
                  onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
                >
                  <option value="">Seleccionar</option>
                  {enumTipos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {nuevo._errors?.tipo && <div className="invalid-feedback">{nuevo._errors.tipo}</div>}
              </div>
              <Input label="Peso bruto (kg)" type="number" value={nuevo.peso_bruto} onChange={(v) => setNuevo({ ...nuevo, peso_bruto: v })} error={nuevo._errors?.peso_bruto} />
              <Input label="Peso neto (kg)" type="number" value={nuevo.peso_neto} onChange={(v) => setNuevo({ ...nuevo, peso_neto: v })} error={nuevo._errors?.peso_neto} />
              <Input label="Dimensiones" value={nuevo.dimensiones} onChange={(v) => setNuevo({ ...nuevo, dimensiones: v })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-success" onClick={guardarNuevo}>Guardar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editar */}
      <div className="modal fade" id="modalEdit" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Editar Contenedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {edit && (
                <>
                  <Input label="Número" value={edit.numero ?? ""} onChange={(v) => setEdit({ ...edit, numero: v })} error={edit._errors?.numero} />
                  <div className="mb-3">
                    <label className="form-label">Tipo</label>
                    <select
                      className={`form-select ${edit._errors?.tipo ? "is-invalid" : ""}`}
                      value={edit.tipo || ""}
                      onChange={(e) => setEdit({ ...edit, tipo: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      {enumTipos.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {edit._errors?.tipo && <div className="invalid-feedback">{edit._errors.tipo}</div>}
                  </div>
                  <Input label="Peso bruto (kg)" type="number" value={edit.peso_bruto ?? ""} onChange={(v) => setEdit({ ...edit, peso_bruto: v })} error={edit._errors?.peso_bruto} />
                  <Input label="Peso neto (kg)" type="number" value={edit.peso_neto ?? ""} onChange={(v) => setEdit({ ...edit, peso_neto: v })} error={edit._errors?.peso_neto} />
                  <Input label="Dimensiones" value={edit.dimensiones ?? ""} onChange={(v) => setEdit({ ...edit, dimensiones: v })} />
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button className="btn btn-success" onClick={guardarEdicion}>Guardar cambios</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Eliminar */}
      <div className="modal fade" id="modalDelete" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar Contenedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">¿Seguro que deseas eliminar este contenedor?</div>
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

export default Containers;
