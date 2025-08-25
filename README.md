# Simulador de CallCenter — LFP 2S2025 (Consola / JavaScript)

Este proyecto procesa un archivo **CSV** con registros de llamadas y genera:
- Historial de llamadas (HTML)
- Listado de operadores (HTML)
- Listado de clientes (HTML)
- Rendimiento de operadores (HTML)
- Porcentaje de clasificación (consola)
- Cantidad de llamadas por calificación 1..5 (consola)

## Requisitos
- Node.js 18+ (sin librerías externas).

## Ejecutar
```bash
npm start
```
Luego selecciona las opciones del menú en consola.

## Entrada CSV
Se aceptan dos formatos de estrellas:
- Columna única `estrellas` con una cadena de 5 caracteres compuesta por `x`/`X` y `0` (ej.: `xx000` → 2 estrellas).
- Cinco columnas `s1,s2,s3,s4,s5` (o `estrella1..5`) con `x`/`0` por columna.

Ejemplo incluido: `data/sample_input.csv`.
