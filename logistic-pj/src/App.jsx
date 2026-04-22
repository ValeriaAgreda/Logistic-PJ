import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import SupplierAccounts from "./pages/SupplierAccounts";
import SupplierRoutes from "./pages/SupplierRoutes";
import Suppliers from "./pages/Suppliers";
import Operations from "./pages/Operations";
import OperationContainerAssignments from "./pages/OperationContainerAssignments";
import Containers from "./pages/Containers";
import Documents from "./pages/Documents";
import Costs from "./pages/Costs";
import Sales from "./pages/Sales";
import InsuranceAI from "./pages/InsuranceAI";
import ServiceType from "./pages/ServiceType";
import ContainerType from "./pages/ContainerType";
import CostType from "./pages/CostType";
import OperationStatus from "./pages/OperationStatus";
import Currency from "./pages/Currency";
import RouteCatalog from "./pages/RouteCatalog";
import DocumentType from "./pages/DocumentType";
import NationalizationType from "./pages/NationalizationType";
import Roles from "./pages/Roles";
import UserRoleAssignments from "./pages/UserRoleAssignments";
import Users from "./pages/Users";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/olvide-contrasena" element={<ForgotPassword />} />
        <Route path="/restablecer-contrasena" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/usuarios" element={<Navigate to="/usuarios/registro" replace />} />
        <Route path="/usuarios/registro" element={<Users />} />
        <Route path="/usuarios/asignacion-roles" element={<UserRoleAssignments />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/suppliers" element={<Navigate to="/suppliers/registro" replace />} />
        <Route path="/suppliers/registro" element={<Suppliers />} />
        <Route path="/suppliers/cuentas" element={<SupplierAccounts />} />
        <Route path="/suppliers/rutas" element={<SupplierRoutes />} />
        <Route path="/operations" element={<Navigate to="/operations/registro" replace />} />
        <Route path="/operations/registro" element={<Operations />} />
        <Route
          path="/operations/asignacion-contenedores"
          element={<OperationContainerAssignments />}
        />
        <Route path="/containers" element={<Containers />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/costs" element={<Costs />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/insurance" element={<InsuranceAI />} />
        <Route path="/tipo-servicio" element={<ServiceType />} />
        <Route path="/tipo-contenedor" element={<ContainerType />} />
        <Route path="/tipo-costo" element={<CostType />} />
        <Route path="/estado-operacion" element={<OperationStatus />} />
        <Route path="/moneda" element={<Currency />} />
        <Route path="/ruta" element={<RouteCatalog />} />
        <Route path="/tipo-documento" element={<DocumentType />} />
        <Route path="/tipo-nacionalizacion" element={<NationalizationType />} />
        <Route path="/rol" element={<Roles />} />
      </Routes>
    </Router>
  );
}

export default App;
