import { Component, computed, output, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from '../componentes/footer/footer'
import { HeaderComponent } from './../componentes/header/header'
import { NavbarComponent } from './../componentes/navbar/navbar'


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent, HeaderComponent, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('libre-aura');
  collapsed = signal(false)
  

  width = computed(() => this.collapsed() ? 0 : 100)
}
