# Plan de Pruebas: Módulos de Cursos y Lecciones

**Repositorio:** `learning-platform-monolith`

## 1. Contexto

Este plan describe la estrategia para implementar pruebas unitarias y de integración ligeras para los módulos de `Courses` y `Lessons`. El objetivo es asegurar la fiabilidad de la lógica de negocio siguiendo la arquitectura `Route-Controller-Service` existente.

## 2. Alcance

- **Pruebas Unitarias (Prioridad Alta):**
  - `CourseService` y `LessonService`: toda la lógica de negocio.
  - Validadores de entrada para las rutas de cursos y lecciones.
- **Pruebas de Integración (Opcional):**
  - Endpoints de la API para `Courses` y `Lessons` usando Express y `fetch` nativo para verificar el flujo completo de las solicitudes.

## 3. Entregables

- Archivos de prueba `*.test.ts` para los servicios y validadores de `Courses` y `Lessons`.
- Mocks de Jest para dependencias externas como la base de datos.
- Un informe de cobertura de pruebas que demuestre una cobertura adecuada de la lógica de negocio crítica.

## 4. Criterios de Aceptación

- Todas las pruebas deben usar exclusivamente el framework Jest (runner, assertions, mocks).
- Las pruebas deben seguir las convenciones y la estructura de los archivos de prueba existentes en el repositorio.
- El `pull request` final debe incluir los archivos de prueba y pasar todas las comprobaciones de CI.
