# Sistema de Cajas Deck

Dashboard y herramientas para cortes de caja, conteos e inventario, con roles y ajustes historicos.

## Requisitos

- Node.js 18+
- MongoDB (URI accesible desde la app)

## Configuracion

Crea un archivo `.env.local` con estas variables:

```bash
MONGODB_URI="mongodb://localhost:27017"
MONGODB_DB="sistema_cajas_deck"
# 32 bytes en hex (64 chars) o base64
DATA_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

Notas:
- `DATA_ENCRYPTION_KEY` es obligatorio; se usa para cifrar datos sensibles.
- Si cambias la clave, los datos ya guardados no se podran descifrar.

## Instalacion

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Primer acceso (super-root)

El super-root se crea una sola vez con el formulario de `/register`.

Pasos:
1. Asegura que **no exista** super-root en la base.
2. Entra a `http://localhost:3000/register`.
3. Crea el usuario super-root.
4. Luego `/register` quedara bloqueado automaticamente.

## Roles

- `super-root`: acceso completo. Puede asignar roles `usuario` y `admin`.
- `admin`: ve y valida cortes; puede guardar sus propios cortes.
- `usuario`: acceso regular a herramientas segun visibilidad.

Asignar roles:
- En el dashboard (super-root), en la seccion "Usuarios" usa el bloque "Asignar rol".

## Cortes y ajustes

- Los cortes se guardan en `/tools/cortes` o desde el formulario admin en el dashboard.
- Los ajustes de admin crean un nuevo registro (historial), el corte original se mantiene intacto.
- Los usuarios ven los ajustes asociados a sus cortes en el historico.

## Estructura rapida

- `app/dashboard/page.tsx`: dashboard principal, cortes, ajustes y roles.
- `app/tools/cortes/page.tsx`: formulario de cortes y historico por usuario.
- `app/api/cortes/*`: endpoints de cortes y ajustes.
- `app/api/users/*`: roles y gestion de usuarios.

## Notas de despliegue

- Verifica que `MONGODB_URI`, `MONGODB_DB` y `DATA_ENCRYPTION_KEY` esten configuradas en el entorno.
- El formulario `/register` solo esta disponible si no existe super-root.
