# Reglas de Desarrollo y Actualizaciones

1. **Preservación Total de Funcionalidades, Datos y Configuraciones**:
   - NUNCA eliminar, reiniciar ni alterar datos existentes (equipos, inventarios, rondas, hojas de vida, historiales, solicitudes, incidencias, usuarios, contraseñas ni configuraciones del hotel) al realizar cualquier cambio o actualización.
   - Todo cambio o actualización debe ser 100% quirúrgico, seguro e incremental, respetando y protegiendo siempre la información previamente guardada.

2. **Alcance Estricto de las Solicitudes**:
   - Implementar única y exclusivamente lo que el usuario pida de forma explícita, sin agregar cambios no solicitados ni alterar los flujos existentes.

3. **Sincronización en Tiempo Real Fiable y Silenciosa**:
   - Mantener siempre la sincronización bidireccional inmediata en Firestore y el servidor local para que cualquier creación o eliminación se refleje de inmediato tanto en computador como en dispositivos móviles, sin generar sobrecarga ni bucles de actualización.

4. **Aplicación Global y Consistente de Cambios**:
   - Todo cambio o mejora solicitada debe implementarse de forma consistente y general en toda la aplicación (en todas las vistas, componentes, formularios y dispositivos conectados), garantizando una experiencia uniforme y homogénea en toda la plataforma.

5. **Estabilidad Visual Absoluta (Cero Parpadeos / No "Espavilar" la Pantalla)**:
   - Toda actualización de estado, guardado de datos o sincronización debe realizarse de manera suave, atómica y fluida en segundo plano.
   - Queda estrictamente prohibido provocar parpadeos, destellos o saltos bruscos en la pantalla ("espavilar la pantalla"), así como recargas de página o pérdidas de foco que desestabilicen la app durante el trabajo del usuario.
   - Las transiciones de datos deben preservar el estado de navegación y la interacción del usuario sin interrupciones visuales ni comportamientos erráticos.
