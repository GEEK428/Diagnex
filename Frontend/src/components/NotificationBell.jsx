import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Users, MailOpen } from "lucide-react";
import API_BASE from "../config";
import "./NotificationBell.css";

// Track dismissed IDs in session so they don't come back after fetch
const getDismissed = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem("noti_dismissed") || "[]"));
  } catch {
    return new Set();
  }
};

const addDismissed = (id) => {
  const set = getDismissed();
  set.add(id);
  sessionStorage.setItem("noti_dismissed", JSON.stringify([...set]));
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const removeTimers = useRef({});

  const getAuthHeaders = () => {
    const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  };

  // Schedule removal of a notification after 30 seconds
  const scheduleRemoval = useCallback((id) => {
    if (removeTimers.current[id]) return; // already scheduled
    removeTimers.current[id] = setTimeout(() => {
      addDismissed(id);
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        setUnreadCount(updated.filter((n) => !n.read).length);
        return updated;
      });
      delete removeTimers.current[id];
    }, 30000); // 30 seconds
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/notifications`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return;
      const data = await res.json();
      
      // Strict filter: Only show what is truly UNREAD to keep the Inbox clean
      const unreadOnly = data.filter(n => n.status === "UNREAD");

      const mapped = unreadOnly.map(n => ({
        id: n._id,
        type: n.type,
        message: n.message,
        time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        icon: n.type === "DOCTOR_REGISTRATION" ? <Users size={16} /> : <Bell size={16} />,
        read: false, // Since we filtered for UNREAD, all are unread
        metadata: n.metadata
      }));

      setNotifications(mapped);
      setUnreadCount(mapped.length);
    } catch (err) {
      console.error("Notification sync failure:", err);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    const timers = removeTimers.current; // copy ref for cleanup
    return () => {
      clearInterval(interval);
      Object.values(timers).forEach(clearTimeout);
    };
  }, [fetchAlerts]);

  useEffect(() => {
    const handler = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    scheduleRemoval(id); // start 30-second countdown
  };

  const markAllAsRead = async () => {
    try {
      // For now we just local update for 'Mark all' but individual marks go to DB
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({...n, read: true})));
    } catch (err) { }
  };

  const handleAction = async (notif, action) => {
    try {
      const endpoint = action === "APPROVE" ? "/api/v1/admin/doctor/approve" : "/api/v1/admin/doctor/reject";
      let postData = { 
        doctorId: notif.metadata.doctorId,
        notificationId: notif.id 
      };
      
      if (action === "REJECT") {
        const reason = window.prompt("Reason for rejection?", "Registration credentials could not be verified.");
        if (reason === null) return;
        postData.reason = reason;
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(postData)
      });
      
      if (res.ok) {
        // Clear locally immediately, poll will confirm
        markAsRead(notif.id);
        fetchAlerts(); 
      }
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  return (
    <div className="notification-wrap" ref={dropdownRef}>
      <button
        className="notification-btn"
        onClick={() => setOpen(!open)}
        title="Administrative Alerts"
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-dot" />}
      </button>

      {open && (
        <div className="notification-dropdown">
          <header className="notif-header">
            <h4>Alert Notifications</h4>
            {notifications.length > 0 && unreadCount > 0 && (
              <button className="mark-all-btn" onClick={markAllAsRead}>Mark all read</button>
            )}
          </header>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                <Check size={28} style={{ display: "block", margin: "0 auto 10px", opacity: 0.5 }} />
                System levels normal. No pending alerts.
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`notif-item ${n.type} ${n.read ? "read" : ""}`}>
                  <div className="notif-icon-box">{n.icon}</div>
                  <div className="notif-content">
                    <p className="notif-message">{n.message}</p>
                    {n.type === "DOCTOR_REGISTRATION" && !n.read && (
                      <div className="notif-actions">
                        <button className="notif-approve-btn" onClick={() => handleAction(n, "APPROVE")}>Approve</button>
                        <button className="notif-reject-btn" onClick={() => handleAction(n, "REJECT")}>Reject</button>
                      </div>
                    )}
                    <span className="notif-time">
                      {n.read ? "Dismissed from view." : n.time}
                    </span>
                  </div>
                  {!n.read && n.type !== "DOCTOR_REGISTRATION" && (
                    <button
                      className="mark-read-item"
                      onClick={() => markAsRead(n.id)}
                      title="Mark as read"
                    >
                      <MailOpen size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
