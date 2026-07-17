import { Component, computed, inject, output, PLATFORM_ID } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { Firebase } from '../../services/firebase/firebase'
import { CartService } from '../../services/cart/cart-service'
import { LogoutService } from '../../services/logout/logout'
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CarritoModalComponent } from '../carrito/carrito';
import { CrearProductoComponent } from '../crear-producto/crear-producto';
import { PerfilModalComponent } from '../perfil-modal-component/perfil-modal-component';
import { ChangeDetectorRef } from '@angular/core';

// NUEVO: Importamos MatSnackBar para mostrar el mensaje de alerta
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-header',
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
    AsyncPipe,
    MatSnackBarModule // NUEVO: Añadimos el módulo a los imports
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  // NUEVO: Inyectamos el servicio de SnackBar
  private snackBar = inject(MatSnackBar);

  constructor() {

  }

  authService = inject(Firebase);
  loginOut = inject(LogoutService);
  cartService = inject(CartService);

  imagenes: any[] = [];
  imgDesk: string = "";
  imgMobi: string = "";
  tipoUsuarios: any[] = [];
  cambioTipoCliente: string = '';
  isLogin = false;
  usuario: any = "";
  onToggle = output();
  cualRol = ''
  async ngOnInit() {
    this.usuario = this.authService.authState;
    
  }

  async cerrarSesion() {
    await this.loginOut.cerrarSesion();
  }

  obtenerTotalProductos(): number {
    return this.cartService.carrito().reduce((total, item) => total + item.cantidad, 0);
  }

  abrirCarrito() {
    this.dialog.open(CarritoModalComponent, {
      width: '500px',
      panelClass: 'custom-dialog-container'
    });
  }

  get esAdmin(): boolean {
    return this.authService.esAdministrador();
  }

  abrirModalCrearProductos() {
    this.dialog.open(CrearProductoComponent, { width: '600px' });
  }

async confirmarCambioRol() {
    const user = this.authService.currentUser();
    const userData = this.authService.userData(); // Obtener la data actual
 
    // Validar que exista el usuario y que los datos de Firestore ya estén cargados
    if (!user || !userData) {
      console.error("Aún no se ha cargado el usuario o sus datos de Firestore.");
      return;
    }

    console.log("ID DEL USUARIO EN EL HEADER:", user.uid);

    const rolActual = userData.rol;
    await this.authService.cambiarRolUsuario(user.uid, rolActual);
  }
  abrirPerfil() {
    this.dialog.open(PerfilModalComponent, {
      width: '600px'
    });
  }

}