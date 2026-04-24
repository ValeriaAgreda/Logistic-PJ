import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../styles/sidebar.css";
import { API_BASE_URL } from "../config/api";

const SIDEBAR_SCROLL_STORAGE_KEY = "sidebar-scroll-top";
const SIDEBAR_MENUS_STORAGE_KEY = "sidebar-open-menus";

const ROLE_KEYS = {
  ADMIN: "ADMIN",
  CONTADOR: "CONTADOR",
};

const normalizeRole = (value) => {
  if (value == null) return null;

  const raw = String(value).trim().toUpperCase();

  if (!raw) return null;

  if (["ADMIN", "ADMINISTRADOR", "1"].includes(raw)) {
    return ROLE_KEYS.ADMIN;
  }

  if (["CONTADOR", "ACCOUNTANT", "2"].includes(raw)) {
    return ROLE_KEYS.CONTADOR;
  }

  return raw;
};

const extractUserRoles = (user) => {
  const normalizedRoles = new Set();

  const appendRole = (value) => {
    const normalized = normalizeRole(value);
    if (normalized) {
      normalizedRoles.add(normalized);
    }
  };

  if (Array.isArray(user?.roles)) {
    user.roles.forEach((role) => {
      if (role && typeof role === "object") {
        appendRole(role.codigo);
        appendRole(role.descripcion);
        appendRole(role.nombre);
        appendRole(role.id_rol);
      } else {
        appendRole(role);
      }
    });
  }

  if (Array.isArray(user?.role_codes)) {
    user.role_codes.forEach(appendRole);
  }

  if (Array.isArray(user?.role_names)) {
    user.role_names.forEach(appendRole);
  }

  appendRole(user?.primary_role);
  appendRole(user?.rol);
  appendRole(user?.role);
  appendRole(user?.id_rol);
  appendRole(user?.idRol);
  appendRole(user?.rol_id);
  appendRole(user?.nombre_rol);
  appendRole(user?.nombreRol);
  appendRole(user?.tipoRol);
  appendRole(user?.tipo_rol);
  appendRole(user?.rol_nombre);
  appendRole(user?.rolName);
  appendRole(user?.rol?.id_rol);
  appendRole(user?.rol?.id);
  appendRole(user?.rol?.nombre);
  appendRole(user?.role?.id);
  appendRole(user?.role?.name);

  return Array.from(normalizedRoles);
};

const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [openMenus, setOpenMenus] = useState(() => {
    try {
      const storedMenus = sessionStorage.getItem(SIDEBAR_MENUS_STORAGE_KEY);
      return storedMenus ? JSON.parse(storedMenus) : {};
    } catch {
      return {};
    }
  });

  const renderIcon = (iconClass) =>
    iconClass ? <i className={`${iconClass} menu-icon`} aria-hidden="true" /> : null;

  const currentRoles = useMemo(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return [];

      const user = JSON.parse(storedUser);
      return extractUserRoles(user);
    } catch {
      return [];
    }
  }, []);

  const menuItems = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "pi pi-home",
        path: "/dashboard",
        roles: [ROLE_KEYS.ADMIN, ROLE_KEYS.CONTADOR],
      },
      {
        id: "usuarios",
        label: "Usuarios",
        icon: "pi pi-users",
        roles: [ROLE_KEYS.ADMIN],
        children: [
          {
            id: "usuarios-registro",
            label: "Registro de Usuarios",
            icon: "pi pi-user-plus",
            path: "/usuarios/registro",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "usuarios-roles",
            label: "Asignacion de Roles",
            icon: "pi pi-id-card",
            path: "/usuarios/asignacion-roles",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "rol",
            label: "Rol",
            icon: "pi pi-shield",
            path: "/rol",
            roles: [ROLE_KEYS.ADMIN],
          },
        ],
      },

      {
        id: "clients",
        label: "Clientes",
        icon: "pi pi-users",
        path: "/clients",
        roles: [ROLE_KEYS.ADMIN],
      },
      {
        id: "suppliers",
        label: "Proveedores",
        icon: "pi pi-briefcase",
        roles: [ROLE_KEYS.ADMIN],
        children: [
          {
            id: "suppliers-registro",
            label: "Registro de Proveedores",
            icon: "pi pi-plus-circle",
            path: "/suppliers/registro",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "suppliers-cuentas",
            label: "Cuenta de Proveedores",
            icon: "pi pi-wallet",
            path: "/suppliers/cuentas",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "suppliers-rutas",
            label: "Ruta de Proveedores",
            icon: "pi pi-directions",
            path: "/suppliers/rutas",
            roles: [ROLE_KEYS.ADMIN],
          },
        ],
      },
      {
        id: "operations",
        label: "Operaciones",
        icon: "pi pi-clipboard",
        roles: [ROLE_KEYS.ADMIN],
        children: [
          {
            id: "operations-registro",
            label: "Registro de Operaciones",
            icon: "pi pi-file-edit",
            path: "/operations/registro",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "operations-contenedores",
            label: "Asignacion de Contenedores",
            icon: "pi pi-box",
            path: "/operations/asignacion-contenedores",
            roles: [ROLE_KEYS.ADMIN],
          },
        ],
      },
      {
        id: "parameters",
        label: "Parametros",
        icon: "pi pi-cog",
        roles: [ROLE_KEYS.ADMIN],
        children: [
          {
            id: "tipo-servicio",
            label: "Tipo de Servicio",
            icon: "pi pi-wrench",
            path: "/tipo-servicio",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "tipo-contenedor",
            label: "Tipo de Contenedor",
            icon: "pi pi-inbox",
            path: "/tipo-contenedor",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "tipo-costo",
            label: "Tipo de Costo",
            icon: "pi pi-dollar",
            path: "/tipo-costo",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "estado-operacion",
            label: "Estado de Operacion",
            icon: "pi pi-sync",
            path: "/estado-operacion",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "moneda",
            label: "Moneda",
            icon: "pi pi-money-bill",
            path: "/moneda",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "ruta",
            label: "Ruta",
            icon: "pi pi-map",
            path: "/ruta",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "tipo-documento",
            label: "Tipo de Documento",
            icon: "pi pi-file",
            path: "/tipo-documento",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "tipo-nacionalizacion",
            label: "Tipo de Nacionalizacion",
            icon: "pi pi-globe",
            path: "/tipo-nacionalizacion",
            roles: [ROLE_KEYS.ADMIN],
          },
        ],
      },
      {
        id: "logistics",
        label: "Logistica",
        icon: "pi pi-truck",
        roles: [ROLE_KEYS.ADMIN],
        children: [
          {
            id: "containers",
            label: "Contenedores",
            icon: "pi pi-box",
            path: "/containers",
            roles: [ROLE_KEYS.ADMIN],
          },
          {
            id: "documents",
            label: "Documentos",
            icon: "pi pi-folder-open",
            path: "/documents",
            roles: [ROLE_KEYS.ADMIN],
          },
        ],
      },
      {
        id: "accounting",
        label: "Contabilidad",
        icon: "pi pi-calculator",
        roles: [ROLE_KEYS.ADMIN, ROLE_KEYS.CONTADOR],
        children: [
          {
            id: "costs",
            label: "Costos",
            icon: "pi pi-money-bill",
            path: "/costs",
            roles: [ROLE_KEYS.ADMIN, ROLE_KEYS.CONTADOR],
          },
          {
            id: "sales",
            label: "Ventas",
            icon: "pi pi-chart-line",
            path: "/sales",
            roles: [ROLE_KEYS.ADMIN, ROLE_KEYS.CONTADOR],
          },
        ],
      },
      {
        id: "insurance",
        label: "IA Seguros",
        icon: "pi pi-sparkles",
        path: "/insurance",
        roles: [ROLE_KEYS.ADMIN],
      },
    ],
    []
  );

  const filteredMenu = useMemo(() => {
    const filtrarMenuPorRol = (items, roles) =>
      items
        .filter(
          (item) =>
            !item.roles ||
            item.roles.some((allowedRole) => roles.includes(allowedRole))
        )
        .map((item) => {
          if (!item.children) return item;

          const children = filtrarMenuPorRol(item.children, roles);

          if (children.length === 0) return null;

          return { ...item, children };
        })
        .filter(Boolean);

    return filtrarMenuPorRol(menuItems, currentRoles);
  }, [menuItems, currentRoles]);

  const toggleMenu = (id) => {
    setOpenMenus((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleLogout = () => {
    fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      localStorage.removeItem("user");
      sessionStorage.removeItem(SIDEBAR_SCROLL_STORAGE_KEY);
      sessionStorage.removeItem(SIDEBAR_MENUS_STORAGE_KEY);
      navigate("/", { replace: true });
    });
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(SIDEBAR_MENUS_STORAGE_KEY, JSON.stringify(openMenus));
    } catch {
      // Ignorar problemas de almacenamiento del navegador.
    }
  }, [openMenus]);

  useEffect(() => {
    const expandedMenus = {};

    const marcarPadresActivos = (items) => {
      for (const item of items) {
        if (item.children?.length) {
          const tieneRutaActiva = item.children.some((child) => {
            if (child.path && pathname.startsWith(child.path)) {
              return true;
            }

            if (child.children?.length) {
              return marcarPadresActivos([child]);
            }

            return false;
          });

          if (tieneRutaActiva) {
            expandedMenus[item.id] = true;
            return true;
          }
        }
      }

      return false;
    };

    marcarPadresActivos(filteredMenu);
    setOpenMenus((prev) => ({ ...prev, ...expandedMenus }));
  }, [pathname, filteredMenu]);

  useEffect(() => {
    const menuElement = menuRef.current;
    if (!menuElement) {
      return undefined;
    }

    try {
      const savedScrollTop = sessionStorage.getItem(SIDEBAR_SCROLL_STORAGE_KEY);
      if (savedScrollTop !== null) {
        menuElement.scrollTop = Number(savedScrollTop) || 0;
      }
    } catch {
      // Ignorar problemas de almacenamiento del navegador.
    }

    const handleScroll = () => {
      try {
        sessionStorage.setItem(
          SIDEBAR_SCROLL_STORAGE_KEY,
          String(menuElement.scrollTop)
        );
      } catch {
        // Ignorar problemas de almacenamiento del navegador.
      }
    };

    menuElement.addEventListener("scroll", handleScroll);

    return () => {
      handleScroll();
      menuElement.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const renderMenuItems = (items, level = 0) =>
    items.map((item) => (
      <li key={item.id}>
        {item.children ? (
          <>
            <button
              type="button"
              className="menu-parent"
              onClick={() => toggleMenu(item.id)}
              aria-expanded={Boolean(openMenus[item.id])}
              style={level > 0 ? { paddingLeft: `${1 + level}rem` } : undefined}
            >
              {renderIcon(item.icon)}
              <span>{item.label}</span>
            </button>

            {openMenus[item.id] && (
              <ul className="submenu">
                {renderMenuItems(item.children, level + 1)}
              </ul>
            )}
          </>
        ) : (
          <NavLink
            to={item.path}
            className={({ isActive }) =>
              isActive || pathname.startsWith(item.path) ? "active" : ""
            }
            style={level > 0 ? { paddingLeft: `${1 + level}rem` } : undefined}
          >
            {renderIcon(item.icon)}
            <span>{item.label}</span>
          </NavLink>
        )}
      </li>
    ));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo text-center mb-4">
        <img
          src="/pjServices-logo.png"
          alt="PJ Services"
          className="sidebar-logo-img"
        />
      </div>

      <ul ref={menuRef} className="sidebar-menu">{renderMenuItems(filteredMenu)}</ul>

      <button type="button" className="logout-button" onClick={handleLogout}>
        {renderIcon("pi pi-sign-out")}
        <span>Cerrar sesion</span>
      </button>
    </aside>
  );
};

export default Sidebar;
