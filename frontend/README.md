Aplicación creada con Vite + React + TypeScript para consumir la API `sia-api` incluida en este repositorio.

## Scripts disponibles

- `npm install` para instalar dependencias.
- `npm run dev` inicia el servidor de desarrollo en `http://localhost:5173`.
- `npm run build` genera la compilación de producción.
- `npm run preview` sirve la compilación generada.

## Variables de entorno

Crear un archivo `.env` en la carpeta `frontend` (o `.env.local`) con la URL base de la API:

```
VITE_API_URL=http://localhost:8000/api
```

Por defecto, si no se define, la aplicación apunta a `http://localhost:8000/api`.

## Flujo principal

1. Inicio de sesión con correo y contraseña institucional.
2. Panel principal con resumen de riesgo por periodo y programa.
3. Listado de estudiantes con filtros por nivel de riesgo.
4. Gestión de tutorías: registro de nuevas sesiones y consulta del historial.
