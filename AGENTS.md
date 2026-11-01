# Reglas Permanentes de Desarrollo y Arquitectura

1. **Carpeta Principal Estricta (src/)**:
   - Todo el código fuente del frontend debe residir única y exclusivamente dentro de la carpeta `src/`. Queda prohibido crear carpetas duplicadas o alternas (como `app/applet/`). Coolify lee exclusivamente desde la raíz y `src/`.

2. **Cero Firebase / Firestore para Siempre**:
   - Firebase, Firestore, `firebase-applet-config.json`, `firestore.rules` y cualquier SDK de Firebase están eliminados permanentemente y prohibidos en cualquier actualización futura.

3. **Base de Datos Exclusiva: PostgreSQL (Coolify)**:
   - Toda la persistencia, lectura, escritura y sincronización debe realizarse directamente en la base de datos PostgreSQL del servidor (configurada mediante `DATABASE_URL` y el backend en `server.ts`).

4. **Preservación Total de Datos y Funcionalidades**:
   - NUNCA eliminar, reiniciar ni alterar datos existentes (equipos, inventarios, rondas, tareas, hojas de vida, historiales, solicitudes, incidencias, usuarios, contraseñas ni configuraciones del hotel).
   - Todo cambio debe ser 100% quirúrgico, seguro e incremental.

5. **Estabilidad Visual y Cero Parpadeos**:
   - Toda actualización de estado o sincronización debe realizarse de forma fluida en segundo plano, sin provocar parpadeos, destellos ni recargas que desestabilicen la pantalla.
