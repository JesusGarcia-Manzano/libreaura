import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-error-modal',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './error-modal.html',
  styleUrl: './error-modal.scss',
})
export class ErrorModalComponent {
constructor(
    public dialogRef: MatDialogRef<ErrorModalComponent>,
    // Usamos MAT_DIALOG_DATA para recibir el mensaje de error desde afuera
    @Inject(MAT_DIALOG_DATA) public data: {
        mensaje: string,
        mode: string,
        icono: string,
        textoLabel: string
    } 
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
