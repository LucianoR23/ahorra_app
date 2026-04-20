# Deploy — Ahorra Frontend

Stack: Next.js 16 · Coolify · Traefik (HTTPS automático)

---

## 1. Pre-requisitos

| Servicio | Estado |
|---|---|
| Go API en Coolify | ✅ corriendo en `api-ahorra.lemydev.com` |
| PostgreSQL en Coolify | ✅ DB `ahorra` creada, migraciones aplicadas |
| Dominio frontend | `ahorra.lemydev.com` (o el que uses) |

---

## 2. Variables de entorno en Coolify

En el servicio Next.js, sección **Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://api-ahorra.lemydev.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<clave pública del backend>
```

> La VAPID public key la obtenés del backend con `go run ./cmd/vapidgen` o desde las env vars de Coolify del API (`VAPID_PUBLIC_KEY`).

---

## 3. Configurar el servicio en Coolify

1. **New Resource → Dockerfile** → apuntá al repo del frontend
2. **Dockerfile path**: `Dockerfile`
3. **Build args** (Coolify los pasa como `--build-arg`):
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
4. **Port**: `3000`
5. **Domain**: `ahorra.lemydev.com` → Traefik genera HTTPS solo

---

## 4. CORS en el backend

En las env vars del API de Coolify, asegurate de incluir el dominio del front:

```
ALLOWED_ORIGINS=https://ahorra.lemydev.com,http://localhost:3000
```

---

## 5. PWA — Service Worker

El SW (`public/sw.js`) se genera automáticamente en `pnpm build` vía Serwist.
No lo commiteés — está en `.gitignore`. Coolify lo genera al buildear.

Para iOS: el usuario debe hacer **Compartir → Añadir a pantalla de inicio** desde Safari (iOS 16.4+) para recibir push notifications.

---

## 6. Verificar deploy

```bash
# API health
curl https://api-ahorra.lemydev.com/health/live

# Frontend
curl -I https://ahorra.lemydev.com
```

---

## 7. Test end-to-end

1. Registrar usuario A → crear hogar → agregar gastos con cuotas
2. Invitar usuario B → B acepta → B ve balances
3. B registra un pago → A recibe push notification
4. Día siguiente → insights generados (`POST /insights/generate` para forzar)
5. Día 1 del mes → email de reporte mensual vía Resend

---

## 8. Primer deploy checklist

- [ ] `NEXT_PUBLIC_API_URL` configurado en Coolify
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = misma que `VAPID_PUBLIC_KEY` del backend
- [ ] `ALLOWED_ORIGINS` en el API incluye el dominio del front
- [ ] Healthcheck `/` responde 200
- [ ] Manifest PWA accesible en `https://ahorra.lemydev.com/manifest.webmanifest`
- [ ] SW registrado en DevTools → Application → Service Workers
