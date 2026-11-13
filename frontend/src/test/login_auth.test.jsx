import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login.jsx";
import * as AuthContextModule from "../context/AuthContext.jsx";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Login Component TDD - Slices 2 & 3", () => {
  let mockLogin;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin = vi.fn();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: mockLogin,
    });
  });

  it("renders username, password, sign in button and forgot password link", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot password\?/i)).toBeInTheDocument();
  });

  it("does not call login when submitted with empty fields (client-side validation)", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitBtn);

    expect(mockLogin).not.toHaveBeenCalled();
    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
  });

  it("toggles password visibility when the eye button is clicked", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    const toggleBtn = screen.getByRole("button", { name: /show password/i });

    expect(passwordInput).toHaveAttribute("type", "password");
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("toggles the forgot password inline message", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(
      screen.queryByText(/please contact your clinic administrator to reset your password/i)
    ).not.toBeInTheDocument();

    const forgotLink = screen.getByText(/forgot password\?/i);
    fireEvent.click(forgotLink);

    expect(
      screen.getByText(/please contact your clinic administrator to reset your password/i)
    ).toBeInTheDocument();

    fireEvent.click(forgotLink);
    expect(
      screen.queryByText(/please contact your clinic administrator to reset your password/i)
    ).not.toBeInTheDocument();
  });

  it("displays server error message when login fails with 401/error response", async () => {
    const errorResponse = {
      response: {
        data: {
          error: "Invalid username or password.",
        },
      },
    };
    mockLogin.mockRejectedValueOnce(errorResponse);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^username$/i), {
      target: { value: "invalid_user" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "wrong_password" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password\./i)).toBeInTheDocument();
    });
  });

  it("displays inactive account error when returned from backend", async () => {
    const errorResponse = {
      response: {
        data: {
          error: "User account is inactive. Please contact administration.",
        },
      },
    };
    mockLogin.mockRejectedValueOnce(errorResponse);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^username$/i), {
      target: { value: "inactive_user" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/user account is inactive\. please contact administration\./i)
      ).toBeInTheDocument();
    });
  });

  it("disables inputs and button with 'Verifying...' spinner while login is in-flight", async () => {
    let resolveLogin;
    const pendingPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValueOnce(pendingPromise);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const usernameInput = screen.getByLabelText(/^username$/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: "doctor1" } });
    fireEvent.change(passwordInput, { target: { value: "Doctor@123" } });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/verifying\.\.\./i)).toBeInTheDocument();
    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitBtn).toBeDisabled();

    // Resolve login
    resolveLogin({ id: 2, username: "doctor1", role: "doctor" });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/doctor", { replace: true });
    });
  });

  it("redirects to the correct role home page based on authoritative server role", async () => {
    const rolesToTest = [
      { role: "admin", expectedPath: "/admin" },
      { role: "doctor", expectedPath: "/doctor" },
      { role: "receptionist", expectedPath: "/receptionist" },
      { role: "lab technician", expectedPath: "/lab" },
      { role: "pharmacist", expectedPath: "/pharmacist" },
    ];

    for (const { role, expectedPath } of rolesToTest) {
      mockLogin.mockResolvedValueOnce({ id: 1, username: "user", role });

      const { unmount } = render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/^username$/i), {
        target: { value: "user" },
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: "password" },
      });
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(expectedPath, { replace: true });
      });

      unmount();
      mockNavigate.mockClear();
    }
  });

  it("redirects immediately if user is already authenticated", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: "doctor_bob", role: "doctor" },
      login: mockLogin,
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Should not render the form elements because Navigate is rendered
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
  });
});
