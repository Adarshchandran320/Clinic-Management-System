import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth, ROLE_HOME_PATHS } from "../context/AuthContext.jsx";
import ErrorAlert from "../components/common/ErrorAlert.jsx";

// Preclinic Sign In page: centered card, logo, username, password with show/hide toggle, Login button, error alert
// Strictly no social login, no register link, no remember-me checkbox
export default function Login() {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);

  if (isAuthenticated && user?.role) {
    const dest = ROLE_HOME_PATHS[user.role] || "/pharmacist";
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

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
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg d-flex flex-column align-items-center justify-content-center p-3">
      {/* Brand Logo */}
      <div className="d-flex align-items-center gap-2 mb-4">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-2 text-white fw-bold shadow-sm"
          style={{ width: 38, height: 38, backgroundColor: "#2E37A4" }}
        >
          <i className="bi bi-plus-lg fs-5"></i>
        </div>
        <span className="fs-3 fw-bold tracking-tight">Preclinic</span>
      </div>

      {/* Centered Sign In Card */}
      <div className="card border shadow-sm w-100" style={{ maxWidth: 440 }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <h4 className="fw-bold mb-1">Sign In</h4>
            <p className="text-secondary small mb-0">
              Please enter below details to access the dashboard
            </p>
          </div>

          {error && <ErrorAlert error={error} onClose={() => setError(null)} />}

          <form
            noValidate
            className={validated ? "was-validated" : ""}
            onSubmit={handleSubmit}
          >
            <div className="mb-3">
              <label htmlFor="login-username" className="form-label fw-medium small">
                Username
              </label>
              <div className="input-group">
                <span className="input-group-text bg-transparent text-secondary">
                  <i className="bi bi-person"></i>
                </span>
                <input
                  id="login-username"
                  type="text"
                  className="form-control"
                  placeholder="Enter Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={loading}
                />
                <div className="invalid-feedback">Username is required.</div>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="login-password" className="form-label fw-medium small">
                Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-transparent text-secondary">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="form-control border-end-0"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-group-text bg-transparent text-secondary"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex="-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
                <div className="invalid-feedback">Password is required.</div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="text-secondary small mt-4">
        Copyright &copy; 2026 - Preclinic
      </div>
    </div>
  );
}
