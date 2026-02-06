# 🚀 Pasos Pendientes - Sistema de Autenticación

## ✅ Completado

- ✅ Servidor de desarrollo funcionando en `http://localhost:8080/`
- ✅ Variables de entorno configuradas correctamente
- ✅ Sistema de autenticación implementado (Login, Signup, Protected Routes)
- ✅ Whitelist Admin panel creado
- ✅ Migraciones aplicadas en Supabase
- ✅ Tipos de TypeScript regenerados
- ✅ Política RLS para usuarios anónimos agregada (corrige error de whitelist)
- ✅ Signup probado y funcionando correctamente

## ⚠️ Pendiente - Configuración de Base de Datos

### 1️⃣ Aplicar Migraciones en Supabase

Las migraciones ya están creadas pero necesitan ser aplicadas manualmente en el dashboard de Supabase.

#### Paso 1: Abrir Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto: `hdizvbyvtlmkwprhdnzr`

#### Paso 2: Abrir SQL Editor

1. Click en "SQL Editor" en la barra lateral izquierda
2. Click en "New Query"

#### Paso 3: Aplicar Primera Migración - Crear tabla de Whitelist

1. Abre el archivo: `supabase/migrations/20260205151617_create_whitelist_table.sql`
2. Copia todo el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Click en "Run" (▶️)

**Esta migración creará:**
- Tabla `email_whitelist`
- Políticas RLS para la whitelist
- Insertará `felipe@botec.tech` como primer usuario permitido

#### Paso 4: Aplicar Segunda Migración - Actualizar políticas RLS

1. Abre el archivo: `supabase/migrations/20260205151618_update_rls_policies_for_auth.sql`
2. Copia todo el contenido del archivo
3. Pégalo en el SQL Editor de Supabase (nueva query)
4. Click en "Run" (▶️)

**Esta migración:**
- Actualizará las políticas de la tabla `orders` para requerir autenticación
- Actualizará las políticas de la tabla `store_data` para requerir autenticación
- Mantendrá acceso de service role para webhooks de n8n

### 2️⃣ Regenerar Tipos de TypeScript

Después de aplicar las migraciones, ejecuta este comando en la terminal:

```bash
npx supabase login
```

Sigue las instrucciones para autenticarte.

Luego ejecuta:

```bash
npx supabase gen types typescript --project-id hdizvbyvtlmkwprhdnzr > src/integrations/supabase/types.ts
```

### 3️⃣ Verificar las Migraciones

1. En el dashboard de Supabase, ve a "Table Editor"
2. Deberías ver la tabla `email_whitelist`
3. Deberías ver una fila con `felipe@botec.tech`
4. Verifica que las tablas `orders` y `store_data` sigan existiendo

### 4️⃣ Probar el Sistema de Autenticación

Una vez aplicadas las migraciones:

1. **Registrarse**:
   - Ve a `http://localhost:8080/signup`
   - Ingresa `felipe@botec.tech` como email
   - Crea una contraseña (mínimo 6 caracteres)
   - Click en "Registrarse"
   - Deberías ser redirigido a la página de confirmación de email

2. **Confirmar Email**:
   - Revisa tu bandeja de entrada (y spam)
   - Click en el enlace de confirmación que te envió Supabase
   - Deberías ser redirigido a la aplicación

3. **Iniciar Sesión**:
   - Ve a `http://localhost:8080/login`
   - Ingresa tus credenciales
   - Deberías poder acceder a la aplicación

4. **Administrar Whitelist** (opcional):
   - Una vez autenticado, ve a `/admin/whitelist`
   - Podrás agregar/eliminar emails permitidos para registro

## 🔍 Solución de Problemas

### Si las migraciones fallan

- Verifica que estás conectado al proyecto correcto
- Revisa la sintaxis SQL
- Mira la consola del navegador para errores

### Si no recibes email de confirmación

- Revisa tu carpeta de spam
- Verifica en Supabase Auth Dashboard que el email se envió
- Asegúrate de que la configuración de emails en Supabase esté correcta

### Si la autenticación no funciona

- Verifica que las migraciones se aplicaron correctamente
- Revisa el archivo `.env` - debe tener las credenciales correctas
- Limpia el localStorage del navegador e intenta de nuevo
- Abre la consola del navegador y busca errores

## 📚 Documentación Adicional

- [SECURITY.md](./SECURITY.md) - Mejores prácticas de seguridad
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Guía detallada de migraciones
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
