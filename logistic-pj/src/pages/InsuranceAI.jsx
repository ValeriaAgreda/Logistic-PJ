import React from "react";
import Sidebar from "../components/Sidebar";
import "../styles/insurance.css";

const InsuranceAI = () => {
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="insurance-container flex-grow-1 p-4">
        <h3 className="mb-4">Insurance Recommendation</h3>

        <form className="insurance-form">
          <div className="mb-3">
            <label className="form-label">Load type</label>
            <input type="text" className="form-control" placeholder="Value" />
          </div>

          <div className="mb-3">
            <label className="form-label">Load value</label>
            <input type="text" className="form-control" placeholder="$ 0.00" disabled />
          </div>

          <div className="mb-3">
            <label className="form-label">Mode of transport</label>
            <input type="text" className="form-control" placeholder="Air" disabled />
          </div>

          <div className="mb-3">
            <label className="form-label">Route</label>
            <input type="text" className="form-control" placeholder="China - Bolivia" disabled />
          </div>

          <div className="form-check mb-4">
            <input className="form-check-input" type="checkbox" checked readOnly />
            <label className="form-check-label">
              Recommended insurance: <strong>All risk</strong>
            </label>
          </div>

          <div className="text-center">
            <button type="submit" className="btn btn-orange w-100">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InsuranceAI;
