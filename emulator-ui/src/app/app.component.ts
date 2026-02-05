import { Component } from '@angular/core';
import { EmulatorComponent } from './emulator/emulator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EmulatorComponent],
  template: '<app-emulator></app-emulator>'
})
export class AppComponent {}
