import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "../styles/sidebar.css";

const Sidebar = () => {
  const { pathname } = useLocation();
  const [openMenu, setOpenMenu] = useState(null);

  const currentRole = "ADMIN";

  const menuItems = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "📊",
        path: "/dashboard",
        roles: ["ADMIN", "CONTADOR"],
      },
      {
        id: "operations",
        label: "Operaciones",
        icon: "📦",
        path: "/operations",
        roles: ["ADMIN"],
      },
      {
        id: "parameters",
        label: "Parametros",
        icon: "👥",
        roles: ["ADMIN"],
        children: [
          {
            id: "clients",
            label: "Clientes",
            icon: "[C]",
            path: "/clients",
            roles: ["ADMIN"],
          },
          {
            id: "suppliers",
            label: "Proveedores",
            icon: "[PV]",
            path: "/suppliers",
            roles: ["ADMIN"],
          },
          {
            id: "tipo-servicio",
            label: "Tipo de Servicio",
            icon: "[TS]",
            path: "/tipo-servicio",
            roles: ["ADMIN"],
          },
          {
            id: "tipo-contenedor",
            label: "Tipo de Contenedor",
            icon: "[TC]",
            path: "/tipo-contenedor",
            roles: ["ADMIN"],
          },
          {
            id: "tipo-costo",
            label: "Tipo de Costo",
            icon: "[T$]",
            path: "/tipo-costo",
            roles: ["ADMIN"],
          },
          {
            id: "tipo-documento",
            label: "Tipo de Documento",
            icon: "[TD]",
            path: "/tipo-documento",
            roles: ["ADMIN"],
          },
          {
            id: "tipo-nacionalizacion",
            label: "Tipo de Nacionalizacion",
            icon: "[TN]",
            path: "/tipo-nacionalizacion",
            roles: ["ADMIN"],
          },
        ],
      },
      {
        id: "logistics",
        label: "Logística",
        icon: "🚢",
        roles: ["ADMIN"],
        children: [
          {
            id: "containers",
            label: "Contenedores",
            path: "/containers",
            roles: ["ADMIN"],
          },
          {
            id: "documents",
            label: "Documentos",
            path: "/documents",
            roles: ["ADMIN"],
          },
        ],
      },
      {
        id: "accounting",
        label: "Contabilidad",
        icon: "💲",
        roles: ["ADMIN", "CONTADOR"],
        children: [
          {
            id: "costs",
            label: "Costos",
            icon: "[$]",
            path: "/costs",
            roles: ["ADMIN", "CONTADOR"],
          },
        ],
      },
      {
        id: "insurance",
        label: "IA Seguros",
        icon: "🧠",
        path: "/insurance",
        roles: ["ADMIN"],
      },
    ],
    []
  );

  const filteredMenu = useMemo(() => {
    const role = currentRole;

    return menuItems
      .filter((item) => !item.roles || item.roles.includes(role))
      .map((item) => {
        if (!item.children) return item;

        const children = item.children.filter(
          (c) => !c.roles || c.roles.includes(role)
        );

        if (children.length === 0) return null;

        return { ...item, children };
      })
      .filter(Boolean);
  }, [menuItems, currentRole]);

  const toggleMenu = (id) => {
    setOpenMenu((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    const parent = filteredMenu.find((item) =>
      item.children?.some((child) => pathname.startsWith(child.path))
    );
    if (parent) setOpenMenu(parent.id);
  }, [pathname, filteredMenu]);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo text-center mb-4">
        <img
          src="/pjServices-logo.png"
          alt="PJ Services"
          className="sidebar-logo-img"
        />
      </div>

      <ul className="sidebar-menu">
        {filteredMenu.map((item) => (
          <li key={item.id}>
            {item.children ? (
              <>
                <button
                  type="button"
                  className="menu-parent"
                  onClick={() => toggleMenu(item.id)}
                  aria-expanded={openMenu === item.id}
                >
                  {item.icon} {item.label}
                </button>

                {openMenu === item.id && (
                  <ul className="submenu">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <NavLink
                          to={child.path}
                          className={({ isActive }) =>
                            isActive || pathname.startsWith(child.path)
                              ? "active"
                              : ""
                          }
                        >
                          {child.icon ? (
                            <span className="menu-icon">{child.icon}</span>
                          ) : null}
                          {child.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  isActive || pathname.startsWith(item.path) ? "active" : ""
                }
              >
                {item.icon} {item.label}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
