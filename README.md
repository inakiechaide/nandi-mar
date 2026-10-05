# Nandi Mar

Sitio estático (HTML + JS) con un panel para administrar los eventos, desplegado en Vercel.

## Eventos

- Los eventos están en `data/events.json`. El sitio público los lee desde ahí.
- `/admin.html` es el panel de administración, protegido con login. Desde ahí se dan de alta, se editan y se borran eventos.
- Al guardar, la función `api/events.js` commitea `data/events.json` en GitHub y Vercel redeploya el sitio solo (tarda alrededor de un minuto).

## Variables de entorno en Vercel

En Project Settings → Environment Variables (ver `.env.example`):

| Variable | Descripción |
| --- | --- |
| `ADMIN_USER` | Usuario del admin |
| `ADMIN_PASSWORD` | Contraseña del admin |
| `SESSION_SECRET` | Cadena aleatoria larga para firmar la sesión (`openssl rand -hex 32`) |
| `GITHUB_TOKEN` | Token fine-grained de GitHub con acceso **solo a este repo** y permiso **Contents: Read and write** |
| `GITHUB_REPO` | Opcional, por defecto `inakiechaide/nandi-mar` |
| `GITHUB_BRANCH` | Opcional, por defecto `main` |

Si se cambia `ADMIN_USER`, `ADMIN_PASSWORD` o `SESSION_SECRET`, las sesiones abiertas se cierran. Después de cambiar una variable hay que redeployar.
