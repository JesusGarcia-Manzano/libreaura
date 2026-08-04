import { Component, inject, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CartService } from '../../services/cart/cart-service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-detalle-producto-component',
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './detalle-producto-component.html',
  styleUrl: './detalle-producto-component.scss',
})
export class DetalleProductoComponent {
  // Variable única para la cantidad
  cantidad: number = 1;
  cartService = inject(CartService);
  snackBar = inject(MatSnackBar);

  constructor(
    public dialogRef: MatDialogRef<DetalleProductoComponent>,
    @Inject(MAT_DIALOG_DATA) public producto: any // Recibe el objeto producto
  ) { }

  // Aumenta hasta el límite del stock
  sumar() {
    if (this.cantidad < this.producto.stock) {
      this.cantidad++;
    } else {
      // Aquí puedes usar un MatSnackBar si quieres un mensaje tipo "toast"
      // o simplemente dejar que el botón se deshabilite visualmente.
      this.snackBar.open(`Se llego al limite de stock del producto`, 'Cerrar', { duration: 3000 });
    }
  }

  // Reduce hasta un mínimo de 1
  restar() {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

  // Acción final al presionar el botón
  agregarAlCarrito() {
    if (this.producto) {
      this.cartService.agregarAlCarrito(this.producto, this.cantidad);
      this.dialogRef.close(); // Cierra el modal tras agregar
    }
  }
// Ahora guardaremos la URL de la imagen que queremos ver en grande
  imagenActivaUrl: string = '';
  isZoomed: boolean = false;

  abrirZoom(url: string) {
    this.imagenActivaUrl = url;
    this.isZoomed = true;
  }

  cerrarZoom() {
    this.isZoomed = false;
    this.imagenActivaUrl = '';
  }
}
