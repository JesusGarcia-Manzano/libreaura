import { Component, inject, signal, ViewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav'
import { MatIconModule } from '@angular/material/icon'
import { MatListModule } from '@angular/material/list'
import { RouterLink } from '@angular/router';
import { Firebase } from '../../services/firebase/firebase';
import { Auth, authState, signOut } from '@angular/fire/auth';

interface MenuItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-navbar',
  imports: [
    MatSidenavModule, MatIconModule, MatListModule, RouterLink
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  // Método para cerrar
  cerrarMenu() {
    this.sidenav.close();
  }

  // Método para el toggle que ya tienes
  toggle() {
    this.sidenav.toggle();
  }

  private platformId = inject(PLATFORM_ID);

  usuario: any = ""
  constructor(private auth: Auth, private authService: Firebase) {
    this.usuario = this.authService.authState

    // Escuchamos el estado de autenticación
    if (isPlatformBrowser(this.platformId)) {
      authState(this.auth).subscribe(user => {
        this.actualizarCategorias(!!user);
      });
    } else {
      // Estado por defecto en el servidor (asumimos que no está logueado temporalmente)
      this.actualizarCategorias(false);
    }
  }


  baseCategorias: MenuItem[] = [
    { path: "/productos/todo", icon: "/todoV.png",  label: "Ver Todo" },
    { path: "/productos/bolsos",    icon: "/BolsoV.png",     label: "Bolsa" },
    { path: "/productos/llavero",  icon: "/llaveroV.png",    label: "Llavero" },
    { path: "/productos/sobrero",  icon: "/sombreroV.png",  label: "Sombrero" },
    { path: "/productos/ropa",      icon: "/RopaV.png",       label: "Ropa" },
  ]
  categorias = signal<MenuItem[]>([]);
  private actualizarCategorias(estaLogueado: boolean) {
    let nuevasCategorias = [...this.baseCategorias];

    if (estaLogueado) {
      nuevasCategorias.push({ path: "/lista-compras", icon: "shopping_bag", label: "Mis Compras" });
      nuevasCategorias.push({ path: "/logout", icon: "logout", label: "Cerrar Sesion" });
    } else {
      nuevasCategorias.push({ path: "/login", icon: "login", label: "Iniciar Sesión" });
      nuevasCategorias.push({ path: "/registrarse", icon: "person_add", label: "Registrate" });
    }

    this.categorias.set(nuevasCategorias);
  }

  async cerrarSesion() {
    await signOut(this.auth);
  }
}
