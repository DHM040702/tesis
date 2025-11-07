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
    <div className="login">
      <div className="login__overlay" aria-hidden />
      <form onSubmit={onSubmit} className="login__card">
        <header className="login__header">
          <span className="login__badge">SIA UNASAM</span>
          <h1>Accede a tu panel</h1>
          <p>Ingrese sus credenciales institucionales para continuar.</p>
        </header>

        <label className="field">
          <span className="field__label">Correo institucional</span>
          <input
            type="email"
            {...register("correo", { required: true })}
            className="field__control"
            placeholder="usuario@unasam.edu.pe"
            autoComplete="email"
          />
        </label>

        <label className="field">
          <span className="field__label">Contraseña</span>
          <input
            type="password"
            {...register("contrasenia", { required: true })}
            className="field__control"
            placeholder="Ingrese su contraseña"
            autoComplete="current-password"
          />
        </label>

        {error && <div className="alert alert--error">{error}</div>}

        <button type="submit" disabled={loading} className="button button--primary button--full">
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}