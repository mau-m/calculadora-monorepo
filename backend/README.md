# Calculadora API (backend)

API REST simple de ejemplo construida con FastAPI.

## Estructura

- `main.py` - punto de entrada de la aplicación (FastAPI).
- `app/` - paquete principal de la app:
  - `core/` - configuración, logger, seguridad y middleware.
  - `routers/` - routers: `auth`, `health`, `calculadora`.
  - `schemas/` - modelos Pydantic para requests/responses.
  - `services/` - lógica de negocio (operaciones de calculadora).
- `requirements.txt` - dependencias Python.
- `tests/` - pruebas con `pytest`.
- `Dockerfile` - imagen de ejemplo basada en Alpine.

## Requisitos previos (desarrollo)

- Python 3.8+ (recomendado 3.10/3.11)
- Virtualenv (recomendado)
- En sistemas Linux (Debian/Ubuntu) se necesitan herramientas de compilación y headers para construir extensiones nativas:

  ```bash
  sudo apt update
  sudo apt install build-essential python3-dev pkg-config libffi-dev libssl-dev
  # Rust (si pip/paquetería lo solicita):
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source $HOME/.cargo/env
  ```

  En Fedora/RedHat use `dnf install @development-tools python3-devel pkgconfig openssl-devel libffi-devel`.
  En Arch: `sudo pacman -S base-devel python`.

  Nota: si usas la imagen Docker incluida no necesitas instalar estas herramientas localmente (ya se instalan en el build).

## Problema conocido: fallo al construir `pydantic-core`

Si durante `pip install -r requirements.txt` ves un error similar a:

```
error: linker `cc` not found
Failed building wheel for pydantic-core
```

Significa que el instalador intentó compilar extensiones nativas (Rust/C) y no encontró un enlazador o toolchain C en tu sistema. Soluciones:

- Instalar `build-essential`/`gcc` y los headers de Python (`python3-dev`) como se muestra arriba.
- Instalar `rustup` si el paquete requiere Rust al compilar.
- Alternativa: usar la imagen Docker incluida para evitar problemas locales.

## Instalar y ejecutar (local)

1. Crear y activar un virtualenv:

```bash
python -m venv backend/.venv
source backend/.venv/bin/activate
```

2. Actualizar pip y instalar dependencias:

```bash
pip install -U pip setuptools wheel
pip install -r backend/requirements.txt
```

3. Ejecutar la app (desde la raíz del backend):

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

La API está montada en `/api` (ver `main.py`). La documentación automática estará en `http://localhost:8000/api/docs`.

## Endpoints principales

- `POST /api/auth/login` - obtiene un token JWT (demo): usuario `admin`, contraseña `admin123`. Enviar formulario OAuth2 (`username`, `password`).
- `POST /api/calculadora/sumar` - requiere `Authorization: Bearer <token>` y body `{ "a": number, "b": number }`.
- `POST /api/calculadora/restar`, `/multiplicar`, `/dividir` - análogo.
- `GET /api/health` - health check.

## Variables de entorno

Puedes definir valores en un archivo `.env` en la carpeta `backend/`. Valores por defecto están en `app/core/config.py`:

- `JWT_SECRET_KEY` - clave para firmar tokens (cambiar en producción)
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` - expiración en minutos

## Ejecutar tests

Desde la raíz del proyecto o `backend/` (con venv activo):

```bash
pytest -q backend/tests
```

## Docker

La imagen de ejemplo usa `python:3.9-alpine` y en el `Dockerfile` ya se instalan las dependencias de compilación necesarias para construir `pydantic-core` en la imagen.

Construir y ejecutar:

```bash
docker build -t calculadora-backend -f backend/Dockerfile backend
docker run -p 8000:8000 calculadora-backend
```

## Notas y buenas prácticas

- Nunca expongas `JWT_SECRET_KEY` en repositorios públicos.
- En producción, usar HTTPS, orígenes CORS concretos y almacenar contraseñas hasheadas.
- Ajustar `CORS_ORIGINS` en `app/core/config.py` para los dominios de frontend permitidos.
