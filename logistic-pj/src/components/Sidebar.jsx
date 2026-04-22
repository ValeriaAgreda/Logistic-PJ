import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "../styles/sidebar.css";

const Sidebar = () => {
  const { pathname } = useLocation();
  const [openMenus, setOpenMenus] = useState({});

  const currentRole = "ADMIN";

  const renderIcon = (iconClass) =>
    iconClass ? <i className={`${iconClass} menu-icon`} aria-hidden="true" /> : null;

  const menuItems = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "pi pi-home",
        path: "/dashboard",
        roles: ["ADMIN", "CONTADOR"],
      },
      {
        id: "usuarios",
        label: "Usuarios",
        icon: "pi pi-users",
        roles: ["ADMIN"],
        children: [
          {
            id: "usuarios-registro",
            label: "Registro de Usuarios",
            icon: "pi pi-user-plus",
            path: "/usuarios/registro",
            roles: ["ADMIN"],
          },
          {
            id: "usuarios-roles",
            label: "Asignacion de Roles",
            icon: "pi pi-id-card",
            path: "/usuarios/asignacion-roles",
            roles: ["ADMIN"],
          },
          {
            id: "rol",
            label: "Rol",
            icon: "pi pi-shield",
            path: "/rol",
            roles: ["ADMIN"],
          },
        ],
      },

      {
        id: "clients",
        label: "Clientes",
        icon: "pi pi-users",
        path: "/clients",
        roles: ["ADMIN"],
      },
      {
        id: "suppliers",
        label: "Proveedores",
        icon: "pi pi-briefcase",
        roles: ["ADMIN"],
        children: [
          {
            id: "suppliers-registro",
            label: "Registro de Proveedores",
            icon: "pi pi-plus-circle",
            path: "/suppliers/registro",
            roles: ["ADMIN"],
          },
          {
            id: "suppliers-cuentas",
            label: "Cuenta de Proveedores",
            icon: "pi pi-wallet",
            path: "/suppliers/cuentas",
            roles: ["ADMIN"],
          },
          {
            id: "suppliers-rutas",
            label: "Ruta de Proveedores",
            icon: "pi pi-directions",
            path: "/suppliers/rutas",
            roles: ["ADMIN"],
          },
        ],
      },
      {
        id: "operations",
        label: "Operaciones",
        icon: "pi pi-clipboard",
        roles: ["ADMIN"],
        children: [
          {
            id: "operations-registro",
            label: "Registro de Operaciones",
            icon: "pi pi-file-edit",
            path: "/operations/registro",
            roles: ["ADMIN"],
          },
          {
            id: "operations-contenedores",
            label: "Asignacion de Contenedores",
            icon: "pi pi-box",
            path: "/operations/asignacion-contenedores",
            roles: ["ADMIN"],
          },
        ],
      },
      {
        id: "parameters",
        label: "Parametros",
        icon: "pi pi-cog",
        roles: ["ADMIN"],
        children: [
          {
            id: "tipo-servicio",
            label: "Tipo de Servicio",
            icon: "pi pi-wrench",
            path: "/tipo-servicio",
            roles: ["ADMIN"],
          },
          {
            id: "tipo-contenedor",
            label: "Tipo de Contenedor",
            icon: "pi pi-inbox",
            path: "/tipo-contenedor",
            roles: ["ADMIN"],
          },
          {
            id: "tipo-costo",
            label: "Tipo de Costo",
            icon: "pi pi-dollar",
            path: "/tipo-costo",
            roles: ["ADMIN"],
          },
          {
            id: "estado-operacion",
            label: "Estado de Operacion",
            icon: "pi pi-sync",
            path: "/estado-operacion",
            roles: ["ADMIN"],
          },
          {
            id: "moneda",
            label: "Moneda",
            icon: "pi pi-money-bill",
            path: "/moneda",
            roles: ["ADMIN"],
          },
          {
            id: "ruta",
            label: "Ruta",
            icon: "pi pi-map",
            path: "/ruta",
            roles: ["ADMIN"],
          },
          {
            id: "tipo-documento",
            label: "Tipo de Documento",
            icon: "pi pi-file",
            path: "/tipo-documento",
            roles: ["ADMIN"],
          },
          {
            id: "tipo-nacionalizacion",
            label: "Tipo de Nacionalizacion",
            icon: "pi pi-globe",
            path: "/tipo-nacionalizacion",
            roles: ["ADMIN"],
          },
        ],
      },
      {
        id: "logistics",
        label: "Logistica",
        icon: "pi pi-truck",
        roles: ["ADMIN"],
        children: [
          {
            id: "containers",
            label: "Contenedores",
            icon: "pi pi-box",
            path: "/containers",
            roles: ["ADMIN"],
          },
          {
            id: "documents",
            label: "Documentos",
            icon: "pi pi-folder-open",
            path: "/documents",
            roles: ["ADMIN"],
          },
        ],
      },
      {
        id: "accounting",
        label: "Contabilidad",
        icon: "pi pi-calculator",
        roles: ["ADMIN", "CONTADOR"],
        children: [
          {
            id: "costs",
            label: "Costos",
            icon: "pi pi-money-bill",
            path: "/costs",
            roles: ["ADMIN", "CONTADOR"],
          },
          {
            id: "sales",
            label: "Ventas",
            icon: "pi pi-chart-line",
            path: "/sales",
            roles: ["ADMIN", "CONTADOR"],
          },
        ],
      },
      {
        id: "insurance",
        label: "IA Seguros",
        icon: "pi pi-sparkles",
        path: "/insurance",
        roles: ["ADMIN"],
      },
    ],
    []
  );

  const filteredMenu = useMemo(() => {
    const filtrarMenuPorRol = (items, role) =>
      items
        .filter((item) => !item.roles || item.roles.includes(role))
        .map((item) => {
          if (!item.children) return item;

          const children = filtrarMenuPorRol(item.children, role);

          if (children.length === 0) return null;

          return { ...item, children };
        })
        .filter(Boolean);

    return filtrarMenuPorRol(menuItems, currentRole);
  }, [menuItems, currentRole]);

  const toggleMenu = (id) => {
    setOpenMenus((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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

      <ul className="sidebar-menu">{renderMenuItems(filteredMenu)}</ul>
    </aside>
  );
};

export default Sidebar;
