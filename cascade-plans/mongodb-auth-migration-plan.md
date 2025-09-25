# Plan de Migración Gradual: Autenticación a MongoDB

## Resumen Ejecutivo
Migración gradual del módulo de autenticación de PostgreSQL a MongoDB manteniendo compatibilidad total con la implementación actual.

## Estado Actual del Sistema
- ✅ JWT con bcrypt para hash de contraseñas
- ✅ Roles: admin, instructor, student
- ✅ Middleware de autenticación y autorización
- ✅ Tabla `users` en PostgreSQL
- ✅ Endpoints: `/auth/login`, `/auth/register`, `/auth/me`

## Fase 1: Preparación (Semana 1)
### Configuración Inicial
- [ ] Instalar Mongoose y dependencias MongoDB
- [ ] Agregar variable `MONGODB_AUTH_URL` al `.env`
- [ ] Crear esquema User en Mongoose equivalente a tabla PostgreSQL
- [ ] Configurar conexión dual (PostgreSQL + MongoDB)

### Validación de Entorno
- [ ] Verificar conectividad MongoDB
- [ ] Probar esquema Mongoose con datos de prueba
- [ ] Validar que JWT y bcrypt funcionan igual

## Fase 2: Implementación Dual (Semana 2-3)
### Escritura Dual
- [ ] Modificar `AuthService` para escribir en ambas bases
- [ ] Mantener PostgreSQL como fuente principal de lectura
- [ ] Sincronizar registro de usuarios a MongoDB
- [ ] Implementar validación de consistencia

### Monitoreo
- [ ] Logs de sincronización exitosa/fallida
- [ ] Métricas de consistencia de datos
- [ ] Alertas por discrepancias

## Fase 3: Migración de Lecturas (Semana 4)
### Cambio Gradual
- [ ] Migrar endpoint `/auth/login` a leer de MongoDB
- [ ] Migrar endpoint `/auth/me` a leer de MongoDB
- [ ] Mantener escritura dual como respaldo
- [ ] Testing exhaustivo de todos los flujos

### Validación
- [ ] Verificar que JWT sigue funcionando igual
- [ ] Confirmar que roles y permisos se mantienen
- [ ] Testing de carga y rendimiento

## Fase 4: Limpieza (Semana 5)
### Finalización
- [ ] Remover dependencia de PostgreSQL para auth
- [ ] Limpiar código de escritura dual
- [ ] Actualizar documentación
- [ ] Deprecar tabla `users` en PostgreSQL

## Consideraciones Técnicas

### Compatibilidad
- ✅ Mantener estructura JWT idéntica
- ✅ Preservar hashes bcrypt existentes
- ✅ Conservar roles y permisos actuales
- ✅ No cambiar endpoints ni contratos API

### Seguridad
- ✅ Validar integridad durante migración
- ✅ Backup completo antes de cada fase
- ✅ Plan de rollback a PostgreSQL
- ✅ Auditoría de accesos durante transición

### Rendimiento
- ✅ Índices optimizados en MongoDB
- ✅ Conexiones de pool configuradas
- ✅ Timeouts y retry logic

## Requerimientos Adicionales

### Infraestructura
- [ ] Instancia MongoDB (desarrollo/producción)
- [ ] Configuración de réplicas para HA
- [ ] Backup automático MongoDB

### Desarrollo
- [ ] Scripts de migración de datos existentes
- [ ] Herramientas de validación de consistencia
- [ ] Tests de integración específicos para migración

### Operaciones
- [ ] Runbooks para rollback
- [ ] Monitoreo de salud MongoDB
- [ ] Alertas de sincronización

## Plan de Rollback
1. **Inmediato**: Revertir lecturas a PostgreSQL
2. **Datos**: Restaurar desde backup PostgreSQL
3. **Código**: Git revert a commit pre-migración
4. **Validación**: Verificar funcionalidad completa

## Criterios de Éxito
- [ ] 100% compatibilidad con sistema actual
- [ ] Cero downtime durante migración
- [ ] Rendimiento igual o mejor
- [ ] Todos los tests pasan
- [ ] Documentación actualizada

## Riesgos y Mitigaciones
- **Pérdida de datos**: Backup automático + escritura dual
- **Inconsistencia**: Validación continua + rollback rápido
- **Downtime**: Migración gradual + blue-green deployment
- **Rendimiento**: Testing de carga + optimización índices

---
*Tiempo estimado total: 5 semanas*  
*Esfuerzo: 1 desarrollador senior*  
*Riesgo: Medio (mitigado por enfoque gradual)*
