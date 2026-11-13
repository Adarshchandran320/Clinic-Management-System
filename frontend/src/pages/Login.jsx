import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth, ROLE_HOME_PATHS } from "../context/AuthContext.jsx";
import "./Login.css";

export default function Login() {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);
  const [showForgotHelper, setShowForgotHelper] = useState(false);

  // If already authenticated, redirect to the user's role dashboard
  if (isAuthenticated && user?.role) {
    const dest = ROLE_HOME_PATHS[user.role] || "/pharmacist";
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validation: ensure fields are non-empty before calling API
    if (!username.trim() || !password) {
      setValidated(true);
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(username.trim(), password);
      const targetPath = ROLE_HOME_PATHS[loggedInUser.role] || "/pharmacist";
      navigate(targetPath, { replace: true });
    } catch (err) {
      // Extract backend error message if available
      const backendMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Invalid username or password. Please check your credentials.";
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-portal-container">
      <div className="login-portal-wrapper">
        <div className="row g-4 g-lg-5 align-items-center">
          {/* LEFT HALF: Login Form */}
          <div className="col-12 col-lg-5">
            <div className="login-form-wrapper">
              {/* Brand Header */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="login-brand-icon">
                  <i className="bi bi-plus-lg fs-5"></i>
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-5 fw-bold text-dark tracking-tight">Preclinic CMS</span>
                    <span
                      className="d-inline-block rounded-circle"
                      style={{ width: 6, height: 6, backgroundColor: "#3fa66b" }}
                    ></span>
                  </div>
                  <span className="text-secondary small fw-medium text-uppercase tracking-wider" style={{ fontSize: "0.7rem" }}>
                    Clinic Management System
                  </span>
                </div>
              </div>

              {/* Heading */}
              <div className="mb-4">
                <h1 className="h2 fw-bold text-dark mb-1">Welcome back!</h1>
                <p className="text-secondary small mb-0">Sign in to continue to your dashboard.</p>
              </div>

              {/* Error Alert Banner */}
              {error && (
                <div
                  className="alert alert-danger py-2 px-3 rounded-4 d-flex align-items-center gap-2 small mb-3 border-danger-subtle bg-danger-subtle text-danger"
                  role="alert"
                >
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                  <span className="flex-grow-1">{error}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-sm ms-auto"
                    aria-label="Close"
                    onClick={() => setError(null)}
                  ></button>
                </div>
              )}

              {/* Login Form */}
              <form noValidate onSubmit={handleSubmit}>
                {/* Username Input */}
                <div className="mb-3">
                  <label htmlFor="login-username" className="form-label small fw-semibold text-secondary mb-1">
                    Username
                  </label>
                  <div className="login-input-group">
                    <i className="bi bi-person login-input-icon"></i>
                    <input
                      id="login-username"
                      type="text"
                      className={`form-control login-input-pill ${
                        validated && !username.trim() ? "is-invalid" : ""
                      }`}
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError(null);
                      }}
                      required
                      autoComplete="username"
                      disabled={loading}
                    />
                    <div className="invalid-feedback ms-3">Username is required.</div>
                  </div>
                </div>

                {/* Password Input */}
                <div className="mb-3">
                  <label htmlFor="login-password" className="form-label small fw-semibold text-secondary mb-1">
                    Password
                  </label>
                  <div className="login-input-group">
                    <i className="bi bi-lock login-input-icon"></i>
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      className={`form-control login-input-pill login-password-input ${
                        validated && !password ? "is-invalid" : ""
                      }`}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="login-eye-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={loading}
                    >
                      <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                    <div className="invalid-feedback ms-3">Password is required.</div>
                  </div>
                </div>

                {/* Forgot Password Row */}
                <div className="d-flex justify-content-end mb-3">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small text-dark fw-semibold"
                    onClick={() => setShowForgotHelper((prev) => !prev)}
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Inline Forgot Password Helper */}
                {showForgotHelper && (
                  <div className="alert alert-info py-2 px-3 rounded-4 small mb-3 border-info-subtle bg-info-subtle text-info-emphasis">
                    <i className="bi bi-info-circle me-1"></i>
                    Please contact your Clinic Administrator to reset your password.
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn login-btn-submit w-100 d-flex align-items-center justify-content-center gap-2 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </form>

              {/* Admin Notice Divider */}
              <div className="login-divider">or</div>
              <p className="text-center text-secondary small fst-italic mb-4" style={{ fontSize: "0.8rem" }}>
                Staff accounts are created and managed by the clinic admin.
              </p>

              {/* Footer */}
              <div className="pt-3 border-top d-flex align-items-center justify-content-between text-secondary small" style={{ fontSize: "0.75rem" }}>
                <div className="d-flex align-items-center gap-1">
                  <i className="bi bi-shield-check text-success"></i>
                  <span>Secure, role-based access</span>
                </div>
                <span className="text-secondary text-decoration-none">Privacy Policy</span>
              </div>
            </div>
          </div>

          {/* RIGHT HALF: Branding Hero Card */}
          <div className="col-12 col-lg-7 d-none d-lg-block">
            <div className="login-hero-card">
              <div className="login-illustration-wrapper">
                <img
                  src="/assets/login-illustration.png"
                  alt="Doctor and patient consultation illustration"
                  className="login-illustration-img"
                />
              </div>
              <div className="text-center" style={{ maxWidth: "480px" }}>
                <h2 className="h4 fw-bold text-dark mb-2">Care, records and pharmacy in one place</h2>
                <p className="text-secondary small mb-0">
                  Appointments, consultations, prescriptions and stock, managed together.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
