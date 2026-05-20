import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loadUser } from "../store/slices/authSlice";
import useAuth from "../hooks/useAuth";

import ProtectedRoute from "./ProtectedRoute";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Markets from "../pages/Markets";
import Trading from "../pages/Trading";
import Options from "../pages/Options";
import Strategies from "../pages/Strategies";
import Calculator from "../pages/Calculator";

const AppRouter = () => {
  const dispatch = useDispatch();
  const { token } = useAuth();

  // Re-validate token on app load
  useEffect(() => {
    if (token) dispatch(loadUser());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/markets" element={<Markets />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/options" element={<Options />} />
          <Route path="/strategies" element={<Strategies />} />
          <Route path="/calculator" element={<Calculator />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
