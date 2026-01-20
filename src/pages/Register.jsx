import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  return (
    <div className="auth-box">
      <h3>Register</h3>

      <input placeholder="Name" />
      <input placeholder="Email" />
      <input type="password" placeholder="Password" />

      <button onClick={() => navigate("/login")}>
        Register
      </button>
    </div>
  );
}
