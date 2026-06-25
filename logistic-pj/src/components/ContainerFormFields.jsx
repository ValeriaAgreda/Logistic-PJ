import React from "react";

const ContainerFormFields = ({
  contenedor,
  setContenedor,
  errores = {},
  tiposContenedor = [],
  onCreateTipoContenedor,
}) => {
  const update = (campo, valor) => {
    setContenedor({
      ...contenedor,
      [campo]: valor,
    });
  };

  return (
    <>
      <div className="mb-3">
        <label className="form-label">Numero de contenedor</label>
        <input
          className={`form-control ${errores.numero_contenedor ? "is-invalid" : ""}`}
          value={contenedor.numero_contenedor || ""}
          onChange={(e) => update("numero_contenedor", e.target.value)}
        />
        {errores.numero_contenedor && (
          <div className="invalid-feedback">{errores.numero_contenedor}</div>
        )}
      </div>

      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
          <label className="form-label m-0">Tipo de contenedor</label>
          {onCreateTipoContenedor && (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={onCreateTipoContenedor}
            >
              Nuevo tipo
            </button>
          )}
        </div>
        <div>
          <select
            className={`form-select ${errores.id_tipo_contenedor ? "is-invalid" : ""}`}
            value={contenedor.id_tipo_contenedor || ""}
            onChange={(e) => update("id_tipo_contenedor", e.target.value)}
          >
            <option value="">Seleccionar</option>
            {tiposContenedor.map((tipo) => (
              <option key={tipo.id_tipo_contenedor} value={tipo.id_tipo_contenedor}>
                {tipo.descripcion}
              </option>
            ))}
          </select>
        </div>
        {errores.id_tipo_contenedor && (
          <div className="invalid-feedback d-block">{errores.id_tipo_contenedor}</div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label">Naviera</label>
        <input
          className={`form-control ${errores.naviera ? "is-invalid" : ""}`}
          value={contenedor.naviera || ""}
          onChange={(e) => update("naviera", e.target.value)}
        />
        {errores.naviera && (
          <div className="invalid-feedback">{errores.naviera}</div>
        )}
      </div>

      <div className="row g-3">
        <div className="col-md-12">
          <label className="form-label">Peso bruto</label>
          <input
            type="number"
            step="0.01"
            className={`form-control ${errores.peso_bruto ? "is-invalid" : ""}`}
            value={contenedor.peso_bruto ?? ""}
            onChange={(e) => update("peso_bruto", e.target.value)}
          />
          {errores.peso_bruto && <div className="invalid-feedback">{errores.peso_bruto}</div>}
        </div>
      </div>
    </>
  );
};

export default ContainerFormFields;
