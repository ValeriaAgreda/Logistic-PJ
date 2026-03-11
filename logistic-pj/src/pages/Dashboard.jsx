// src/pages/Dashboard.jsx
import React from "react";
import Sidebar from "../components/Sidebar";
import "../styles/dashboard.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from "recharts";

const Dashboard = () => {
  // Datos estáticos
  const operationsData = [
    { month: "Jan", operations: 10 },
    { month: "Feb", operations: 15 },
    { month: "Mar", operations: 20 },
    { month: "Apr", operations: 12 },
    { month: "May", operations: 24 },
  ];

  const transportData = [
    { type: "Maritime", value: 12 },
    { type: "Aerial", value: 5 },
    { type: "Terrestrial", value: 20 },
    { type: "Bimodal", value: 8 },
  ];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="dashboard-container flex-grow-1 p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4>Welcome Administrator</h4>
          <span className="text-muted">Thursday, May 10, 2025</span>
        </div>

        {/* Estadísticas */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card stat-card">
              <div className="card-body text-center">
                <div className="stat-icon">⏱</div>
                <h5 className="card-title">24 Operations</h5>
                <p className="card-text text-muted">imports recorded in May</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card stat-card">
              <div className="card-body text-center">
                <div className="stat-icon">💲</div>
                <h5 className="card-title">$5,387</h5>
                <p className="card-text text-muted">sum of logistics costs</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card stat-card">
              <div className="card-body text-center">
                <div className="stat-icon">🚚</div>
                <h5 className="card-title">Truck</h5>
                <p className="card-text text-muted">most used type of transport</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h6 className="text-center">Monthly Operations</h6>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={operationsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="operations" fill="#007bff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h6 className="text-center">Transport Types</h6>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={transportData}
                      dataKey="value"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {transportData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="row">
          <div className="col-md-3">
            <button className="dashboard-btn w-100">➕ New Operation</button>
          </div>
          <div className="col-md-3">
            <button className="dashboard-btn w-100">📦 Register Container</button>
          </div>
          <div className="col-md-3">
            <button className="dashboard-btn w-100">📁 Upload Documents</button>
          </div>
          <div className="col-md-3">
            <button className="dashboard-btn w-100">📊 View Reports</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
