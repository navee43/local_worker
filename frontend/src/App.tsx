import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./components/Signup";
import Login from "./components/Login";
import GoogleAuthSuccess from "./components/GoogleAuthSuccess";
import WorkerDashboard from "./components/Workerdashboard";
import EmployerDashboard from "./components/Employerdashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/signup" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/worker/dashboard" element={<WorkerDashboard />} />
        <Route path="/employer/dashboard" element={<EmployerDashboard />} />
        {/* Google OAuth redirect landing */}
        <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;