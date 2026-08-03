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
- `nginx.dev.conf.template` - plantilla HTTP para desarrollo (la configuración original)
- `nginx.https.conf.template` - plantilla HTTPS para terminar TLS directamente en nginx
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

- El Dockerfile usa `nginx.dev.conf.template` de forma predeterminada.
- `BACKEND_HOST` y `BACKEND_PORT` se usan por las plantillas para enrutar `/api` hacia el backend.
- En Docker Compose puedes mapear el servicio `backend` bajo ese nombre para que nginx lo resuelva.

## nginx (runtime)

Hay dos plantillas disponibles:

- `nginx.dev.conf.template`: escucha HTTP en el puerto `8080`. Es la plantilla predeterminada y conserva la configuración usada para desarrollo.
- `nginx.https.conf.template`: redirige HTTP (`8080`) a HTTPS (`8443`) y carga el certificado y su llave desde rutas configurables.

Para construir una imagen que termine HTTPS directamente en nginx:

```bash
docker build \
  --build-arg NGINX_TEMPLATE=nginx.https.conf.template \
  -t calculadora-frontend:https \
  -f frontend/Dockerfile frontend
```

Ejemplo de ejecución (los archivos del certificado deben existir en el host):

```bash
docker run \
  -p 80:8080 \
  -p 443:8443 \
  -e SERVER_NAME=calculadora.example.com \
  -e BACKEND_HOST=backend \
  -e BACKEND_PORT=8000 \
  -e SSL_CERTIFICATE_PATH=/etc/nginx/certs/fullchain.pem \
  -e SSL_CERTIFICATE_KEY_PATH=/etc/nginx/certs/privkey.pem \
  -v /ruta/segura/certificados:/etc/nginx/certs:ro \
  calculadora-frontend:https
```

### Configuración del dominio en AWS Route 53

Route 53 configura DNS, pero no activa HTTPS ni instala certificados por sí mismo. Antes de desplegar se debe configurar:

1. La zona hospedada del dominio en Route 53.
2. Un registro `A`/`AAAA` (normalmente de tipo Alias) que apunte al balanceador o recurso público donde corre la aplicación.
3. Un certificado TLS válido para el dominio.
4. `SERVER_NAME` con el dominio real y, si nginx termina TLS, las rutas `SSL_CERTIFICATE_PATH` y `SSL_CERTIFICATE_KEY_PATH`.
5. Los puertos `80` y `443` en el balanceador, firewall o Security Group correspondiente.
6. `CORS_ORIGINS` en el backend con el origen HTTPS final, por ejemplo `https://calculadora.example.com`.

En AWS se recomienda solicitar el certificado en AWS Certificate Manager (ACM), validarlo mediante Route 53 y asociarlo a un listener HTTPS de un Application Load Balancer o a CloudFront. En ese esquema, AWS termina TLS y reenvía tráfico HTTP al puerto `8080` del contenedor, por lo que se debe mantener `nginx.dev.conf.template` dentro de la imagen y configurar en el balanceador la redirección de HTTP a HTTPS.

La plantilla `nginx.https.conf.template` se usa cuando nginx termina TLS directamente, por ejemplo en una instancia EC2. En ese caso hay que obtener el certificado por un mecanismo que entregue sus archivos al servidor, montarlos como solo lectura y encargarse de su renovación.

## Variables de entorno relevantes

- `REACT_APP_API_URL` - URL base de la API (ej: `http://localhost:8000/api`).
- `BACKEND_HOST` - usado en la imagen Docker para configurar nginx at runtime.
- `BACKEND_PORT` - puerto del backend en runtime.
- `SERVER_NAME` - dominio atendido por la plantilla HTTPS.
- `SSL_CERTIFICATE_PATH` - ruta al certificado o cadena completa dentro del contenedor.
- `SSL_CERTIFICATE_KEY_PATH` - ruta a la llave privada dentro del contenedor.

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
