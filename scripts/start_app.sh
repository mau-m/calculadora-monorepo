#!/bin/bash
set -euo pipefail

# Despliega la imagen indicada por el workflow o por el entorno.
APP_VERSION="${APP_VERSION:-latest}"
export APP_VERSION

cd /opt/mi-app

# Usa la región del entorno o el valor por defecto del despliegue.
AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_REGION

# Identifica la EC2 que atiende cada respuesta. IMDSv2 es la fuente principal;
# hostname -I permite desplegar también en hosts sin acceso a metadata.
detect_instance_ip() {
  local token=""
  local instance_ip=""

  if command -v curl >/dev/null 2>&1; then
    token="$(curl -fsS --connect-timeout 1 --max-time 2 \
      -X PUT \
      -H 'X-aws-ec2-metadata-token-ttl-seconds: 300' \
      'http://169.254.169.254/latest/api/token' || true)"

    if [[ -n "$token" ]]; then
      instance_ip="$(curl -fsS --connect-timeout 1 --max-time 2 \
        -H "X-aws-ec2-metadata-token: $token" \
        'http://169.254.169.254/latest/meta-data/local-ipv4' || true)"
    fi
  fi

  if [[ -z "$instance_ip" ]]; then
    instance_ip="$(hostname -I | awk '{print $1}')"
  fi

  printf '%s' "$instance_ip"
}

INSTANCE_IP="${INSTANCE_IP:-$(detect_instance_ip)}"
export INSTANCE_IP

# Usa el registro ECR inyectado por el workflow. Si no llega, se deriva desde el rol de la instancia.
ECR_REGISTRY="${ECR_REGISTRY:-}"
if [[ -z "$ECR_REGISTRY" ]]; then
  ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
  ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
fi
export ECR_REGISTRY

# Autentica Docker con ECR usando el rol de la instancia (sin credenciales hardcodeadas)
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin \
  "$ECR_REGISTRY"

# Usa el archivo Compose del despliegue HTTP por defecto.
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
export COMPOSE_FILE

# Descarga las nuevas imágenes (backend + frontend)
docker compose -f "$COMPOSE_FILE" pull

# Detiene los contenedores actuales y levanta los nuevos
docker compose -f "$COMPOSE_FILE" down --remove-orphans
docker compose -f "$COMPOSE_FILE" up -d

# Limpia imágenes antiguas para no llenar el disco
docker image prune -f
