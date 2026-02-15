# EdgeNeuro Security Architecture: Default Deny + Symbolic Engine

**Date:** 2026-02-15  
**Principle:** Privilegio Mínimo - Denegar por defecto

---

## El Principio

```
┌─────────────────────────────────────────────────────────────┐
│                    DEFAULT DENY 🚫                          │
├─────────────────────────────────────────────────────────────┤
│  Usuario → Query → Motor Symbolic → Tabla Permisos          │
│                              ↓                              │
│              ┌───────────────────────────────┐             │
│              │ RELACIÓN EXPLICITA ENCONTRADA? │             │
│              └───────────────────────────────┘             │
│                    ↓              ↓                        │
│                   SÍ              NO                       │
│                    ↓              ↓                        │
│              [PERMITIR]        [DENEGAR]                   │
│                              ↓                              │
│                    Respuesta de UX                          │
└─────────────────────────────────────────────────────────────┘
```

### Por qué Denegar por Defecto?

| Allow by Default | Deny by Default |
|-----------------|-----------------|
| Error del LLM = brecha de seguridad | Error del LLM = blocked (seguro) |
| Regla olvidada = acceso no autorizado | Regla olvidada = denegado (seguro) |
| Incertidumbre estadística | Predcible, auditable |
| "Maybe" = permitir | "Maybe" = denegar |

---

## Arquitectura de la Base de Datos

```sql
-- USUARIOS y ROLES
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255),
    department VARCHAR(100),
    role_id UUID REFERENCES roles(id),
    created_at TIMESTAMP
);

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100),  -- MARKETING, ENGINEERING, HR, FINANCE, etc.
    description TEXT
);

-- TOPICS (recursos accesibles)
CREATE TABLE topics (
    id UUID PRIMARY KEY,
    name VARCHAR(100),  -- PAYROLL, SALES, IT_TICKETS, etc.
    description TEXT,
    sensitivity_level INT  -- 1=public, 2=internal, 3=confidential, 4=restricted
);

-- PERMISOS: Relación explícita Rol → Topic
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    role_id UUID REFERENCES roles(id),
    topic_id UUID REFERENCES topics(id),
    access_level VARCHAR(20),  -- READ, WRITE, ADMIN
    created_by UUID,
    created_at TIMESTAMP,
    UNIQUE(role_id, topic_id)  -- Una relación por par
);

-- GRUPOS (para acceso dinámico)
CREATE TABLE user_groups (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    description TEXT
);

CREATE TABLE user_group_members (
    group_id UUID REFERENCES user_groups(id),
    user_id UUID REFERENCES users(id),
    PRIMARY KEY(group_id, user_id)
);

-- REGLAS ADICIONALES (override, condiciones)
CREATE TABLE routing_rules (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    condition JSONB,  -- {"user.role": "MANAGER", "topic": "PAYROLL", "time_range": "work_hours"}
    action VARCHAR(20),  -- ALLOW, DENY, REDIRECT
    redirect_topic VARCHAR(100),
    priority INT DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP
);

-- AUDITORÍA
CREATE TABLE access_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    query_text TEXT,
    requested_topic VARCHAR(100),
    decision VARCHAR(20),  -- ALLOWED, DENIED, REDIRECTED
    reason TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## Motor Simbólico en SynapseCore

```typescript
// src/symbolic-engine.ts

interface AccessRequest {
  userId: string;
  userRole: string;
  department: string;
  query: string;
  requestedTopic: string;
}

interface AccessDecision {
  decision: 'ALLOW' | 'DENY' | 'REDIRECT';
  reason: string;
  redirectTo?: string;
  auditId: string;
}

export class SymbolicEngine {
  private db: D1Database;
  
  async evaluate(request: AccessRequest): Promise<AccessDecision> {
    // 1. Consultar tabla de permisos
    const permission = await this.checkPermission(
      request.userRole, 
      request.requestedTopic
    );
    
    if (permission) {
      return {
        decision: 'ALLOW',
        reason: `Role ${request.userRole} has explicit permission for ${request.requestedTopic}`,
        auditId: await this.log(request, 'ALLOWED')
      };
    }
    
    // 2. Verificar reglas adicionales
    const rule = await this.checkRules(request);
    if (rule) {
      return {
        decision: rule.action,
        reason: rule.reason,
        redirectTo: rule.redirectTopic,
        auditId: await this.log(request, rule.action)
      };
    }
    
    // 3. DEFAULT DENY 🚫
    return {
      decision: 'DENY',
      reason: `No explicit permission for role ${request.userRole} to access ${request.requestedTopic}`,
      auditId: await this.log(request, 'DENIED')
    };
  }
  
  private async checkPermission(roleId: string, topicId: string): Promise<boolean> {
    // SELECT 1 FROM permissions WHERE role_id = ? AND topic_id = ?
    // ... implementation
  }
  
  private async checkRules(request: AccessRequest): Promise<RoutingRule | null> {
    // Consultar routing_rules con condiciones JSON
    // ... implementation
  }
}
```

---

## Estrategias de Manejo de Denegación

### Opción A: Redirección Informativa 🟢

```
User: "Show me payroll data"
System: [DENY - no permission]
System: "I can't access payroll data with your MARKETING role. 
        Would you like me to help you submit an access request?"
        
        [Request Access] [Try Another Topic] [Contact Admin]
```

**Pros:** 
- Clara explicación
- Acción constructiva
- Tracks access requests

**Cons:**
- Puede ser frustrante

### Opción B: Sugerencia de Alternativa 💡

```
User: "Show me payroll data"
System: [DENY]
System: "I don't have access to payroll data for your role. 
        Did you mean:
        - Your team's expense reports?
        - HR policies (available to all)?
        - IT tickets for your department?"
        
        [Yes, show expenses] [Show policies] [Request payroll access]
```

**Pros:**
- Menos frustrante
- Explora opciones válidas

**Cons:**
- Requiere mapping de topics relacionados

### Opción C: Escalamiento Automático 📤

```
User: "Show me payroll data"
System: [DENY]
System: "Your request has been automatically escalated to your manager.
        You'll be notified when access is granted."
        
        (Notifica al manager + crea ticket de acceso)
```

**Pros:**
- Resolución sin fricción del usuario
- Trail de auditoría completo

**Cons:**
- Requiere integración con workflow

---

## Recomendación: Híbrido A + B

```
┌─────────────────────────────────────────────────────────┐
│  DENY RESPONSE WORKFLOW                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Mostrar mensaje claro: "No tienes acceso a X"     │
│                                                         │
│  2. Sugerir alternativas del MISMO rol                 │
│     (topics con acceso permitido)                      │
│                                                         │
│  3. Si no hay alternativas → opción de request        │
│                                                         │
│  4. SIEMPRE registrar en auditoría                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## UI para Gestión de Reglas

### Admin Panel - Permisos

| Role | Topic | Access Level | Actions |
|------|-------|--------------|---------|
| MARKETING | SALES | READ | [Edit] [Delete] |
| MARKETING | PAYROLL | DENY | [Edit] [Delete] |
| ENGINEERING | IT_TICKETS | READ/WRITE | [Edit] [Delete] |
| HR | PAYROLL | READ | [Edit] [Delete] |
| HR | SALES | DENY | [Edit] [Delete] |

### Admin Panel - Reglas

```
Rule: "Managers can access any topic during work hours"
Condition: {"role": "MANAGER", "time_range": "work_hours"}
Action: ALLOW
Priority: 10
[Edit] [Disable] [Delete]
```

---

## Cambios Necesarios

### 1. SynapseCore (`synapse_core/src/`)
- [ ] Agregar `symbolic-engine.ts`
- [ ] Modificar `index.ts` para usar engine
- [ ] Agregar endpoints `/v1/permissions/*`
- [ ] Agregar logging de decisiones

### 2. Database (`synapse_core/schema.sql`)
- [ ] Crear tablas: roles, topics, permissions, routing_rules, access_logs
- [ ] Migration del schema

### 3. Control Plane (`controlplane/`)
- [ ] UI Admin: Gestionar roles
- [ ] UI Admin: Gestionar topics
- [ ] UI Admin: Crear/editar permisos
- [ ] UI Admin: Crear reglas de routing
- [ ] Dashboard: Logs de acceso

### 4. Test Agents
- [ ] Actualizar para responder a requests denegados
- [ ] Agregar agente "Access Request Handler"

---

## Ejemplo de Flujo Completo

```
1. USER (MARKETING) → "Show me Q4 payroll"
2. SynapseCore → Intent Detection: "PAYROLL query"
3. Symbolic Engine → Check permission(MARKETING, PAYROLL)
4. Symbolic Engine → NOT FOUND → DEFAULT DENY 🚫
5. Symbolic Engine → Check alternatives for MARKETING role
   → Found: SALES (READ), HR_POLICIES (READ), IT_TICKETS (READ)
6. Response to user:
   "I can't show you payroll data (MARKETING role doesn't have access).
   
   Did you mean:
   📊 SALES reports (available to you)
   📄 HR policies
   🎫 IT tickets
   
   Or would you like to request payroll access?"
   
7. LOG → access_logs table
```

---

## Métricas de Seguridad

| Métrica | Target |
|---------|--------|
| Intentos denegados correctamente | >99% |
| Falsos positivos (permitidos indebidamente) | <0.1% |
| Tiempo de decisión symbolic | <10ms |
| Cobertura de reglas | 100% topics críticos |

---

## Orden de Implementación

1. **Fase 1:** Schema DB + Symbolic Engine básico
2. **Fase 2:** Default deny + logging
3. **Fase 3:** UI Admin de permisos
4. **Fase 4:** Manejo de denegación UX (sugerencias)
5. **Fase 5:** Reglas avanzadas + grupos
