import { Firebase } from '../../services/firebase/firebase'
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EditarImagenesFHComponent } from "./../editar-imagenes-fh/editar-imagenes-fh";
import { CartService } from '../../services/cart/cart-service'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-footer',
  imports: [AsyncPipe, MatSnackBarModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  constructor() { }
  authService = inject(Firebase)
  usuario: any = ""
  cartService = inject(CartService);
  private snackBar = inject(MatSnackBar);

  private dialog = inject(MatDialog);
  async ngOnInit() {
    this.usuario = this.authService.authState;
    // Asegúrate de llamar a cargarConfiguracion si aún no lo haces al iniciar la app
    await this.authService.cargarConfiguracion();
  }

  get esAdmin(): boolean {
    return this.authService.esAdministrador();
  }

  abrirGestor() {
    // Seguridad extra: evitar abrir si alguien manipula el DOM
    if (this.esAdmin) {
      this.dialog.open(EditarImagenesFHComponent, { width: '500px' });
    }
  }

  async confirmarCambioRol() {

    // NUEVA VALIDACIÓN: Revisamos si el carrito tiene al menos 1 producto
    if (this.cartService.carrito().length > 0) {
      this.snackBar.open('Para poder cambiar de perfil, necesitas vaciar tu carrito de compras.', 'Entendido', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['alerta-carrito']
      });
      return; // Detenemos la función aquí mismo
    }

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

}
