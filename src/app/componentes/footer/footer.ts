import { Firebase } from '../../services/firebase/firebase'
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EditarImagenesFHComponent } from "./../editar-imagenes-fh/editar-imagenes-fh";

@Component({
  selector: 'app-footer',
  imports: [AsyncPipe],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  constructor() { }
  authService = inject(Firebase)
  usuario: any = ""

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
    const user = this.authService.currentUser();
    if (!user) return; // O muestra una alerta

    const rolActual = this.authService.userData()?.rol;
    try {
      // Aquí puedes llamar a tu modal de confirmación antes de ejecutar
      const nuevoRol = await this.authService.cambiarRolUsuario(user.uid, rolActual);

      console.log("Cambio exitoso a:", nuevoRol);
      // Aquí puedes mostrar un Toast o SnackBar de éxito
    } catch (error) {
      console.error("Error al cambiar:", error);
    }
  }

}
