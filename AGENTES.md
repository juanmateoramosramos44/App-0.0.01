# Reglas Permanentes de Desarrollo y Arquitectura

1. **Carpeta Principal Estricta (`src/` y Raíz `/`)**:
   - Todo el código fuente del frontend reside única y exclusivamente dentro de la carpeta `src/`, y el backend en la raíz (`server.ts`).
   - Queda estrictamente prohibido crear carpetas alternas o duplicadas (como `app/applet/`).
   - Coolify y los procesos de despliegue compilan y leen exclusivamente desde la raíz (`/`) y `src/`.

2. **Cero Firebase / Firestore para Siempre**:
   - Firebase, Firestore, `firebase-applet-config.json`, `firebase-blueprint.json`, `firestore.rules`, `firestore_tasks.json` y cualquier SDK o paquete de Firebase están eliminados permanentemente y prohibidos en cualquier actualización futura.

3. **Base de Datos Exclusiva: PostgreSQL (Coolify)**:
   - El 100% de los módulos de la aplicación operan real y exclusivamente sobre la base de datos PostgreSQL mediante `DATABASE_URL` y el servidor backend (`server.ts`).
   - Tablas conectadas con CRUD completo en PostgreSQL:
     - `users` (Usuarios y permisos)
     - `rounds` (Rondas técnicas de inspección)
     - `tasks` (Tareas de mantenimiento)
     - `work_orders` (Órdenes de trabajo preventivas y correctivas)
     - `equipments` (Fichas y hojas de vida de equipos)
     - `pump_inspections` (Inspecciones técnicas de salas de bombas)
     - `meters` (Contadores de agua, energía, gas, etc.)
     - `meter_readings_log` (Historial y registros de lecturas de contadores)
     - `preventive_plans` (Planes preventivos)
     - `incidents` (Averías e incidencias)
     - `requests` (Solicitudes hoteleras y de departamentos)
     - `schedules` (Horarios y turnos de técnicos)
     - `cronogramas` (Cronogramas maestros y timelines)
     - `shift_swaps` (Permutas y cambios de turno)
     - `uploaded_documents` (Documentos y manuales subidos)
     - `document_folders` (Carpetas del gestor documental)
     - `settings` (Configuración del sistema hotelero)
     - `app_data` (Plantillas de ronda y metadatos)

4. **Eliminación del Guardado Falso en el Navegador (`localStorage`)**:
   - Se prohíbe el uso de `localStorage` como base de datos primaria o como almacén aislado que simule persistencia sin confirmación del servidor.
   - Toda creación (POST), edición (PUT/PATCH) o eliminación (DELETE) en cualquier módulo debe comunicarse directamente con los endpoints del backend en `server.ts` y persistirse en PostgreSQL.
   - `localStorage` se reserva únicamente para token/sesión del usuario activo y caché offline resiliente.

5. **Prohibido Borrar o Pisar la Base de Datos al Iniciar (Cero Seed Destructivo)**:
   - En el servidor backend (`server.ts`), está estrictamente prohibido ejecutar `DROP TABLE`, `TRUNCATE`, `DELETE` masivos o recargar datos estáticos encima de tablas existentes al reiniciar el contenedor en Coolify.
   - Si las tablas de PostgreSQL ya contienen registros, el servidor los carga en memoria y jamás los sobrescribe ni reinicia.

6. **Preservación Total de Datos y Funcionalidades**:
   - NUNCA eliminar, reiniciar ni alterar datos existentes (equipos, inventarios, rondas históricas, tareas, hojas de vida, historiales, solicitudes, incidencias, usuarios ni configuraciones).
   - Todo cambio debe ser 100% quirúrgico, seguro e incremental.

7. **Estabilidad Visual y Cero Parpadeos**:
   - Toda actualización de estado, sincronización SSE y persistencia se realiza en segundo plano de manera transparente, sin parpadeos, destellos ni recargas forzadas que interrumpan al usuario.
