# Mi planning

Web app para seguir una planificación de entrenamiento de 13 semanas (fuerza + resistencia) y registrar cada sesión.

- **Hoy**: sesión del día, semana en curso, pendientes y semáforo de fatiga.
- **Plan**: las 13 semanas por fases, detalle de cada día y resumen semanal para copiar.
- **Fuerza**: plantillas A/B/C, registro por series, historial de cargas y 1RM estimado.
- **Comida**: menús de volumen por tipo de día con checklist, kcal y macros, peso diario con media semanal, extras, pautas y lista de la compra.
- **Alimentos**: base local de ~270 alimentos en español (`js/foods-db.js`) para cambiar o añadir alimentos, y «Mis alimentos» para productos propios.
- **Progreso**: km por semana, carga, peso, tests y ejercicios específicos.
- **Guía**: zonas, técnica, reglas de ajuste y nutrición.

Los registros se guardan solo en el navegador (localStorage). Exporta copias desde **Datos**.

El plan está en `js/plan.js`.
