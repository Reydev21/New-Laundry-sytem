import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import CustomerLayout from "./layouts/CustomerLayout";

// Public Pages
import Home from "./pages/public/Home";
import Services from "./pages/public/Services";
import TrackLaundry from "./pages/public/TrackLaundry";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import Login from "./pages/public/Login";
import CustomerAuth from "./pages/public/CustomerAuth";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerBook from "./pages/customer/CustomerBook";
import CustomerOrders from "./pages/customer/CustomerOrders";

// Admin/Staff Pages
import Dashboard from "./pages/admin/Dashboard";
import Orders from "./pages/admin/Orders";
import Customers from "./pages/admin/Customers";
import ServicesAdmin from "./pages/admin/Services";
import Staff from "./pages/admin/Staff";
import Payments from "./pages/admin/Payments";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import AuditLogs from "./pages/admin/AuditLogs";

// Route Guards
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <Routes>
      {/* ================= PUBLIC ROUTES ================= */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/track" element={<TrackLaundry />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/customer/login" element={<CustomerAuth />} />
        <Route path="/customer/register" element={<CustomerAuth />} />
      </Route>

      {/* ============ CUSTOMER PROTECTED ROUTES ============ */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="book" element={<CustomerBook />} />
        <Route path="orders" element={<CustomerOrders />} />
      </Route>

      {/* ============ ADMIN / STAFF PROTECTED ROUTES ============ */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin", "staff"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Accessible by BOTH Admin and Staff */}
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="payments" element={<Payments />} />
        <Route path="settings" element={<Settings />} />

        {/* ADMIN ONLY ROUTES */}
        <Route
          path="services"
          element={
            <AdminRoute>
              <ServicesAdmin />
            </AdminRoute>
          }
        />
        <Route
          path="reports"
          element={
            <AdminRoute>
              <Reports />
            </AdminRoute>
          }
        />
        <Route
          path="staff"
          element={
            <AdminRoute>
              <Staff />
            </AdminRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <AdminRoute>
              <AuditLogs />
            </AdminRoute>
          }
        />
      </Route>

      {/* ============ FALLBACK / 404 ============ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}