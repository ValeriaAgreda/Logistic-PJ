import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Suppliers from "./pages/Suppliers";
import Operations from "./pages/Operations";
import Containers from "./pages/Containers";
import Documents from "./pages/Documents";
import Costs from "./pages/Costs";
import InsuranceAI from "./pages/InsuranceAI";
import ServiceType from "./pages/ServiceType";
import ContainerType from "./pages/ContainerType";
import CostType from "./pages/CostType";
import DocumentType from "./pages/DocumentType";
import NationalizationType from "./pages/NationalizationType";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/containers" element={<Containers />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/costs" element={<Costs />} />
        <Route path="/insurance" element={<InsuranceAI />} />
        <Route path="/tipo-servicio" element={<ServiceType />} />
        <Route path="/tipo-contenedor" element={<ContainerType />} />
        <Route path="/tipo-costo" element={<CostType />} />
        <Route path="/tipo-documento" element={<DocumentType />} />
        <Route path="/tipo-nacionalizacion" element={<NationalizationType />} />
      </Routes>
    </Router>
  );
}

export default App;
