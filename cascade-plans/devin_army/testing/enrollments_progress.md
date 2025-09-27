# Plan de Pruebas: Módulos de Inscripciones y Progreso

**Repositorio:** `learning-platform-monolith`

## 1. Contexto

Este plan cubre la implementación de pruebas para los módulos de `Enrollments` y `Progress`, que gestionan la inscripción de los alumnos y su progreso en los cursos. Las pruebas se alinearán con la arquitectura `Route-Controller-Service` del proyecto.

## 2. Alcance

- **Pruebas Unitarias (Prioridad Alta):**
  - `EnrollmentService` y `ProgressService`: lógica de negocio, incluyendo la creación de inscripciones y la actualización del progreso.
  - Validadores para las rutas de `enrollments` y `progress`.
- **Pruebas de Integración (Opcional):**
  - Endpoints de la API para `Enrollments` y `Progress` para validar flujos clave como la inscripción a un curso y la finalización de una lección.

## 3. Entregables

- Archivos de prueba `*.test.ts` para los servicios y validadores de `Enrollments` y `Progress`.
- Mocks de Jest para simular interacciones con la base de datos y otros servicios.
- Informe de cobertura de pruebas que muestre la cobertura de la lógica implementada.

## 4. Criterios de Aceptación

- Las pruebas se escribirán únicamente con Jest.
- Se seguirán las convenciones de nomenclatura y estructura de pruebas existentes en el repositorio.
- Las nuevas pruebas deben ejecutarse con éxito en el pipeline de CI.
