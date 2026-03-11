import React from "react";
import Sidebar from "../components/Sidebar";
import "../styles/costs.css";

const Costs = () => {
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="costs-container p-4 flex-grow-1">
        <h3 className="mb-4">Cost Management</h3>

        <div className="d-flex gap-4 mb-4">
          {/* Tabla de costos */}
          <table className="table table-bordered cost-table">
            <thead>
              <tr>
                <th>Costo</th>
                <th>Costo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Transporte</td>
                <td>$ 0.00</td>
              </tr>
              <tr>
                <td>Seguro</td>
                <td>$ 0.00</td>
              </tr>
              <tr>
                <td>Costo puerto origen</td>
                <td>$ 0.00</td>
              </tr>
              <tr>
                <td>Costo puerto destino</td>
                <td>$ 0.00</td>
              </tr>
              <tr>
                <td>Transporte</td>
                <td>$ 0.00</td>
              </tr>
            </tbody>
          </table>

          {/* Resultados */}
          <table className="table table-bordered results-table">
            <thead>
              <tr>
                <th colSpan="2">Resultados</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total cost</td>
                <td>$ 0.00</td>
              </tr>
              <tr>
                <td>utility</td>
                <td>$ 0.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-end">
          <button className="btn btn-orange">Save</button>
        </div>
      </div>
    </div>
  );
};

export default Costs;
