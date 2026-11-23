# Mi planning

Web app para seguir una planificación de 15 semanas de hipertrofia (Torso/Pierna + brazos), funcional y carrera hacia un 10K, y registrar cada sesión.

- **Hoy**: sesión del día, semana en curso, pendientes y semáforo de fatiga.
- **Plan**: las 15 semanas por fases, detalle de cada día y resumen semanal para copiar.
- **Fuerza**: Torso A, Pierna A, Torso B, Brazos y hombro y Pierna B, con registro por series, historial de cargas y marcas estimadas.
- **Comida**: menús de volumen por tipo de día con checklist, kcal y macros, peso diario con media semanal, extras, pautas y lista de la compra.
- **Alimentos**: base local de ~270 alimentos en español (`js/foods-db.js`) para cambiar o añadir alimentos, y «Mis alimentos» para productos propios.
- **Progreso**: km por semana, carga, peso, tests de 5 y 10 km y predicción del 10K.
- **Guía**: zonas, técnica, reglas de ajuste y nutrición.

Los registros se guardan solo en el navegador (localStorage). Exporta copias desde **Datos**.

El plan está en `js/plan.js`.
