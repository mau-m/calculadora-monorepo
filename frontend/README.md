# Calculadora (frontend)

Interfaz web de la calculadora construida con React + TypeScript.

## Resumen

Este frontend consume la API backend disponible en `/api`. Incluye:
- UI principal con `Display`, `NumberPad`, `OperationPad` y `Historial`.
- Hooks personalizados `useAuth` y `useCalculadora` para autenticación y lógica.
- Configuración para producción con `Docker + nginx`.

Versión: 5.0.0

## Estructura principal

- `public/` - HTML estático
- `src/`
  - `components/` - componentes UI
  - `hooks/` - `useAuth`, `useCalculadora`
  - `services/api.ts` - cliente HTTP hacia la API
  - `types/` - tipos TypeScript
  - `assets/` - imágenes
- `Dockerfile` - build multi-stage y nginx
- `nginx.conf.template` - plantilla de nginx para runtime
- `package.json`, `tsconfig.json`

## Requisitos

- Node.js 18+ y npm
- (Opcional) Docker para generar la imagen de producción

## Ejecutar en desarrollo

1. Instalar dependencias:

```bash
cd frontend
npm install
```

2. Ejecutar con hot-reload:

```bash
npm start
```

Por defecto la app arranca en `http://localhost:3000`.

### Conectar al backend local

El frontend envía peticiones a la URL definida en `REACT_APP_API_URL` (por defecto `/api`). En desarrollo, si tu backend corre en `http://localhost:8000/api`, exporta la variable antes de arrancar:

```bash
export REACT_APP_API_URL=http://localhost:8000/api
npm start
```

En Windows Powershell:

```powershell
$env:REACT_APP_API_URL = "http://localhost:8000/api"
npm start
```

## Scripts útiles

- `npm start` - servidor de desarrollo
- `npm run build` - build de producción en `build/`
- `npm test` - correr tests

## Construir y ejecutar con Docker

La imagen se construye en dos etapas: `builder` (Node) y `runtime` (nginx).

```bash
docker build -t calculadora-frontend -f frontend/Dockerfile frontend
docker run -p 8080:8080 \ 
  -e BACKEND_HOST=backend \ 
  -e BACKEND_PORT=8000 \ 
  calculadora-frontend
```

- `BACKEND_HOST` y `BACKEND_PORT` se usan por la plantilla `nginx.conf.template` para enrutar `/api` hacia el backend.
- En Docker Compose puedes mapear el servicio `backend` bajo ese nombre para que nginx lo resuelva.

## nginx (runtime)

La plantilla `nginx.conf.template` ya incluye una ubicación `/api/` que hace proxy_pass hacia `http://${BACKEND_HOST}:${BACKEND_PORT}/api/`.

## Variables de entorno relevantes

- `REACT_APP_API_URL` - URL base de la API (ej: `http://localhost:8000/api`).
- `BACKEND_HOST` - usado en la imagen Docker para configurar nginx at runtime.
- `BACKEND_PORT` - puerto del backend en runtime.

## API y comportamiento esperado

- Login automático del demo se realiza con credenciales `admin` / `admin123` desde `useAuth`.
- Endpoints usados:
  - `POST /api/auth/login` (OAuth2 form)
  - `POST /api/calculadora/{sumar,restar,multiplicar,dividir}`
  - `GET /api/health`

Ejemplo rápido (curl) para login:

```bash
curl -X POST http://localhost:8000/api/auth/login -d "username=admin&password=admin123"
```

Y para sumar (requiere token):

```bash
curl -X POST http://localhost:8000/api/calculadora/sumar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"a": 2, "b": 3}'
```

## Tests

El proyecto incluye tests básicos con Testing Library.

```bash
npm test
```

## Notas y recomendaciones

- En producción asegúrate de configurar CORS correctamente en el backend y usar HTTPS.
- Ajusta `REACT_APP_API_URL` para apuntar al endpoint real de backend si lo despliegas detrás de un proxy.
- La app realiza reintentos de autenticación cuando el token expira; sin embargo, en producción deberías manejar refresh tokens más robustos.