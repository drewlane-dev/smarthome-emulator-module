# Smarthome Emulator Module

Browser-based retro game emulator module for the smarthome system. Play classic games from NES, SNES, Game Boy, and more right in your browser.

## Features

- **Multiple Systems**: NES, SNES, Game Boy, GBA, N64, PlayStation, Sega, and more
- **Client-Side Storage**: ROMs stored in browser IndexedDB (no server needed)
- **Drag & Drop**: Easy ROM upload via drag and drop
- **Auto-Detection**: Automatically detects system from file extension
- **Save States**: Built-in save state support via EmulatorJS
- **Gamepad Support**: Use controllers for authentic gaming

## Structure

```
smarthome-emulator-module/
├── config/
│   ├── mfe-manifest.json      # MFE configuration for shell
│   ├── module-fields.json     # Configuration form fields (empty)
│   └── mfe-deployment.yaml    # K8s deployment for UI
└── emulator-ui/               # Angular MFE application
    ├── src/
    ├── Dockerfile
    └── package.json
```

## Supported Systems

| System | Extensions |
|--------|------------|
| NES | .nes |
| SNES | .smc, .sfc |
| Game Boy | .gb |
| Game Boy Color | .gbc |
| Game Boy Advance | .gba |
| Nintendo 64 | .n64, .z64, .v64 |
| Nintendo DS | .nds |
| PlayStation | .bin, .iso, .cue |
| Sega Genesis | .md, .gen, .bin |
| Sega Master System | .sms |
| Sega Game Gear | .gg |
| Atari 2600 | .a26 |
| Atari 7800 | .a78 |

## Development

### Prerequisites
- Node.js 20+

### Run locally
```bash
cd emulator-ui
npm install
npm start  # Runs on localhost:4205
```

## Deployment

The module is deployed via the smarthome-management-api:

1. Install the module from the shell UI
2. No configuration needed - just install and play!

### Manual Docker build
```bash
cd emulator-ui
docker build -t emulator-mfe:latest .
```

## Legal Notice

This module does not include any ROMs. Users must provide their own legally obtained ROM files. Only use ROMs for games you own.

## Powered By

- [EmulatorJS](https://emulatorjs.org/) - Browser-based emulation
- [idb](https://github.com/jakearchibald/idb) - IndexedDB wrapper

## Related Repositories

- [smarthome-shell-ui](https://github.com/drewlane-dev/smarthome-shell-ui) - Shell application
- [smarthome-management-api](https://github.com/drewlane-dev/smarthome-management-api) - Backend API
