# FretMaster & Keys Studio — Arquitectura Móvil Multiplataforma (Android + iOS + PWA)

Base de código única estructurada por capas (`core/`, `audio/`, `state/`, `ui/`, `platform/`) preparada para **Android (`.apk` / `.aab`)**, **iOS / iPadOS (`.ipa` vía Xcode)** con **Capacitor 6**, y **PWA Offline-First**.

## Estructura del Proyecto

```text
fretmaster-mobile/
├── capacitor.config.json         # Configuración nativa de Capacitor (Android & iOS)
├── package.json                  # Scripts de sincronización, generación de iconos y servidor PWA
├── resources/                    # Iconos maestros 1024px (normal + adaptive) y Splash 2732px
├── www/
│   ├── index.html                # Shell móvil con soporte Safe-Area (Notch / Dynamic Island)
│   ├── manifest.webmanifest      # Manifiesto estándar Web App instalable
│   ├── sw.js                     # Service Worker con precache offline de todos los módulos
│   ├── icons/                    # Iconos multi-densidad (72px a 512px + Apple Touch Icon)
│   ├── styles/                   # CSS modular (tokens-and-theme.css + utilities.css offline)
│   └── js/                       # Arquitectura limpia en 5 capas (core, audio, state, ui, platform)
├── scripts/                      # Automatización para Windows (.bat) y macOS/Linux (.sh)
└── .github/workflows/            # Pipeline CI/CD que compila el .APK automáticamente en la nube
```

## Opciones de Instalación y Compilación

1. **Android `.APK` automático en la nube (sin instalar Android Studio)**:
   - Sube este proyecto a GitHub → pestaña **Actions** → ejecuta `Build Mobile` y descarga `FretMaster-Android-APK` (`app-debug.apk`).
2. **Compilación nativa local en Android Studio o Xcode (iOS)**:
   - En Windows: ejecuta `scripts/setup-mobile.bat`.
   - En macOS: ejecuta `./scripts/setup-mobile.sh` y luego `npm run open:ios` (Xcode) o `npm run open:android`.
3. **Instalación inmediata PWA Offline (Android Chrome / iPhone Safari)**:
   - Publica la carpeta `www/` en cualquier hosting estático (GitHub Pages, Netlify, Vercel) o ejecuta `npm run serve` en tu red local, ábrela en el teléfono y selecciona **Instalar aplicación** (Android) o **Compartir → Agregar a inicio** (iOS).
