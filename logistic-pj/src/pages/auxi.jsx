import React from "react";
import "../styles/operations.css";

const Operations = () => {
  return (
    <>
      <div className="operations-container p-4 flex-grow-1">
        <h3 className="mb-4">Register import operation</h3>

        <form className="operation-form">
          <div className="mb-3">
            <label className="form-label">Client</label>
            <select className="form-select">
              <option>Select</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Type of transport</label>
            <select className="form-select">
              <option>Select</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Type of container</label>
            <select className="form-select">
              <option>Select</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Sailing date</label>
            <input type="date" className="form-control" />
          </div>

          <div className="mb-4">
            <label className="form-label">Departure port</label>
            <select className="form-select">
              <option>Select</option>
            </select>
          </div>

          <button type="submit" className="btn btn-dark w-100">Register</button>
        </form>
      </div>
    </>
  );
};

export default Operations;
