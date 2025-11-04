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
    <div className="auth-layout">
      <form onSubmit={onSubmit} className="auth-card">
        <h1 className="auth-card__title">SIA UNASAM</h1>
        <p className="auth-card__subtitle">Ingrese sus credenciales institucionales</p>

        <label className="form-field">
          <span className="form-field__label">Correo institucional</span>
          <input
            type="email"
            {...register("correo", { required: true })}
            className="input"
            placeholder="usuario@unasam.edu.pe"
            autoComplete="email"
          />
        </label>

        <label className="form-field">
          <span className="form-field__label">Contraseña</span>
          <input
            type="password"
            {...register("contrasenia", { required: true })}
            className="input"
            placeholder="Ingrese su contraseña"
            autoComplete="current-password"
          />
        </label>
        
        {error && <div className="form-error">{error}</div>}

        <button type="submit" disabled={loading} className="button button--primary button--full">
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}