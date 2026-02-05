import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface GameRom {
  id?: number;
  name: string;
  fileName: string;
  system: string;
  data: ArrayBuffer;
  coverArt?: string;
  dateAdded: Date;
  lastPlayed?: Date;
}

export interface SaveState {
  id?: number;
  romId: number;
  slot: number;
  data: ArrayBuffer;
  screenshot?: string;
  dateSaved: Date;
}

interface EmulatorDB extends DBSchema {
  roms: {
    key: number;
    value: GameRom;
    indexes: { 'by-system': string; 'by-name': string };
  };
  saves: {
    key: number;
    value: SaveState;
    indexes: { 'by-rom': number };
  };
}

export type SystemType = 'nes' | 'snes' | 'gb' | 'gbc' | 'gba' | 'n64' | 'nds' | 'psx' | 'segaMD' | 'segaMS' | 'segaGG' | 'segaCD' | 'segaSaturn' | 'atari2600' | 'atari7800';

export const SYSTEM_INFO: Record<SystemType, { name: string; extensions: string[]; core: string }> = {
  nes: { name: 'Nintendo (NES)', extensions: ['.nes'], core: 'nes' },
  snes: { name: 'Super Nintendo (SNES)', extensions: ['.smc', '.sfc'], core: 'snes' },
  gb: { name: 'Game Boy', extensions: ['.gb'], core: 'gb' },
  gbc: { name: 'Game Boy Color', extensions: ['.gbc'], core: 'gb' },
  gba: { name: 'Game Boy Advance', extensions: ['.gba'], core: 'gba' },
  n64: { name: 'Nintendo 64', extensions: ['.n64', '.z64', '.v64'], core: 'n64' },
  nds: { name: 'Nintendo DS', extensions: ['.nds'], core: 'nds' },
  psx: { name: 'PlayStation', extensions: ['.bin', '.iso', '.cue', '.img'], core: 'psx' },
  segaMD: { name: 'Sega Genesis/Mega Drive', extensions: ['.md', '.gen', '.bin'], core: 'segaMD' },
  segaMS: { name: 'Sega Master System', extensions: ['.sms'], core: 'segaMS' },
  segaGG: { name: 'Sega Game Gear', extensions: ['.gg'], core: 'segaGG' },
  segaCD: { name: 'Sega CD', extensions: ['.iso', '.bin', '.cue'], core: 'segaCD' },
  segaSaturn: { name: 'Sega Saturn', extensions: ['.iso', '.bin', '.cue'], core: 'segaSaturn' },
  atari2600: { name: 'Atari 2600', extensions: ['.a26'], core: 'atari2600' },
  atari7800: { name: 'Atari 7800', extensions: ['.a78'], core: 'atari7800' }
};

@Injectable({
  providedIn: 'root'
})
export class RomStorageService {
  private db: IDBPDatabase<EmulatorDB> | null = null;
  private dbName = 'emulator-db';
  private dbVersion = 1;

  async initDB(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<EmulatorDB>(this.dbName, this.dbVersion, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('roms')) {
          const romStore = db.createObjectStore('roms', { keyPath: 'id', autoIncrement: true });
          romStore.createIndex('by-system', 'system');
          romStore.createIndex('by-name', 'name');
        }
        if (!db.objectStoreNames.contains('saves')) {
          const saveStore = db.createObjectStore('saves', { keyPath: 'id', autoIncrement: true });
          saveStore.createIndex('by-rom', 'romId');
        }
      }
    });
  }

  detectSystem(fileName: string): SystemType | null {
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();

    for (const [system, info] of Object.entries(SYSTEM_INFO)) {
      if (info.extensions.includes(ext)) {
        return system as SystemType;
      }
    }
    return null;
  }

  async addRom(file: File, system?: SystemType): Promise<GameRom> {
    await this.initDB();

    const detectedSystem = system || this.detectSystem(file.name);
    if (!detectedSystem) {
      throw new Error(`Unknown file type: ${file.name}`);
    }

    const data = await file.arrayBuffer();
    const rom: GameRom = {
      name: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      system: detectedSystem,
      data,
      dateAdded: new Date()
    };

    const id = await this.db!.add('roms', rom);
    return { ...rom, id };
  }

  async getAllRoms(): Promise<GameRom[]> {
    await this.initDB();
    return this.db!.getAll('roms');
  }

  async getRomsBySystem(system: string): Promise<GameRom[]> {
    await this.initDB();
    return this.db!.getAllFromIndex('roms', 'by-system', system);
  }

  async getRom(id: number): Promise<GameRom | undefined> {
    await this.initDB();
    return this.db!.get('roms', id);
  }

  async deleteRom(id: number): Promise<void> {
    await this.initDB();
    await this.db!.delete('roms', id);
    // Also delete associated saves
    const saves = await this.db!.getAllFromIndex('saves', 'by-rom', id);
    for (const save of saves) {
      if (save.id) {
        await this.db!.delete('saves', save.id);
      }
    }
  }

  async updateLastPlayed(id: number): Promise<void> {
    await this.initDB();
    const rom = await this.db!.get('roms', id);
    if (rom) {
      rom.lastPlayed = new Date();
      await this.db!.put('roms', rom);
    }
  }

  async saveSaveState(romId: number, slot: number, data: ArrayBuffer, screenshot?: string): Promise<void> {
    await this.initDB();

    // Check if save exists for this slot
    const existing = await this.db!.getAllFromIndex('saves', 'by-rom', romId);
    const existingSave = existing.find(s => s.slot === slot);

    const saveState: SaveState = {
      id: existingSave?.id,
      romId,
      slot,
      data,
      screenshot,
      dateSaved: new Date()
    };

    await this.db!.put('saves', saveState);
  }

  async getSaveStates(romId: number): Promise<SaveState[]> {
    await this.initDB();
    return this.db!.getAllFromIndex('saves', 'by-rom', romId);
  }

  async deleteSaveState(id: number): Promise<void> {
    await this.initDB();
    await this.db!.delete('saves', id);
  }
}
