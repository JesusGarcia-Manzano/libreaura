import { Component, inject } from '@angular/core';
import { MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Firebase } from '../../services/firebase/firebase';

@Component({
  selector: 'app-perfil-modal-component',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, FormsModule],
  templateUrl: './perfil-modal-component.html',
  styleUrl: './perfil-modal-component.scss',
})
export class PerfilModalComponent {
firebaseService = inject(Firebase);
  dialogRef = inject(MatDialogRef<PerfilModalComponent>);
  
  // Clonamos los datos actuales para editar
  perfil = { ...this.firebaseService.userData() };

  async guardarCambios() {
    console.log("perfil -> ", this.perfil)
    const user = this.firebaseService.currentUser();
    if (user) {
      await this.firebaseService.actualizarUsuario(user.uid, this.perfil);
      this.dialogRef.close(); // Cerramos al guardar
    }
  }
}
