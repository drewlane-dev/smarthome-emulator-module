# Smarthome Emulator Module

## Overview
Browser-based retro game emulator module for the smarthome system. Uses EmulatorJS for emulation and IndexedDB for client-side ROM storage.

## Module Structure

### /config
- **mfe-manifest.json**: MFE integration config (purple gamepad icon)
- **module-fields.json**: Empty - no configuration needed
- **mfe-deployment.yaml**: K8s for MFE container only (no backend service)

### /emulator-ui
Angular 19 micro-frontend:
- **Port**: 4205 (dev)
- **Exposed component**: `EmulatorComponent`

## Architecture

This module is **client-side only**:
- ROMs stored in browser IndexedDB
- No backend service required
- EmulatorJS loaded from CDN
- Save states handled by EmulatorJS

## Key Files

- `services/rom-storage.service.ts`: IndexedDB wrapper for ROM/save management
- `emulator/emulator.component.ts`: Main component with library and player views

## Supported Systems

Defined in `SYSTEM_INFO` constant:
- NES, SNES, Game Boy, GBA, N64, NDS
- PlayStation
- Sega Genesis/MD, Master System, Game Gear, CD, Saturn
- Atari 2600, 7800

## Development

```bash
cd emulator-ui
npm install
npm start  # http://localhost:4205
```

## Docker Build

```bash
cd emulator-ui
docker build -t emulator-mfe:latest .
```
