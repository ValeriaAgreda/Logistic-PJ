import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/documents.css";

const Documents = () => {
  const [documents] = useState([
    {
      id: 1,
      type: "Bill",
      name: "Fact_2.pdf",
      date: "11/09/2025",
      client: "jhdncuhnuch",
    },
    {
      id: 2,
      type: "insurance policy",
      name: "sdfgv",
      date: "jdnicidwucnhi",
      client: "jdnicidwucnhi",
    },
    {
      id: 3,
      type: "Bill",
      name: "rggeheh",
      date: "srhhfhht",
      client: "srhhfhht",
    },
  ]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert(`File selected: ${file.name}`);
      // Aquí puedes implementar lógica de subida real más adelante
    }
  };

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="documents-view p-4 flex-grow-1">
        <h3 className="mb-4">Documents Management</h3>

        <div className="upload-box text-center mb-4">
          <div className="upload-icon">📤</div>
          <p className="mb-2">drag or drop files here</p>
          <label className="btn btn-orange">
            or select the file
            <input type="file" hidden onChange={handleFileUpload} />
          </label>
        </div>

        <table className="table documents-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Document</th>
              <th>Date</th>
              <th>Client</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.type}</td>
                <td>{doc.name}</td>
                <td>{doc.date}</td>
                <td>{doc.client}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Documents;
