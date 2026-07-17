import { Component, inject } from '@angular/core';
import { Firebase } from '../../services/firebase/firebase';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editar-imagenes-fh',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './editar-imagenes-fh.html',
  styleUrl: './editar-imagenes-fh.scss',
})
export class EditarImagenesFHComponent {
  firebaseService = inject(Firebase);
  dialogRef = inject(MatDialogRef<EditarImagenesFHComponent>);
  config = this.firebaseService.configuracion;
  cargando: string | null = null; // Para mostrar un spinner si quieres

  async actualizarImagen(campo: string, event: any) {
    const file = event.target.files[0];
    if (file) {
      this.cargando = campo; // Marcamos que este campo está cargando
      try {
        const url = await this.firebaseService.subirArchivoStorage(file);
        await this.firebaseService.actualizarConfiguracion(campo, url);
        await this.firebaseService.cargarConfiguracion(); // Refresca la señal
      } catch (e) {
        console.error("Error al subir:", e);
      } finally {
        this.cargando = null;
      }
    }
  }

  // En editar-imagenes-fh.ts
  async eliminarImagen(campo: string) {
    // Llamamos a la función del servicio pasando una cadena vacía
    await this.firebaseService.actualizarConfiguracion(campo, '');
    // Recargamos los datos para que se vea el cambio
    await this.firebaseService.cargarConfiguracion();
  }
}
