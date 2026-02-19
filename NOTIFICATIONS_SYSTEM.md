# Sistema de Notificaciones - Flowbit

## 🎯 Tipos de Notificaciones Implementadas

### 1. Etapa Lista (STAGE_READY) - ✅
**Trigger:** Cuando una etapa pasa de BLOCKED a READY
**Destinatarios:** Workers que tienen acceso a ese tipo de etapa
**Mensaje:** "El proyecto '{nombre}' está listo para comenzar en la etapa '{etapa}'"
**Ubicación del código:** `backend/app/api/projects.py` - función `auto_update_stage_status()`

### 2. Etapa Retrasada (STAGE_DELAYED) - ⚠️
**Trigger:** Tarea programada (3 veces al día: 9AM, 3PM, 9PM)
**Condición:** Etapa en progreso con fecha de entrega vencida hace 2+ días
**Destinatarios:** Admin de la empresa
**Mensaje:** "La etapa '{etapa}' del proyecto '{nombre}' lleva {X} días de retraso"
**Ubicación del código:** `backend/app/services/notification_service.py` - función `check_delayed_stages()`

### 3. Proyecto Próximo a Vencer (PROJECT_DEADLINE_SOON) - ⏰
**Trigger:** Tarea programada (3 veces al día: 9AM, 3PM, 9PM)
**Condición:** Proyecto con deadline en exactamente 15 días
**Destinatarios:** Admin de la empresa
**Mensaje:** "El proyecto '{nombre}' se debe entregar en 15 días. Actualmente está en la etapa '{etapa}'"
**Ubicación del código:** `backend/app/services/notification_service.py` - función `check_upcoming_deadlines()`

---

## 📁 Archivos Creados/Modificados

### Backend
```
✅ backend/app/models/notification.py - Modelo de notificaciones
✅ backend/app/models/user.py - Agregada relación notifications
✅ backend/app/schemas/notification.py - Schemas de respuesta
✅ backend/app/services/notification_service.py - Lógica de notificaciones
✅ backend/app/api/notifications.py - Endpoints REST
✅ backend/app/api/projects.py - Integrado notify_stage_ready()
✅ backend/app/tasks/scheduler.py - Tareas programadas (APScheduler)
✅ backend/app/main.py - Registrado router y scheduler
✅ backend/alembic/versions/..._add_notifications_table.py - Migración
✅ backend/app/scripts/check_notifications.py - Script manual
```

### Frontend
```
✅ frontend/src/components/NotificationBell.tsx - Componente campana
✅ frontend/src/components/layout/TopBar.tsx - Integrada campana
```

---

## 🔄 Flujo de Notificaciones

### Tipo 1: Etapa Lista (Automático)
```
1. Worker completa etapa → Estado cambia a DONE
2. Sistema ejecuta auto_update_stage_status()
3. Verifica etapas dependientes
4. Si dependencias completas → Stage pasa a READY
5. 🔔 notify_stage_ready() crea notificaciones
6. Notificación enviada a workers con acceso
```

### Tipo 2 y 3: Programadas
```
1. Scheduler ejecuta cada 6 horas (9AM, 3PM, 9PM)
2. check_delayed_stages() busca stages retrasadas
3. check_upcoming_deadlines() busca proyectos por vencer
4. 🔔 Crea notificaciones para admins
5. Se evita spam (no duplicar en 24h)
```

---

## 🎨 UI/UX

### Campana de Notificaciones
- **Ubicación:** TopBar (esquina superior derecha)
- **Badge:** Contador rojo con notificaciones no leídas (99+)
- **Dropdown:** 
  - Ancho: 384px
  - Max altura: 600px con scroll
  - Iconos de colores según tipo
  - Timestamps relativos (Hace 5min, Hace 2h, etc)
  - Click en notificación → navega al proyecto
  - Marca automáticamente como leída al hacer click

### Estados Visuales
- **No leídas:** Fondo azul claro + borde izquierdo azul + punto azul
- **Leídas:** Fondo blanco
- **Vacío:** Icono grande + mensaje amigable

### Iconos por Tipo
- **STAGE_READY:** ✓ verde (etapa lista)
- **STAGE_DELAYED:** ⚠️ rojo (alerta)
- **PROJECT_DEADLINE_SOON:** ⏰ ámbar (reloj)

---

## 🔌 API Endpoints

### GET `/notifications/`
Obtiene notificaciones del usuario actual
```json
{
  "notifications": [...],
  "unread_count": 5
}
```

### PATCH `/notifications/{id}/read`
Marca una notificación como leída

### PATCH `/notifications/mark-all-read`
Marca todas las notificaciones como leídas

### GET `/notifications/unread-count`
Obtiene solo el contador de no leídas

---

## ⚙️ Configuración

### Frecuencia de Polling (Frontend)
- **Actual:** Cada 30 segundos
- **Ubicación:** `NotificationBell.tsx` línea 19
- **Modificar:** Cambiar `30000` (milisegundos)

### Horarios de Verificación (Backend)
- **Actual:** 9AM, 3PM, 9PM
- **Ubicación:** `backend/app/tasks/scheduler.py` línea 32
- **Modificar:** Cambiar CronTrigger `hour='9,15,21'`

### Umbral de Retraso
- **Actual:** 2 días
- **Ubicación:** `notification_service.py` línea 64
- **Modificar:** `timedelta(days=2)`

### Días de Antelación para Deadline
- **Actual:** 15 días
- **Ubicación:** `notification_service.py` línea 115
- **Modificar:** `timedelta(days=15)`

---

## 🧪 Testing Manual

### Verificar notificaciones programadas:
```bash
cd backend
source venv/bin/activate
python -m app.scripts.check_notifications
```

### Crear notificación de prueba:
```python
from app.database import SessionLocal
from app.services.notification_service import create_notification

db = SessionLocal()
create_notification(
    db=db,
    user_id=1,  # Tu ID de usuario
    notification_type="STAGE_READY",
    title="Prueba",
    message="Esta es una notificación de prueba",
    project_id=1
)
db.close()
```

---

## 🚀 Próximas Mejoras Posibles

1. **WebSockets** para notificaciones en tiempo real (sin polling)
2. **Email/SMS** para notificaciones críticas
3. **Preferencias de notificación** por usuario
4. **Sonido** al recibir notificación nueva
5. **Push notifications** para móvil
6. **Filtros** por tipo de notificación
7. **Búsqueda** en historial de notificaciones
8. **Notificaciones grupales** (para equipos)

---

## 📊 Base de Datos

### Tabla: notifications
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    project_stage_id INTEGER REFERENCES project_stages(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_notifications_user_id ON notifications(user_id);
CREATE INDEX ix_notifications_created_at ON notifications(created_at);
CREATE INDEX ix_notifications_is_read ON notifications(is_read);
```

---

## ✅ Sistema Completamente Funcional

El sistema de notificaciones está listo y funcionando:
- ✅ Notificaciones cuando etapa se habilita
- ✅ Alertas de etapas retrasadas (2+ días)
- ✅ Avisos de proyectos próximos a vencer (15 días)
- ✅ UI profesional con campana y badge
- ✅ Polling cada 30 segundos
- ✅ Tareas programadas 3 veces al día
- ✅ Click para navegar al proyecto
- ✅ Marcar como leída automáticamente
