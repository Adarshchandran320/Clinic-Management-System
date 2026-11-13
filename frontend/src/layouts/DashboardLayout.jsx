import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "../components/common/NotificationBell.jsx";

// Preclinic Dashboard Layout: Fixed left sidebar + sticky topbar + responsive mobile offcanvas
export default function DashboardLayout({ moduleConfig }) {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = moduleConfig?.navItems || [];
  const basePath = moduleConfig?.basePath || "";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderBrand = () => (
    <div className="d-flex align-items-center justify-content-between px-3 py-3 border-bottom">
      <div className="d-flex align-items-center gap-2">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-2 text-white fw-bold"
          style={{ width: 32, height: 32, backgroundColor: "#2E37A4" }}
        >
          <i className="bi bi-plus-lg"></i>
        </div>
        <span className="fs-5 fw-bold tracking-tight">Preclinic</span>
      </div>
      <span className="badge bg-light text-secondary border text-capitalize">
        {moduleConfig?.role || user?.role}
      </span>
    </div>
  );

  const renderNavLinks = (onItemClick) => (
    <div className="py-2 flex-grow-1">
      <div className="sidebar-menu-label">Main Menu</div>
      <nav className="nav flex-column">
        {navItems.map((item) => {
          const fullPath = item.path
            ? `${basePath}/${item.path}`.replace(/\/+/g, "/")
            : basePath;
          return (
            <NavLink
              key={fullPath}
              to={fullPath}
              end={Boolean(item.end)}
              onClick={onItemClick}
              className={({ isActive }) =>
                `sidebar-nav-link ${isActive ? "active" : ""}`
              }
            >
              <i className={`bi ${item.icon || "bi-grid"} fs-6`}></i>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="preclinic-wrapper">
      {/* Desktop Fixed Left Sidebar */}
      <aside className="preclinic-sidebar d-none d-lg-flex">
        {renderBrand()}
        {renderNavLinks()}
        <div className="p-3 border-top mt-auto">
          <button
            type="button"
            className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Offcanvas Sidebar */}
      {mobileMenuOpen && (
        <>
          <div
            className="offcanvas offcanvas-start show"
            tabIndex="-1"
            style={{ visibility: "visible", width: 260, zIndex: 1045 }}
          >
            <div className="d-flex align-items-center justify-content-between border-bottom pe-3">
              <div className="flex-grow-1">{renderBrand()}</div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
              ></button>
            </div>
            <div className="offcanvas-body p-0 d-flex flex-column">
              {renderNavLinks(() => setMobileMenuOpen(false))}
              <div className="p-3 border-top mt-auto">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm w-100"
                  onClick={handleLogout}
                >
                  <i className="bi bi-box-arrow-right me-2"></i>Logout
                </button>
              </div>
            </div>
          </div>
          <div
            className="offcanvas-backdrop fade show"
            style={{ zIndex: 1040 }}
            onClick={() => setMobileMenuOpen(false)}
          ></div>
        </>
      )}

      {/* Main Content Area */}
      <div className="preclinic-main">
        {/* Sticky Topbar */}
        <header className="preclinic-topbar d-flex align-items-center justify-content-between px-3 px-md-4">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-light border d-lg-none"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle navigation"
            >
              <i className="bi bi-list fs-5"></i>
            </button>

            {/* Topbar Search Input */}
            <div className="input-group input-group-sm d-none d-sm-flex" style={{ width: 260 }}>
              <span className="input-group-text bg-transparent border-end-0 text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="search"
                className="form-control border-start-0 ps-0"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Right Topbar Controls: Dark-Mode Toggle, Notification Icon, User Avatar & Logout */}
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <button
              type="button"
              className="btn btn-light border rounded-circle d-inline-flex align-items-center justify-content-center"
              style={{ width: 38, height: 38 }}
              onClick={toggleTheme}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              aria-label="Toggle dark mode"
            >
              <i className={`bi ${theme === "light" ? "bi-moon" : "bi-sun"}`}></i>
            </button>

            <NotificationBell />

            <div className="dropdown">
              <button
                className="btn btn-light border d-flex align-items-center gap-2 py-1 px-2 rounded-pill dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <span
                  className="rounded-circle text-white d-inline-flex align-items-center justify-content-center fw-semibold small"
                  style={{ width: 28, height: 28, backgroundColor: "#0E9384" }}
                >
                  {(user?.username || "U").charAt(0).toUpperCase()}
                </span>
                <span className="small fw-medium d-none d-md-inline">
                  {user?.username || "User"}
                </span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm border">
                <li className="px-3 py-2 border-bottom">
                  <div className="fw-semibold small">{user?.username || "Authenticated User"}</div>
                  <div className="text-secondary text-capitalize" style={{ fontSize: "0.75rem" }}>
                    Role: {user?.role || moduleConfig?.role}
                  </div>
                </li>
                <li>
                  <button
                    type="button"
                    className="dropdown-item text-danger small d-flex align-items-center gap-2 py-2"
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right"></i>
                    <span>Sign Out</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="container-fluid p-3 p-md-4 flex-grow-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
