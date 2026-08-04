# calculadora-monorepo

Monorepo de ejemplo con una pequeña aplicación de calculadora dividida en:

- `backend/` — API REST construida con FastAPI (Python).
- `frontend/` — SPA en React + TypeScript que consume la API.
- `docker-compose-dev.yml` — composición para desarrollo local usando imágenes construidas desde las carpetas `backend` y `frontend`.

---

## Estructura del proyecto

- `backend/`
	- `main.py` - punto de entrada FastAPI.
	- `app/` - paquete de la aplicación (core, routers, schemas, services).
	- `requirements.txt` - dependencias Python.
	- `Dockerfile` - imagen para producción/desarrollo.
	- `tests/` - tests con `pytest`.

- `frontend/`
	- `src/` - código React + TypeScript.
	- `public/` - assets públicos.
	- `package.json`, `Dockerfile`, `nginx.dev.conf.template`, `nginx.https.conf.template`.

- `docker-compose-dev.yml` - orquesta `backend` y `frontend` en modo desarrollo/integ.

---

## Cómo ejecutar (desarrollo)

Recomendado: usar Docker Compose incluido para levantar ambos servicios en conjunto.

1) Levantar con Docker Compose (reconstruye las imágenes desde las carpetas):

```bash
docker compose -f docker-compose-dev.yml build --no-cache
docker compose -f docker-compose-dev.yml up --build
```

Esto construye las imágenes usando `backend/Dockerfile` y `frontend/Dockerfile` y arranca los contenedores.

2) Acceder a:
- Frontend: `http://localhost:3000` (mapea puerto 8080 del contenedor al 3000 en `docker-compose-dev.yml`).
- Backend (docs OpenAPI): `http://localhost:8000/api/docs`.

Si prefieres ejecutar localmente sin Docker:

Backend (local virtualenv):

```bash
python -m venv backend/.venv
source backend/.venv/bin/activate
pip install -U pip setuptools wheel
pip install -r backend/requirements.txt
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend (local):

```bash
cd frontend
npm install
export REACT_APP_API_URL=http://localhost:8000/api
npm start
```

---

## Testing

Backend:

```bash
# desde la raíz del repo
python -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
pytest -q backend/tests
```

Frontend:

```bash
cd frontend
npm test
```

---

## Variables y configuración

- Backend lee variables desde `backend/.env` (si existe) usando `pydantic-settings`.
	- `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS`, etc. Los valores por defecto están en `app/core/config.py`.
- Frontend utiliza `REACT_APP_API_URL` para apuntar a la API en desarrollo.
- En Docker las plantillas nginx de `frontend/` utilizan `BACKEND_HOST` y `BACKEND_PORT` para enrutar `/api/`. La imagen usa `nginx.dev.conf.template` de forma predeterminada; consulta `frontend/README.md` para construir la variante HTTPS y configurar el dominio en Route 53.

---

## Docker & desarrollo integrado

- `docker-compose-dev.yml` está configurado para `build:` desde las carpetas `backend` y `frontend`. Asegúrate de reconstruir las imágenes cuando hagas cambios en el código fuente:

```bash
docker compose -f docker-compose-dev.yml build --no-cache
docker compose -f docker-compose-dev.yml up -d --force-recreate
docker compose -f docker-compose-dev.yml logs -f
```

También hay un archivo de ejemplo `docker-compose-prod.yml` (si existe) para despliegues; adapta nombres de imagen y variables según tu infraestructura.

---

## Problemas conocidos y soluciones

- Error al instalar dependencias: `Failed building wheel for pydantic-core` o `error: linker 'cc' not found`.
	- Causa: `pydantic-core` requiere compilar código nativo (Rust/C) y no encuentra un enlazador o toolchain de C en el sistema.
	- Solución (Linux Debian/Ubuntu):

		```bash
		sudo apt update
		sudo apt install build-essential python3-dev pkg-config libffi-dev libssl-dev
		# Si es necesario, instalar Rust:
		curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
		source $HOME/.cargo/env
		```

	- Alternativa: usar las imágenes Docker (el `Dockerfile` del backend ya instala las dependencias de compilación) para evitar instalar toolchains en el host.

- Error en el deploy: `Not authorized to perform sts:AssumeRoleWithWebIdentity` en el workflow `cd.yaml`.
	- Causa: cambio de formato del claim `sub` en los tokens OIDC de GitHub Actions (immutable subject claims). Ver [`docs/README.md`](docs/README.md) para el diagnóstico completo y la solución aplicada.

- ImportErrors en runtime dentro del contenedor (ej: nombres no exportados desde paquetes):
	- Si ves errores como `ImportError: cannot import name 'X' from 'app.Y'`, normalmente significa que `__init__.py` no exporta el símbolo. Revisa y asegúrate de que los `__init__.py` re-exportan los routers, servicios o schemas necesarios.
	- Después de corregir el código, reconstruye la imagen sin cache (ver sección Docker arriba).

---

## Desarrollo y buenas prácticas

- Mantén `JWT_SECRET_KEY` fuera del repositorio; usa secretos/variables en el entorno para producción.
- En producción, no uses `CORS_ORIGINS = ["*"]` — lista explícita de orígenes.
- Añade CI para ejecutar `pytest` y `npm test` en PRs.

