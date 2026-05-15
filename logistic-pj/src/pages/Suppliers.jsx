import React, { useEffect, useMemo, useState } from "react";
import "../styles/suppliers.css";
import * as bootstrap from "bootstrap";

const proveedorInicial = {
  empresa: "",
  nit: "",
  contacto: "",
  telefono: "",
  telefonoPais: "bo",
  correo: "",
  direccion: "",
  lugar_origen: "",
  id_tipo_servicio: "",
  estado: 1,
};

const COUNTRY_API_URL =
  "https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags,translations";
const FALLBACK_PHONE_COUNTRIES = [
  {
    country: "Bolivia",
    iso: "bo",
    code: "+591",
    flag: "https://flagcdn.com/w40/bo.png",
  },
];
const DEFAULT_PHONE_COUNTRY_ID = "bo";
const DEFAULT_PHONE_COUNTRY = FALLBACK_PHONE_COUNTRIES[0];
const INTERNATIONAL_PHONE = /^\+\d{8,15}$/;

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const buildDialCode = (idd) => {
  if (!idd?.root || !Array.isArray(idd.suffixes) || idd.suffixes.length === 0) {
    return "";
  }

  return `${idd.root}${idd.suffixes[0]}`;
};

const normalizeCountries = (countries) =>
  countries
    .map((country) => ({
      country:
        country.translations?.spa?.common ||
        country.name?.common ||
        country.cca2 ||
        "",
      iso: String(country.cca2 || "").toLowerCase(),
      code: buildDialCode(country.idd),
      flag: country.flags?.svg || country.flags?.png || "",
    }))
    .filter((country) => country.country && country.iso && country.code)
    .sort((a, b) => {
      if (a.iso === DEFAULT_PHONE_COUNTRY_ID) return -1;
      if (b.iso === DEFAULT_PHONE_COUNTRY_ID) return 1;
      return a.country.localeCompare(b.country, "es");
    });

const findPhoneCountry = (
  countries,
  countryIdOrCode = DEFAULT_PHONE_COUNTRY_ID
) =>
  countries.find(
    (country) =>
      country.iso === countryIdOrCode || country.code === countryIdOrCode
  ) || DEFAULT_PHONE_COUNTRY;

const getPhoneParts = (
  value,
  fallbackCountryId = DEFAULT_PHONE_COUNTRY_ID,
  countries = FALLBACK_PHONE_COUNTRIES
) => {
  const raw = String(value || "").trim();
  const fallbackCountry = findPhoneCountry(countries, fallbackCountryId);
  const fallbackCode = fallbackCountry.code;
  const sortedCountries = [...countries].sort(
    (a, b) => b.code.length - a.code.length
  );

  if (raw.startsWith("+")) {
    if (raw.startsWith(fallbackCode)) {
      return {
        countryId: fallbackCountry.iso,
        countryCode: fallbackCode,
        localNumber: onlyDigits(raw.slice(fallbackCode.length)),
      };
    }

    const match = sortedCountries.find((country) =>
      raw.startsWith(country.code)
    );

    if (match) {
      return {
        countryId: match.iso,
        countryCode: match.code,
        localNumber: onlyDigits(raw.slice(match.code.length)),
      };
    }

    return {
      countryId: fallbackCountry.iso,
      countryCode: fallbackCode,
      localNumber: onlyDigits(raw),
    };
  }

  return {
    countryId: fallbackCountry.iso,
    countryCode: fallbackCode,
    localNumber: onlyDigits(raw),
  };
};

const buildPhone = (countryCode, localNumber) =>
  `${countryCode}${onlyDigits(localNumber)}`;

const normalizePhoneForSave = (
  phone,
  fallbackCountryId = DEFAULT_PHONE_COUNTRY_ID,
  countries = FALLBACK_PHONE_COUNTRIES
) => {
  const { countryCode, localNumber } = getPhoneParts(
    phone,
    fallbackCountryId,
    countries
  );
  return buildPhone(countryCode, localNumber);
};

const flagStyle = {
  background: "#fff",
  border: "1px solid rgba(0, 0, 0, 0.12)",
  objectFit: "contain",
};

const Suppliers = () => {
  const [proveedores, setProveedores] = useState([]);
  const [tiposServicio, setTiposServicio] = useState([]);
  const [nuevoProveedor, setNuevoProveedor] = useState(proveedorInicial);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null);
  const [errores, setErrores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(null);
  const [phoneCountries, setPhoneCountries] = useState(FALLBACK_PHONE_COUNTRIES);

  const [search, setSearch] = useState("");
  const [tipoServicioFiltro, setTipoServicioFiltro] = useState("ALL");

  const validar = (p) => {
    const e = {};

    if (!p.empresa?.trim()) {
      e.empresa = "La empresa es obligatoria.";
    }

    if (!/^\d{5,15}$/.test(String(p.nit || "").trim())) {
      e.nit = "El NIT debe tener entre 5 y 15 dígitos.";
    }

    if (!p.contacto?.trim()) {
      e.contacto = "El contacto es obligatorio.";
    }

    if (
      !INTERNATIONAL_PHONE.test(
        normalizePhoneForSave(p.telefono, p.telefonoPais, phoneCountries)
      )
    ) {
      e.telefono = "Selecciona un pais e ingresa un telefono valido.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.correo || "").trim())) {
      e.correo = "El correo no es válido.";
    }

    if (!p.direccion?.trim()) {
      e.direccion = "La dirección es obligatoria.";
    }

    if (!p.lugar_origen?.trim()) {
      e.lugar_origen = "El lugar de origen es obligatorio.";
    }

    if (!p.id_tipo_servicio) {
      e.id_tipo_servicio = "Selecciona el tipo de servicio.";
    }

    return e;
  };

  const cargarProveedores = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/proveedores", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener proveedores");
        return;
      }

      setProveedores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al obtener proveedores:", error);
    }
  };

  const cargarTiposServicio = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/tipo-servicio", {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data?.error || "Error al obtener tipos de servicio");
        return;
      }

      // Si quieres mostrar solo activos en el combo:
      const tiposActivos = Array.isArray(data)
        ? data.filter((t) => Number(t.estado) === 1)
        : [];

      setTiposServicio(tiposActivos);
    } catch (error) {
      console.error("Error al obtener tipos de servicio:", error);
    }
  };

  const cargarPaisesTelefono = async () => {
    try {
      const res = await fetch(COUNTRY_API_URL);
      const data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
        throw new Error("No se pudo obtener el catalogo de paises.");
      }

      const countries = normalizeCountries(data);
      const nextCountries =
        countries.length > 0 ? countries : FALLBACK_PHONE_COUNTRIES;
      const defaultCountry = findPhoneCountry(
        nextCountries,
        DEFAULT_PHONE_COUNTRY_ID
      );

      setPhoneCountries(nextCountries);
      setNuevoProveedor((current) => ({
        ...current,
        telefonoPais: current.telefonoPais || defaultCountry.iso,
      }));
    } catch (error) {
      console.error("Error al cargar paises para telefono:", error);
      setPhoneCountries(FALLBACK_PHONE_COUNTRIES);
    }
  };

  useEffect(() => {
    cargarProveedores();
    cargarTiposServicio();
    cargarPaisesTelefono();
  }, []);

  const abrirNuevo = () => {
    setNuevoProveedor(proveedorInicial);
    setErrores({});
    setPhoneMenuOpen(null);
    new bootstrap.Modal(document.getElementById("addSupplierModal")).show();
  };

  const abrirEditar = (proveedor) => {
    if (!proveedor) return;
    setProveedorSeleccionado({
      ...proveedor,
      telefono: normalizePhoneForSave(
        proveedor.telefono,
        DEFAULT_PHONE_COUNTRY_ID,
        phoneCountries
      ),
      telefonoPais: getPhoneParts(
        proveedor.telefono,
        DEFAULT_PHONE_COUNTRY_ID,
        phoneCountries
      ).countryId,
      id_tipo_servicio: proveedor.id_tipo_servicio ?? "",
    });
    setErrores({});
    setPhoneMenuOpen(null);
    new bootstrap.Modal(document.getElementById("editSupplierModal")).show();
  };

  const abrirEliminar = (proveedor) => {
    if (!proveedor) return;
    setProveedorAEliminar(proveedor);
    new bootstrap.Modal(document.getElementById("deleteSupplierModal")).show();
  };

  const guardarNuevo = async () => {
    const e = validar(nuevoProveedor);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    const body = {
      ...nuevoProveedor,
      telefono: normalizePhoneForSave(
        nuevoProveedor.telefono,
        nuevoProveedor.telefonoPais,
        phoneCountries
      ),
      correo: nuevoProveedor.correo.trim().toLowerCase(),
      id_tipo_servicio: Number(nuevoProveedor.id_tipo_servicio),
      estado: 1,
    };

    try {
      const res = await fetch("http://localhost:3001/api/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al crear proveedor");
        return;
      }

      await cargarProveedores();
      bootstrap.Modal.getInstance(
        document.getElementById("addSupplierModal")
      )?.hide();
      setNuevoProveedor(proveedorInicial);
      setErrores({});
    } catch (error) {
      console.error("Error al crear proveedor:", error);
      alert("Error en el servidor");
    }
  };

  const guardarEdicion = async () => {
    if (!proveedorSeleccionado) return;

    const e = validar(proveedorSeleccionado);
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    const body = {
      ...proveedorSeleccionado,
      telefono: normalizePhoneForSave(
        proveedorSeleccionado.telefono,
        proveedorSeleccionado.telefonoPais,
        phoneCountries
      ),
      correo: proveedorSeleccionado.correo.trim().toLowerCase(),
      id_tipo_servicio: Number(proveedorSeleccionado.id_tipo_servicio),
      estado:
        Number(proveedorSeleccionado.estado) === 0 ||
        Number(proveedorSeleccionado.estado) === 1
          ? Number(proveedorSeleccionado.estado)
          : 1,
    };

    try {
      const res = await fetch(
        `http://localhost:3001/api/proveedores/${proveedorSeleccionado.id_proveedor}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al actualizar proveedor");
        return;
      }

      await cargarProveedores();
      bootstrap.Modal.getInstance(
        document.getElementById("editSupplierModal")
      )?.hide();
      setProveedorSeleccionado(null);
      setErrores({});
    } catch (error) {
      console.error("Error al actualizar proveedor:", error);
      alert("Error en el servidor");
    }
  };

  const eliminarProveedor = async () => {
    if (!proveedorAEliminar) return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/proveedores/${proveedorAEliminar.id_proveedor}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error al eliminar proveedor");
        return;
      }

      await cargarProveedores();
      bootstrap.Modal.getInstance(
        document.getElementById("deleteSupplierModal")
      )?.hide();
      setSelectedId(null);
      setProveedorAEliminar(null);
    } catch (error) {
      console.error("Error al eliminar proveedor:", error);
      alert("Error en el servidor");
    }
  };

  const input = (label, value, onChange, error, type = "text") => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <input
        type={type}
        className={`form-control ${error ? "is-invalid" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );

  const phoneInput = (value, onChange, error, selectedCountryId, menuId) => {
    const parts = getPhoneParts(
      value,
      selectedCountryId || DEFAULT_PHONE_COUNTRY_ID,
      phoneCountries
    );
    const selectedCountry =
      phoneCountries.find((country) => country.iso === parts.countryId) ||
      DEFAULT_PHONE_COUNTRY;
    const isOpen = phoneMenuOpen === menuId;

    return (
      <div className="mb-3">
        <label className="form-label">Telefono</label>
        <div className="input-group position-relative">
          <button
            type="button"
            className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2"
            aria-expanded={isOpen}
            onClick={() =>
              setPhoneMenuOpen((current) =>
                current === menuId ? null : menuId
              )
            }
            title={selectedCountry.country}
            style={{ width: 118 }}
          >
            <img
              src={selectedCountry.flag}
              alt={selectedCountry.country}
              width="28"
              height="18"
              style={flagStyle}
            />
            <span>{selectedCountry.code}</span>
          </button>
          <ul
            className={`dropdown-menu ${isOpen ? "show" : ""}`}
            style={{
              maxHeight: 260,
              overflowY: "auto",
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 1080,
            }}
          >
            {phoneCountries.map((country) => (
              <li key={`${country.iso}-${country.code}`}>
                <button
                  type="button"
                  className="dropdown-item d-grid align-items-center"
                  onClick={() => {
                    onChange(buildPhone(country.code, parts.localNumber), country.iso);
                    setPhoneMenuOpen(null);
                  }}
                  style={{ gridTemplateColumns: "28px minmax(0, 1fr) 74px", columnGap: 8 }}
                >
                  <img
                    src={country.flag}
                    alt={country.country}
                    width="28"
                    height="18"
                    style={flagStyle}
                  />
                  <span className="text-truncate">{country.country}</span>
                  <span className="text-muted text-end">{country.code}</span>
                </button>
              </li>
            ))}
          </ul>
          <input
            type="tel"
            inputMode="numeric"
            className={`form-control ${error ? "is-invalid" : ""}`}
            value={parts.localNumber}
            onChange={(e) =>
              onChange(buildPhone(parts.countryCode, e.target.value), parts.countryId)
            }
            placeholder="Numero local"
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
      </div>
    );
  };

  const nombreTipoServicio = (idTipoServicio) => {
    const tipo = tiposServicio.find(
      (t) => Number(t.id_tipo_servicio) === Number(idTipoServicio)
    );
    return tipo ? tipo.descripcion : "Sin tipo";
  };

  const proveedorSeleccionadoTabla = useMemo(
    () => proveedores.find((p) => p.id_proveedor === selectedId) || null,
    [proveedores, selectedId]
  );

  const proveedoresFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    return proveedores.filter((p) => {
      const matchesSearch =
        !q ||
        String(p.empresa || "").toLowerCase().includes(q) ||
        String(p.nit || "").toLowerCase().includes(q) ||
        String(p.contacto || "").toLowerCase().includes(q) ||
        String(p.telefono || "").toLowerCase().includes(q) ||
        String(p.correo || "").toLowerCase().includes(q) ||
        String(p.direccion || "").toLowerCase().includes(q) ||
        String(p.lugar_origen || "").toLowerCase().includes(q);

      const matchesTipo =
        tipoServicioFiltro === "ALL"
          ? true
          : String(p.id_tipo_servicio) === String(tipoServicioFiltro);

      return matchesSearch && matchesTipo;
    });
  }, [proveedores, search, tipoServicioFiltro]);

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
      onClick: () => abrirEditar(proveedorSeleccionadoTabla),
      disabled: !proveedorSeleccionadoTabla,
    },
    {
      id: "delete",
      label: "Eliminar",
      className: "btn btn-danger",
      onClick: () => abrirEliminar(proveedorSeleccionadoTabla),
      disabled: !proveedorSeleccionadoTabla,
    },
    {
      id: "refresh",
      label: "Refrescar",
      className: "btn btn-outline-light",
      onClick: async () => {
        await cargarProveedores();
        await cargarTiposServicio();
      },
      disabled: false,
    },
  ];

  return (
    <>

      <div className="page-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="page-title m-0">Gestión de Proveedores</h1>

          {proveedorSeleccionadoTabla ? (
            <small className="text-muted">
              Seleccionado: <strong>{proveedorSeleccionadoTabla.empresa}</strong>
            </small>
          ) : (
            <small className="text-muted">
              Selecciona un proveedor para Editar/Eliminar
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
                placeholder="Empresa, NIT, contacto, teléfono, correo, dirección..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Tipo de servicio</label>
              <select
                className="form-select"
                value={tipoServicioFiltro}
                onChange={(e) => setTipoServicioFiltro(e.target.value)}
              >
                <option value="ALL">Todos</option>
                {tiposServicio.map((tipo) => (
                  <option
                    key={tipo.id_tipo_servicio}
                    value={tipo.id_tipo_servicio}
                  >
                    {tipo.descripcion}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-3 d-flex gap-2">
              <button
                className="btn btn-secondary w-100"
                type="button"
                onClick={() => {
                  setSearch("");
                  setTipoServicioFiltro("ALL");
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
                <th>Empresa</th>
                <th>NIT</th>
                <th>Tipo de servicio</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Lugar de origen</th>
              </tr>
            </thead>
            <tbody>
              {proveedoresFiltrados.map((p, idx) => {
                const isSelected = p.id_proveedor === selectedId;

                return (
                  <tr
                    key={p.id_proveedor}
                    className={isSelected ? "row-selected" : ""}
                    onClick={() => setSelectedId(p.id_proveedor)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-center">{idx + 1}</td>
                    <td>{p.empresa}</td>
                    <td>{p.nit}</td>
                    <td>{nombreTipoServicio(p.id_tipo_servicio)}</td>
                    <td>{p.contacto}</td>
                    <td>{p.telefono}</td>
                    <td>{p.correo}</td>
                    <td>{p.lugar_origen}</td>
                  </tr>
                );
              })}

              {proveedoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
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
        id="addSupplierModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Agregar proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {input(
                "Empresa",
                nuevoProveedor.empresa,
                (v) => setNuevoProveedor({ ...nuevoProveedor, empresa: v }),
                errores.empresa
              )}
              {input(
                "NIT",
                nuevoProveedor.nit,
                (v) => setNuevoProveedor({ ...nuevoProveedor, nit: v }),
                errores.nit
              )}
              {input(
                "Contacto",
                nuevoProveedor.contacto,
                (v) => setNuevoProveedor({ ...nuevoProveedor, contacto: v }),
                errores.contacto
              )}
              {phoneInput(
                nuevoProveedor.telefono,
                (v, countryId) =>
                  setNuevoProveedor({
                    ...nuevoProveedor,
                    telefono: v,
                    telefonoPais:
                      countryId ||
                      getPhoneParts(
                        v,
                        nuevoProveedor.telefonoPais,
                        phoneCountries
                      ).countryId,
                  }),
                errores.telefono,
                nuevoProveedor.telefonoPais,
                "new-supplier-phone"
              )}
              {input(
                "Correo",
                nuevoProveedor.correo,
                (v) => setNuevoProveedor({ ...nuevoProveedor, correo: v }),
                errores.correo,
                "email"
              )}
              {input(
                "Dirección",
                nuevoProveedor.direccion,
                (v) => setNuevoProveedor({ ...nuevoProveedor, direccion: v }),
                errores.direccion
              )}
              {input(
                "Lugar de origen",
                nuevoProveedor.lugar_origen,
                (v) =>
                  setNuevoProveedor({ ...nuevoProveedor, lugar_origen: v }),
                errores.lugar_origen
              )}

              <div className="mb-3">
                <label className="form-label">Tipo de servicio</label>
                <select
                  className={`form-select ${
                    errores.id_tipo_servicio ? "is-invalid" : ""
                  }`}
                  value={nuevoProveedor.id_tipo_servicio}
                  onChange={(e) =>
                    setNuevoProveedor({
                      ...nuevoProveedor,
                      id_tipo_servicio: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar</option>
                  {tiposServicio.map((tipo) => (
                    <option
                      key={tipo.id_tipo_servicio}
                      value={tipo.id_tipo_servicio}
                    >
                      {tipo.descripcion}
                    </option>
                  ))}
                </select>
                {errores.id_tipo_servicio && (
                  <div className="invalid-feedback">
                    {errores.id_tipo_servicio}
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
        id="editSupplierModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Editar proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {proveedorSeleccionado && (
                <>
                  {input(
                    "Empresa",
                    proveedorSeleccionado.empresa || "",
                    (v) =>
                      setProveedorSeleccionado({
                        ...proveedorSeleccionado,
                        empresa: v,
                      }),
                    errores.empresa
                  )}
                  {input(
                    "NIT",
                    proveedorSeleccionado.nit || "",
                    (v) =>
                      setProveedorSeleccionado({
                        ...proveedorSeleccionado,
                        nit: v,
                      }),
                    errores.nit
                  )}
                  {input(
                    "Contacto",
                    proveedorSeleccionado.contacto || "",
                    (v) =>
                      setProveedorSeleccionado({
                        ...proveedorSeleccionado,
                        contacto: v,
                      }),
                    errores.contacto
                  )}
                  {phoneInput(
                    proveedorSeleccionado.telefono || "",
                    (v, countryId) =>
                      setProveedorSeleccionado({
                        ...proveedorSeleccionado,
                        telefono: v,
                        telefonoPais:
                          countryId ||
                          getPhoneParts(
                            v,
                            proveedorSeleccionado.telefonoPais,
                            phoneCountries
                          ).countryId,
                      }),
                    errores.telefono,
                    proveedorSeleccionado.telefonoPais,
                    "edit-supplier-phone"
                  )}
                  {input(
                    "Correo",
                    proveedorSeleccionado.correo || "",
                    (v) =>
                      setProveedorSeleccionado({
                        ...proveedorSeleccionado,
                        correo: v,
                      }),
                    errores.correo,
                    "email"
                  )}
                  {input(
                    "Dirección",
                    proveedorSeleccionado.direccion || "",
                    (v) =>
                      setProveedorSeleccionado({
                        ...proveedorSeleccionado,
                        direccion: v,
                      }),
                    errores.direccion
                  )}
                  {input(
                    "Lugar de origen",
                    proveedorSeleccionado.lugar_origen || "",
                    (v) =>
                      setProveedorSeleccionado({
                        ...proveedorSeleccionado,
                        lugar_origen: v,
                      }),
                    errores.lugar_origen
                  )}

                  <div className="mb-3">
                    <label className="form-label">Tipo de servicio</label>
                    <select
                      className={`form-select ${
                        errores.id_tipo_servicio ? "is-invalid" : ""
                      }`}
                      value={proveedorSeleccionado.id_tipo_servicio || ""}
                      onChange={(e) =>
                        setProveedorSeleccionado({
                          ...proveedorSeleccionado,
                          id_tipo_servicio: e.target.value,
                        })
                      }
                    >
                      <option value="">Seleccionar</option>
                      {tiposServicio.map((tipo) => (
                        <option
                          key={tipo.id_tipo_servicio}
                          value={tipo.id_tipo_servicio}
                        >
                          {tipo.descripcion}
                        </option>
                      ))}
                    </select>
                    {errores.id_tipo_servicio && (
                      <div className="invalid-feedback">
                        {errores.id_tipo_servicio}
                      </div>
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
        id="deleteSupplierModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow rounded-3">
            <div className="modal-header">
              <h5 className="modal-title">Eliminar proveedor</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              {proveedorAEliminar && (
                <p>
                  ¿Seguro que deseas desactivar al proveedor{" "}
                  <strong>{proveedorAEliminar.empresa}</strong>?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={eliminarProveedor}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Suppliers;
