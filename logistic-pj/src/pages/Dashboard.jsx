import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { API_BASE_URL } from "../config/api";
import "../styles/dashboard.css";

const COLORS = ["#0f766e", "#2563eb", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#65a30d"];

const numberFmt = new Intl.NumberFormat("es-BO");
const moneyFmt = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtDate = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("es-BO") : "-");
const metric = (value) => numberFmt.format(Number(value || 0));

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_BASE_URL}/dashboard`, {
          credentials: "include",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "No se pudo cargar el dashboard.");
        }

        setData(payload);
      } catch (err) {
        console.error("Error al cargar dashboard:", err);
        setError(err.message || "No se pudo cargar el dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const clientStatusData = useMemo(() => {
    const rows = data?.operations_by_client_status || [];
    const statuses = data?.statuses || [];
    const selectedRows = selectedClient
      ? rows.filter((row) => String(row.id_cliente) === String(selectedClient))
      : rows;

    if (selectedClient) {
      return statuses.map((status) => {
        const match = selectedRows.find(
          (row) => String(row.id_estado_operacion) === String(status.id_estado_operacion)
        );
        return {
          name: status.estado_operacion,
          operaciones: Number(match?.total || 0),
        };
      });
    }

    const totalsByClient = new Map();
    selectedRows.forEach((row) => {
      const current = totalsByClient.get(row.cliente) || 0;
      totalsByClient.set(row.cliente, current + Number(row.total || 0));
    });

    return Array.from(totalsByClient, ([name, operaciones]) => ({ name, operaciones }))
      .sort((a, b) => b.operaciones - a.operaciones)
      .slice(0, 10);
  }, [data, selectedClient]);

  const statusChartData = useMemo(() => {
    const rows = data?.operations_by_client_status || [];

    if (!selectedStatus) {
      return data?.operations_by_status?.map((row) => ({
        name: row.estado_operacion,
        operaciones: Number(row.total || 0),
      })) || [];
    }

    return rows
      .filter((row) => String(row.id_estado_operacion) === String(selectedStatus))
      .map((row) => ({
        name: row.cliente,
        operaciones: Number(row.total || 0),
      }))
      .sort((a, b) => b.operaciones - a.operaciones)
      .slice(0, 10);
  }, [data, selectedStatus]);

  const selectedClientName = useMemo(
    () => data?.clients?.find((client) => String(client.id_cliente) === String(selectedClient))?.cliente,
    [data, selectedClient]
  );

  const selectedStatusName = useMemo(
    () =>
      data?.statuses?.find((status) => String(status.id_estado_operacion) === String(selectedStatus))
        ?.estado_operacion,
    [data, selectedStatus]
  );

  if (loading) {
    return (
      <div className="dashboard-container flex-grow-1 p-4">
        <div className="dashboard-empty">Cargando reportes del dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container flex-grow-1 p-4">
        <div className="alert alert-danger mb-0">{error}</div>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="dashboard-container flex-grow-1 p-4">
      <div className="dashboard-hero mb-4">
        <div>
          <h1 className="dashboard-title">Dashboard de operaciones</h1>
          <p className="dashboard-subtitle">Reportes conectados al backend para seguimiento comercial y logistico.</p>
        </div>
        <span className="dashboard-date">{new Date().toLocaleDateString("es-BO", { dateStyle: "full" })}</span>
      </div>

      <div className="dashboard-stat-grid mb-4">
        <div className="stat-panel">
          <span className="stat-label">Operaciones activas</span>
          <strong className="stat-value">{metric(metrics.total_operaciones)}</strong>
          <span className="stat-detail">{metric(metrics.operaciones_abiertas)} abiertas</span>
        </div>
        <div className="stat-panel">
          <span className="stat-label">Clientes activos</span>
          <strong className="stat-value">{metric(metrics.total_clientes)}</strong>
          <span className="stat-detail">con datos para filtrar reportes</span>
        </div>
        <div className="stat-panel">
          <span className="stat-label">Contenedores registrados</span>
          <strong className="stat-value">{metric(metrics.total_contenedores)}</strong>
          <span className="stat-detail">disponibles en gestion logistica</span>
        </div>
      </div>

      <div className="dashboard-grid mb-4">
        <div className="chart-card">
          <div className="section-header">
            <div>
              <h5>Operaciones por cliente</h5>
              <small>{selectedClientName ? `Estados de ${selectedClientName}` : "Top clientes por volumen"}</small>
            </div>
            <select
              className="form-select dashboard-filter"
              value={selectedClient}
              onChange={(event) => setSelectedClient(event.target.value)}
            >
              <option value="">Todos los clientes</option>
              {data.clients.map((client) => (
                <option key={client.id_cliente} value={client.id_cliente}>
                  {client.cliente}
                </option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={clientStatusData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" height={80} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="operaciones" name="Operaciones" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="section-header">
            <div>
              <h5>Operaciones por estado</h5>
              <small>{selectedStatusName ? `Clientes con estado ${selectedStatusName}` : "Distribucion general"}</small>
            </div>
            <select
              className="form-select dashboard-filter"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              <option value="">Todos los estados</option>
              {data.statuses.map((status) => (
                <option key={status.id_estado_operacion} value={status.id_estado_operacion}>
                  {status.estado_operacion}
                </option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={statusChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" height={80} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="operaciones" name="Operaciones" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid-three mb-4">
        <div className="chart-card">
          <div className="section-header">
            <div>
              <h5>Tendencia mensual</h5>
              <small>Operaciones asignadas en los ultimos meses</small>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.operations_by_month}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="total" name="Operaciones" stroke="#0f766e" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="section-header">
            <div>
              <h5>Tipos de servicio</h5>
              <small>Participacion por modalidad</small>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.operations_by_service} dataKey="total" nameKey="tipo_servicio" outerRadius={82} label>
                {data.operations_by_service.map((entry, index) => (
                  <Cell key={entry.id_tipo_servicio} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="section-header">
            <div>
              <h5>Resumen financiero en bolivianos</h5>
              <small>Ventas, costos y utilidad convertidos a BOB</small>
            </div>
          </div>
          <div className="finance-list">
            {data.financial_by_currency.length ? (
              data.financial_by_currency.map((row) => (
                <div className="finance-row" key={row.codigo_moneda}>
                  <strong>{row.codigo_moneda}</strong>
                  <span>Ventas {moneyFmt.format(row.total_ventas)}</span>
                  <span>Costos {moneyFmt.format(row.total_costos)}</span>
                  <span className={row.utilidad >= 0 ? "finance-positive" : "finance-negative"}>
                    Utilidad {moneyFmt.format(row.utilidad)}
                  </span>
                </div>
              ))
            ) : (
              <div className="dashboard-empty small">Aun no hay costos o ventas registrados.</div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid mb-4">
        <div className="chart-card">
          <div className="section-header">
            <div>
              <h5>Clientes principales</h5>
              <small>Mayor cantidad de operaciones activas</small>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.top_clients} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="cliente" tick={{ fontSize: 12 }} width={140} />
              <Tooltip />
              <Bar dataKey="total" name="Operaciones" fill="#d97706" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="section-header">
            <div>
              <h5>Operaciones recientes</h5>
              <small>Ultimas asignaciones registradas</small>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_operations.map((operation) => (
                  <tr key={operation.id_operacion}>
                    <td>{operation.codigo_operacion}</td>
                    <td>{operation.cliente}</td>
                    <td>{operation.tipo_servicio}</td>
                    <td>{operation.estado_operacion}</td>
                    <td>{fmtDate(operation.fecha_asignacion)}</td>
                  </tr>
                ))}
                {!data.recent_operations.length ? (
                  <tr>
                    <td className="text-center text-muted py-3" colSpan={5}>
                      No hay operaciones registradas.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
