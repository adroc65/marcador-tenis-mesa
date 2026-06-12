# Marcador · Tenis de Mesa (PWA)

Marcador de tenis de mesa para tablet/teléfono Android. Funciona en el navegador
y, una vez publicado con https, se puede instalar como app y usar 100% offline.

## Funciones

- Jugador A y Jugador B por default; el nombre se edita en la configuración o
  tocando el nombre durante el partido.
- Se elige quién saca primero. El saque cambia cada 2 puntos (cada punto a
  partir de 10-10) y el sacador inicial alterna en cada set.
- Se elige quién inicia a la izquierda de la pantalla, para que el marcador
  de cada jugador quede del lado de la mesa donde está parado (la pantalla
  se coloca viendo hacia los jugadores).
- Set a 11 puntos con diferencia de 2. Partido a 2 de 3 sets (default) o 3 de 5.
- Opción de cambio de lado al llegar a 5 puntos en el set decisivo (default: no).
  Los lados en pantalla se intercambian igual que los jugadores en la mesa.
- Cuadrito central con los marcadores de los sets pasados y sets ganados.
- Log de todos los puntos (hora, quién anotó, marcador, quién sacaba),
  exportable: 💾 descarga un `.json` por partido (pensado para analizar
  estadísticas con Python) y 📤 comparte el resumen legible.
- Cronómetro del set y duración estimada según el ritmo de puntos.
- Botón deshacer (funciona incluso si el punto cerró un set o el partido).
- El partido se guarda solo: si se cierra la app, se puede continuar.
- Mantiene la pantalla encendida durante el partido (Wake Lock).
- Al iniciar un partido pasa a pantalla completa y bloquea la orientación
  en horizontal (en móvil).

## Probar en la compu

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Abrir http://localhost:8200

## Probar desde la tablet/teléfono (misma red wifi)

1. Permitir el puerto (una sola vez, en PowerShell como administrador):
   ```powershell
   netsh http add urlacl url=http://+:8200/ user=Todos
   New-NetFirewallRule -DisplayName "Marcador 8200" -Direction Inbound -LocalPort 8200 -Protocol TCP -Action Allow
   ```
2. Correr `serve.ps1` y ver la IP de la compu con `ipconfig` (Dirección IPv4).
3. En el dispositivo abrir `http://<IP-de-la-compu>:8200`.

Nota: por http en red local la app corre bien, pero el modo offline y el botón
"instalar" requieren https.

## Instalarla en los dispositivos (offline, sin compu)

Subir esta carpeta a cualquier hosting estático con https, por ejemplo:

- **Netlify Drop** (drag & drop de la carpeta, sin cuenta ni build): https://app.netlify.com/drop
- **GitHub Pages** (repo + Settings → Pages).

Luego en Android: abrir la URL en Chrome → menú ⋮ → "Agregar a la pantalla
principal" / "Instalar app". Desde ahí funciona offline y a pantalla completa.

## Estructura

| Archivo | Qué es |
|---|---|
| `logic.js` | Motor del juego, sin UI — reutilizable en la futura app Expo |
| `app.js` | Interfaz: pantallas, render, persistencia, wake lock |
| `index.html` / `styles.css` | Estructura y estilos |
| `manifest.webmanifest` / `sw.js` | PWA: instalación y modo offline |
| `serve.ps1` | Servidor estático local para pruebas |
| `test-logic.js` | Pruebas del motor (`node test-logic.js`, requiere Node) |

## Pendiente / siguiente etapa

- Marcador de dobles (rotación de saque entre 4 jugadores).
- Migración a Expo / React Native para distribuir como APK.
