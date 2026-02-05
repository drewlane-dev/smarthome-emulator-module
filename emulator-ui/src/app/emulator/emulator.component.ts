import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RomStorageService, GameRom, SYSTEM_INFO, SystemType } from '../services/rom-storage.service';

declare global {
  interface Window {
    EJS_player?: string;
    EJS_core?: string;
    EJS_gameUrl?: string;
    EJS_gameName?: string;
    EJS_color?: string;
    EJS_startOnLoaded?: boolean;
    EJS_pathtodata?: string;
    EJS_gameID?: number;
    EJS_onGameStart?: () => void;
    EJS_onSaveState?: (data: { screenshot: string; state: ArrayBuffer }) => void;
    EJS_onLoadState?: () => ArrayBuffer | null;
    EJS_emulator?: {
      pause(): void;
      exit(): void;
      elements?: {
        container?: HTMLElement;
      };
    };
  }
}

@Component({
  selector: 'app-emulator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emulator.component.html',
  styleUrl: './emulator.component.scss'
})
export class EmulatorComponent implements OnInit, OnDestroy {
  @ViewChild('emulatorContainer') emulatorContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  roms: GameRom[] = [];
  filteredRoms: GameRom[] = [];
  selectedSystem = 'all';
  searchTerm = '';
  loading = false;
  error = '';

  currentRom: GameRom | null = null;
  isPlaying = false;
  private currentRomUrl: string | null = null;

  systems = Object.entries(SYSTEM_INFO).map(([key, info]) => ({
    value: key,
    label: info.name
  }));

  isDragging = false;

  constructor(private romStorage: RomStorageService) {}

  async ngOnInit(): Promise<void> {
    await this.loadRoms();
  }

  ngOnDestroy(): void {
    this.stopEmulator();
  }

  async loadRoms(): Promise<void> {
    this.loading = true;
    try {
      this.roms = await this.romStorage.getAllRoms();
      this.filterRoms();
    } catch (err) {
      this.error = 'Failed to load ROM library';
    } finally {
      this.loading = false;
    }
  }

  filterRoms(): void {
    this.filteredRoms = this.roms.filter(rom => {
      const matchesSystem = this.selectedSystem === 'all' || rom.system === this.selectedSystem;
      const matchesSearch = !this.searchTerm ||
        rom.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesSystem && matchesSearch;
    });

    // Sort by last played, then by name
    this.filteredRoms.sort((a, b) => {
      if (a.lastPlayed && b.lastPlayed) {
        return b.lastPlayed.getTime() - a.lastPlayed.getTime();
      }
      if (a.lastPlayed) return -1;
      if (b.lastPlayed) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  onSearchChange(): void {
    this.filterRoms();
  }

  onSystemChange(): void {
    this.filterRoms();
  }

  openFileDialog(): void {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      await this.addFiles(Array.from(input.files));
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files) {
      await this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  async addFiles(files: File[]): Promise<void> {
    this.error = '';
    this.loading = true;

    for (const file of files) {
      try {
        await this.romStorage.addRom(file);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.error = `Failed to add ${file.name}: ${message}`;
      }
    }

    await this.loadRoms();
  }

  async deleteRom(rom: GameRom, event: Event): Promise<void> {
    event.stopPropagation();
    if (rom.id && confirm(`Delete "${rom.name}"?`)) {
      await this.romStorage.deleteRom(rom.id);
      await this.loadRoms();
    }
  }

  async playRom(rom: GameRom): Promise<void> {
    this.currentRom = rom;
    this.isPlaying = true;

    if (rom.id) {
      await this.romStorage.updateLastPlayed(rom.id);
    }

    // Wait for view to update
    setTimeout(() => this.initEmulator(rom), 100);
  }

  private initEmulator(rom: GameRom): void {
    const systemInfo = SYSTEM_INFO[rom.system as SystemType];
    if (!systemInfo) {
      this.error = `Unknown system: ${rom.system}`;
      this.stopEmulator();
      return;
    }

    // Create blob URL for the ROM
    const blob = new Blob([rom.data]);
    this.currentRomUrl = URL.createObjectURL(blob);

    // Configure EmulatorJS
    window.EJS_player = '#emulator-game';
    window.EJS_core = systemInfo.core;
    window.EJS_gameUrl = this.currentRomUrl;
    window.EJS_gameName = rom.name;
    window.EJS_color = '#9B59B6';
    window.EJS_startOnLoaded = true;
    window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';

    // Load EmulatorJS script
    const script = document.createElement('script');
    script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
    script.async = true;
    document.body.appendChild(script);
  }

  stopEmulator(): void {
    // Try to properly exit the emulator
    if (window.EJS_emulator) {
      try {
        window.EJS_emulator.pause();
        window.EJS_emulator.exit();
      } catch (e) {
        console.warn('Error stopping emulator:', e);
      }
      delete window.EJS_emulator;
    }

    // Revoke the blob URL
    if (this.currentRomUrl) {
      URL.revokeObjectURL(this.currentRomUrl);
      this.currentRomUrl = null;
    }

    // Clean up EmulatorJS DOM elements
    const gameDiv = document.getElementById('emulator-game');
    if (gameDiv) {
      gameDiv.innerHTML = '';
    }

    // Remove EmulatorJS container if it exists outside our div
    const ejsContainer = document.querySelector('.ejs--container');
    if (ejsContainer) {
      ejsContainer.remove();
    }

    // Remove any added scripts and styles
    document.querySelectorAll('script[src*="emulatorjs"]').forEach(s => s.remove());
    document.querySelectorAll('link[href*="emulatorjs"]').forEach(s => s.remove());
    document.querySelectorAll('style[data-ejs]').forEach(s => s.remove());

    // Clear EJS global variables
    delete window.EJS_player;
    delete window.EJS_core;
    delete window.EJS_gameUrl;
    delete window.EJS_gameName;

    this.isPlaying = false;
    this.currentRom = null;
  }

  getSystemName(system: string): string {
    return SYSTEM_INFO[system as SystemType]?.name || system;
  }

  getSystemIcon(system: string): string {
    const icons: Record<string, string> = {
      nes: 'videogame_asset',
      snes: 'videogame_asset',
      gb: 'phone_android',
      gbc: 'phone_android',
      gba: 'phone_android',
      n64: 'sports_esports',
      nds: 'tablet',
      psx: 'album',
      segaMD: 'videogame_asset',
      segaMS: 'videogame_asset',
      segaGG: 'phone_android',
      segaCD: 'album',
      segaSaturn: 'album',
      atari2600: 'videogame_asset',
      atari7800: 'videogame_asset'
    };
    return icons[system] || 'videogame_asset';
  }

  getAcceptedExtensions(): string {
    return Object.values(SYSTEM_INFO)
      .flatMap(info => info.extensions)
      .join(',');
  }
}
