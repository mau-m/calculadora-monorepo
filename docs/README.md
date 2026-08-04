# Despliegue con AWS OIDC — Immutable subject claims

Documentación del incidente de autenticación en el workflow `cd.yaml` (`aws-actions/configure-aws-credentials`) y de la causa raíz: el cambio de formato del claim `sub` en los tokens OIDC de GitHub Actions.

---

## Síntoma

El job `Configurar credenciales AWS via OIDC` fallaba en todos los intentos con:

```
Assuming role with OIDC
Retry AssumeRole: attempt 1 of 12 failed: Could not assume role with OIDC:
Not authorized to perform sts:AssumeRoleWithWebIdentity. Retrying after 2ms.
```

El trust policy del rol en IAM parecía correcto (audience, principal federado y `sub` esperado coincidían con la documentación estándar de GitHub), por lo que el error no era evidente a simple vista.

---

## Causa raíz

GitHub introdujo **"Immutable subject claims for GitHub Actions OIDC tokens"** (changelog del 23 de abril de 2026). A partir del **15 de julio de 2026**, todos los repositorios nuevos usan por defecto un formato de `sub` que incluye los IDs internos (inmutables) del owner y del repositorio, en vez de solo sus nombres:

```
repo:OWNER@OWNER_ID/REPO@REPO_ID:ref:refs/heads/main
```

En vez del formato clásico:

```
repo:OWNER/REPO:ref:refs/heads/main
```

Esto se confirmó revisando el evento `AssumeRoleWithWebIdentity` en **CloudTrail** de la cuenta de AWS: el campo `userIdentity.userName` mostraba el `sub` real recibido por AWS, con el formato nuevo, mientras que el trust policy seguía usando el formato antiguo — por eso la condición `StringLike` nunca hacía match y AWS devolvía `AccessDenied`.

### ¿Por qué GitHub hizo este cambio?

El `sub` clásico solo usa nombres (`owner/repo`), que son **mutables**: si se borra un repositorio o se libera un username, otra persona puede registrar ese mismo nombre en GitHub. Si el trust policy en AWS (u otro proveedor cloud) sigue confiando en ese nombre, el nuevo dueño podría generar tokens OIDC válidos con el mismo `sub` y asumir el rol — un ataque de reutilización de nombre. Los `owner_id` y `repo_id` son permanentes y nunca se reasignan, así que anclar el trust policy a esos IDs cierra ese hueco de seguridad.

---

## Datos de este repositorio

Obtenidos con la API de GitHub:

```bash
gh api repos/mau-m/calculadora-monorepo --jq '{repo_id: .id, owner_id: .owner.id, full_name: .full_name}'
```

| Campo | Valor |
|---|---|
| `owner_id` (mau-m) | `133407904` |
| `repo_id` (calculadora-monorepo) | `1313437525` |

---

## Solución aplicada

Se actualizó el `sub` en el trust policy de los roles `GitHubActionsDeployRole` en ambas cuentas de AWS usadas (`157611948522` y `940075379174`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": [
                        "repo:mau-m@133407904/calculadora-monorepo@1313437525:ref:refs/heads/main",
                        "repo:mau-m@133407904/calculadora-monorepo@1313437525:ref:refs/heads/release/*",
                        "repo:mau-m@133407904/calculadora-monorepo@1313437525:pull_request"
                    ]
                }
            }
        }
    ]
}
```

(Sustituir `ACCOUNT_ID` por `157611948522` o `940075379174` según el rol.)

---

## Cómo replicarlo en otro repositorio

1. **Obtener el `owner_id` y `repo_id` del nuevo repo:**

   ```bash
   gh api repos/OWNER/REPO --jq '{repo_id: .id, owner_id: .owner.id, full_name: .full_name}'
   ```

2. **Comprobar si ese repo usa el formato inmutable.** No es automático para repos creados antes del 15 de julio de 2026: depende de si el toggle está activado en Settings → Actions → General del repo (o de la organización). Si está desactivado, el `sub` sigue siendo `repo:OWNER/REPO:...` y no hace falta tocar el trust policy.

3. **Si está activado**, construir el `sub` con el patrón:

   ```
   repo:OWNER@OWNER_ID/REPO@REPO_ID:ref:refs/heads/main
   ```

   y actualizar el trust policy del rol correspondiente.

4. Si el rol es compartido por varios repositorios, cada uno necesita su propia entrada en el array de `sub` — no existe un wildcard limpio que cubra "cualquier repo inmutable de este owner", porque el ID va pegado al nombre sin un separador fijo que permita un `*` seguro.

### Alternativa (no recomendada a largo plazo)

Desactivar el toggle "immutable OIDC subject claims" en el repo/organización revierte al `sub` clásico y evita tocar AWS, pero reintroduce el riesgo de reutilización de nombre que esta función mitiga. GitHub además hará este formato obligatorio para repos nuevos, así que es preferible migrar el trust policy en vez de desactivar el toggle.

---

## Diagnóstico usado (por si se repite)

1. Confirmar `permissions: id-token: write` en el workflow.
2. Confirmar que el Identity Provider OIDC existe en IAM con audience `sts.amazonaws.com`.
3. Confirmar que el `AWS_ROLE_ARN` usado en el workflow apunta a un rol real y existente.
4. Revisar **CloudTrail → Event history**, filtrar por `AssumeRoleWithWebIdentity`, y comparar el `sub` real del evento fallido contra el patrón del trust policy — esto expone directamente cualquier mismatch, incluido este caso.

---

## Referencias

- [Immutable subject claims for GitHub Actions OIDC tokens — GitHub Changelog (23 abr 2026)](https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/)
- [OpenID Connect reference — GitHub Docs](https://docs.github.com/en/actions/reference/security/oidc)
