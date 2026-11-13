import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import notificationApi from "../../api/notificationApi.js";
import { useAuth } from "../../context/AuthContext.jsx";

function getNotificationIcon(type) {
  switch (type) {
    case "appointment":
      return { icon: "bi-calendar-check", color: "text-primary", bg: "bg-primary-subtle" };
    case "token":
      return { icon: "bi-ticket-detailed", color: "text-info", bg: "bg-info-subtle" };
    case "prescription":
      return { icon: "bi-capsule", color: "text-success", bg: "bg-success-subtle" };
    case "inventory":
      return { icon: "bi-exclamation-triangle-fill", color: "text-warning", bg: "bg-warning-subtle" };
    case "lab_order":
      return { icon: "bi-clipboard2-pulse", color: "text-purple", bg: "bg-light" };
    case "lab_report":
      return { icon: "bi-file-earmark-medical", color: "text-danger", bg: "bg-danger-subtle" };
    case "user":
      return { icon: "bi-person-badge", color: "text-secondary", bg: "bg-secondary-subtle" };
    default:
      return { icon: "bi-bell", color: "text-primary", bg: "bg-primary-subtle" };
  }
}

function formatNotificationTime(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const [count, listRes] = await Promise.all([
        notificationApi.unreadCount(),
        notificationApi.list({ page_size: 10 }),
      ]);
      setUnreadCount(count);
      const items = listRes?.results || listRes?.data || (Array.isArray(listRes) ? listRes : []);
      setNotifications(items);
    } catch {
      // Silently handle transient network/auth polling errors
    }
  }, []);

  // Polling every 20 seconds, pausing while the browser tab is hidden
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      if (document.visibilityState !== "hidden") {
        fetchNotifications();
      }
    }, 20000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleMarkReadAll = async (e) => {
    e.stopPropagation();
    try {
      await notificationApi.markReadAll();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  const handleNotificationClick = async (notif) => {
    const id = notif.id ?? notif.NotificationId;
    if (!notif.is_read) {
      try {
        await notificationApi.markRead(id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            (n.id ?? n.NotificationId) === id ? { ...n, is_read: true } : n
          )
        );
      } catch {
        // Continue navigation
      }
    }

    setIsOpen(false);

    // Resolve navigation route based on notification type and user role
    const role = (user?.role || "").toLowerCase();
    const type = notif.type;
    const model = (notif.related_model || "").toLowerCase();

    if (type === "appointment" || model === "appointment") {
      if (role === "doctor") navigate("/doctor/appointments");
      else if (role === "admin") navigate("/admin/appointments");
      else navigate("/receptionist/appointments");
    } else if (type === "token" || model === "token") {
      if (role === "doctor") navigate("/doctor/appointments");
      else navigate("/receptionist/tokens");
    } else if (type === "prescription" || model === "prescription") {
      if (role === "pharmacist") navigate("/pharmacist/queue");
      else navigate("/doctor/prescriptions");
    } else if (type === "inventory" || model === "pharmacystock") {
      if (role === "admin") navigate("/admin/medicines");
      else navigate("/pharmacist/stock");
    } else if (type === "lab_order" || model === "labprescription") {
      if (role === "doctor") navigate("/doctor/lab-reports");
      else navigate("/lab/orders");
    } else if (type === "lab_report" || model === "labreport") {
      if (role === "receptionist") navigate("/receptionist/billing");
      else if (role === "doctor") navigate("/doctor/lab-reports");
      else navigate("/lab/reports");
    } else if (type === "user" || model === "user") {
      navigate("/admin/users");
    }
  };

  return (
    <div className="position-relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className="btn btn-light border rounded-circle d-inline-flex align-items-center justify-content-center position-relative"
        style={{ width: 38, height: 38 }}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <i className="bi bi-bell"></i>
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light"
            style={{ fontSize: "0.65rem", padding: "0.25em 0.45em" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
            <span className="visually-hidden">unread notifications</span>
          </span>
        )}
      </button>

      {/* Notifications Dropdown Card */}
      {isOpen && (
        <div
          className="card shadow-lg border-0 position-absolute end-0 mt-2 rounded-3"
          style={{ width: 340, maxWidth: "90vw", zIndex: 1060 }}
        >
          {/* Header */}
          <div className="card-header bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold small text-dark">Notifications</span>
              {unreadCount > 0 && (
                <span className="badge bg-primary-subtle text-primary rounded-pill small">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none small text-muted"
                style={{ fontSize: "0.75rem" }}
                onClick={handleMarkReadAll}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List items */}
          <div className="list-group list-group-flush" style={{ maxHeight: 320, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-bell-slash fs-3 d-block mb-1 text-secondary opacity-50"></i>
                <span className="small">No notifications yet</span>
              </div>
            ) : (
              notifications.map((notif) => {
                const id = notif.id ?? notif.NotificationId;
                const style = getNotificationIcon(notif.type);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`list-group-item list-group-item-action d-flex align-items-start gap-2 p-2 border-bottom ${
                      !notif.is_read ? "bg-light-subtle" : ""
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div
                      className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${style.bg} ${style.color}`}
                      style={{ width: 32, height: 32 }}
                    >
                      <i className={`bi ${style.icon} fs-6`}></i>
                    </div>

                    <div className="flex-grow-1 overflow-hidden">
                      <div className="d-flex justify-content-between align-items-baseline">
                        <span className={`small text-truncate ${!notif.is_read ? "fw-bold text-dark" : "text-secondary"}`}>
                          {notif.title}
                        </span>
                        <span className="text-muted text-nowrap ms-1" style={{ fontSize: "0.65rem" }}>
                          {formatNotificationTime(notif.created_at)}
                        </span>
                      </div>
                      <p
                        className="mb-0 text-muted small text-truncate"
                        style={{ fontSize: "0.75rem", maxWidth: "230px" }}
                        title={notif.message}
                      >
                        {notif.message}
                      </p>
                    </div>

                    {!notif.is_read && (
                      <span
                        className="rounded-circle bg-primary flex-shrink-0 mt-1"
                        style={{ width: 8, height: 8 }}
                        title="Unread"
                      ></span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
