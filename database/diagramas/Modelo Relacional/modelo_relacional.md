# Modelo relacional de SGDE

Generado desde los `models.py` de `backend/apps/` (16 tablas). Si no coincide con el código, el código manda.
La imagen equivalente está en `Modelo_Relacional_SGDE.png` (fuente: `Modelo_Relacional_SGDE.pu`).

Convenciones: `PK` llave primaria, `FK` llave foránea, `UK` valor único. Las tablas de Django que no son del
negocio (sesiones, permisos, lista negra de tokens) no se muestran.

```mermaid
erDiagram
    sitios_ciudad {
        bigint id PK
        varchar codigo UK
        varchar nombre
    }
    sitios_sitio {
        bigint id PK
        varchar nombre
        bigint ciudad_id FK
        timestamp creado_en
    }
    usuarios_rol {
        bigint id PK
        varchar codigo UK
        varchar nombre
        text descripcion
    }
    usuarios_usuario {
        bigint id PK
        varchar password
        timestamp last_login "opcional"
        boolean is_superuser
        varchar username UK
        varchar first_name
        varchar last_name
        varchar email
        boolean is_staff
        boolean is_active
        timestamp date_joined
        bigint rol_id FK
    }
    usuarios_usuario_sitios {
        bigint id PK
        bigint usuario_id FK
        bigint sitio_id FK
    }
    clientes_empresa {
        bigint id PK
        varchar razon_social
        varchar identificacion UK
        varchar contacto
        varchar correo
        bigint ciudad_id FK "opcional"
    }
    clientes_cliente {
        bigint id PK
        bigint usuario_id FK, UK "opcional"
        varchar tipo
        varchar nombre
        varchar identificacion UK "opcional"
        varchar telefono
        varchar correo
        bigint empresa_id FK "opcional"
        varchar forma_pago
        text observaciones_internas
        boolean activo
        timestamp creado_en
    }
    salones_montaje {
        bigint id PK
        varchar codigo UK
        varchar nombre
        text descripcion
    }
    salones_salon {
        bigint id PK
        bigint sitio_id FK
        varchar nombre
        decimal altura "opcional"
        decimal ancho "opcional"
        varchar foto_url
        boolean activo
    }
    salones_salonmontaje {
        bigint id PK
        bigint salon_id FK
        bigint montaje_id FK
        int aforo
        varchar foto_url
    }
    catalogo_concepto {
        bigint id PK
        bigint sitio_id FK
        varchar nombre
        decimal precio
        decimal impuesto_pct
        boolean activo
    }
    catalogo_historialprecioconcepto {
        bigint id PK
        bigint concepto_id FK
        decimal precio_anterior
        decimal precio_nuevo
        bigint modificado_por_id FK
        timestamp fecha_modificacion
    }
    proveedores_proveedor {
        bigint id PK
        varchar nombre
        varchar identificacion
        varchar contacto
        bigint usuario_id FK, UK "opcional"
    }
    proveedores_stockelemento {
        bigint id PK
        bigint proveedor_id FK
        varchar nombre_elemento
        int cantidad
        decimal valor
        timestamp actualizado_en
    }
    cotizaciones_cotizacion {
        bigint id PK
        bigint sitio_id FK
        bigint cliente_id FK
        bigint usuario_id FK
        bigint salon_id FK
        bigint montaje_id FK
        varchar estado
        date fecha_evento
        date validez_oferta "opcional"
        int cantidad_personas
        timestamp bloqueo_hasta "opcional"
        varchar garantia_tipo
        decimal garantia_monto "opcional"
        timestamp garantia_registrada_en "opcional"
        bigint garantia_registrada_por_id FK "opcional"
        decimal penalizacion_pct "opcional"
        text motivo_cancelacion
        timestamp cancelado_en "opcional"
        bigint cancelado_por_id FK "opcional"
        timestamp creado_en
    }
    cotizaciones_cotizacionitem {
        bigint id PK
        bigint cotizacion_id FK
        bigint concepto_id FK
        int cantidad
        decimal precio_unitario
        decimal impuesto_pct
    }
    cotizaciones_movimientocotizacion {
        bigint id PK
        bigint cotizacion_id FK
        varchar tipo
        bigint usuario_id FK "opcional"
        timestamp fecha
        varchar detalle
    }
    sitios_ciudad ||--o{ sitios_sitio : "ciudad_id"
    usuarios_rol ||--o{ usuarios_usuario : "rol_id"
    usuarios_usuario ||--o{ usuarios_usuario_sitios : "usuario_id"
    sitios_sitio ||--o{ usuarios_usuario_sitios : "sitio_id"
    sitios_ciudad |o--o{ clientes_empresa : "ciudad_id"
    usuarios_usuario |o--o| clientes_cliente : "usuario_id"
    clientes_empresa |o--o{ clientes_cliente : "empresa_id"
    sitios_sitio ||--o{ salones_salon : "sitio_id"
    salones_salon ||--o{ salones_salonmontaje : "salon_id"
    salones_montaje ||--o{ salones_salonmontaje : "montaje_id"
    sitios_sitio ||--o{ catalogo_concepto : "sitio_id"
    catalogo_concepto ||--o{ catalogo_historialprecioconcepto : "concepto_id"
    usuarios_usuario ||--o{ catalogo_historialprecioconcepto : "modificado_por_id"
    usuarios_usuario |o--o| proveedores_proveedor : "usuario_id"
    proveedores_proveedor ||--o{ proveedores_stockelemento : "proveedor_id"
    sitios_sitio ||--o{ cotizaciones_cotizacion : "sitio_id"
    clientes_cliente ||--o{ cotizaciones_cotizacion : "cliente_id"
    usuarios_usuario ||--o{ cotizaciones_cotizacion : "usuario_id"
    salones_salon ||--o{ cotizaciones_cotizacion : "salon_id"
    salones_montaje ||--o{ cotizaciones_cotizacion : "montaje_id"
    usuarios_usuario |o--o{ cotizaciones_cotizacion : "garantia_registrada_por_id"
    usuarios_usuario |o--o{ cotizaciones_cotizacion : "cancelado_por_id"
    cotizaciones_cotizacion ||--o{ cotizaciones_cotizacionitem : "cotizacion_id"
    catalogo_concepto ||--o{ cotizaciones_cotizacionitem : "concepto_id"
    cotizaciones_cotizacion ||--o{ cotizaciones_movimientocotizacion : "cotizacion_id"
    usuarios_usuario |o--o{ cotizaciones_movimientocotizacion : "usuario_id"
```

## Restricciones que no se ven en el diagrama

- `clientes_cliente`: `cliente_juridico_sin_identificacion` (CheckConstraint: condición) — un cliente jurídico no tiene identificación propia (usa el NIT de su empresa)
- `salones_salon`: `uq_sitio_salon_nombre` (UniqueConstraint: sitio, nombre)
- `salones_salonmontaje`: `uq_salon_montaje` (UniqueConstraint: salon, montaje)
- `catalogo_concepto`: `uq_sitio_concepto_nombre` (UniqueConstraint: sitio, nombre)
- `proveedores_stockelemento`: `uq_proveedor_elemento` (UniqueConstraint: proveedor, nombre_elemento)
- `cotizaciones_cotizacion`: `uq_salon_fecha_confirmado` (UniqueConstraint: salon, fecha_evento) — solo cuenta las cotizaciones con estado = confirmado (evita la sobreventa)
