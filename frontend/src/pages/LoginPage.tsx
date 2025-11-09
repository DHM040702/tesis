import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type LoginForm = {
  correo: string;
  contrasenia: string;
};

export function LoginPage() {
  const { register, handleSubmit } = useForm<LoginForm>({ defaultValues: { correo: "", contrasenia: "" } });
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    setLoading(true);
    try {
      await login(data.correo, data.contrasenia);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1d4ed8, #9333ea)"
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          padding: "32px",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "0 16px 32px rgba(15, 23, 42, 0.2)"
        }}
      >
        <h1 style={{ margin: 0, textAlign: "center", color: "#1f2937" }}>SIA UNASAM</h1>
        <p style={{ marginTop: 0, textAlign: "center", color: "#6b7280" }}>
          Ingrese sus credenciales institucionales
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span>Correo institucional</span>
          <input
            type="email"
            {...register("correo", { required: true })}
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db"
            }}
            placeholder="usuario@unasam.edu.pe"
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span>Contraseña</span>
          <input
            type="password"
            {...register("contrasenia", { required: true })}
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db"
            }}
            placeholder="Ingrese su contraseña"
          />
        </label>
        {error && (
          <div style={{ color: "#ef4444", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 600,
            cursor: loading ? "progress" : "pointer"
          }}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}