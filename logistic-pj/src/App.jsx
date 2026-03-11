// src/App.jsx
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
      </Routes>
    </Router>
  );
}

export default App;
