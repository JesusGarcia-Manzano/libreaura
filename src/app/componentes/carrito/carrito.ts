import { Component, inject } from '@angular/core';
import { CartService } from '../../services/cart/cart-service';
import { Firebase } from '../../services/firebase/firebase';
import { EmailServices } from '../../services/email/email-services';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carrito',
  imports: [MatDialogModule],
  templateUrl: './carrito.html',
  styleUrl: './carrito.scss',
})
export class CarritoModalComponent {
  cartService = inject(CartService);
  firebaseService = inject(Firebase);
  router = inject(Router);
  private emailService = inject(EmailServices);

  constructor(public dialogRef: MatDialogRef<CarritoModalComponent>) {
    this.cartService.carrito().map((item: any) => console.log(item));
  }

  // NUEVO: Genera el mensaje de error si un proveedor no cumple el mínimo
  obtenerErrorProveedor(): string | null {
    const userData = this.firebaseService.userData();

    if (userData?.rol === 'proveedor') {
      // Buscamos el primer producto en el carrito que tenga menos de 4 unidades
      const itemInvalido = this.cartService.carrito().find((item: any) => item.cantidad < 4);

      if (itemInvalido) {
        return `El producto "${itemInvalido.nombre}" requiere un mínimo de 4 unidades para realizar la compra.`;
      }
    }

    return null; // Retorna null si no es proveedor o si cumple todas las reglas
  }

  // NUEVO: Valida si el botón de checkout debe habilitarse
  puedeComprar(): boolean {
    // Falla si el carrito está vacío
    if (this.cartService.carrito().length === 0) return false;

    // Falla si existe un error de cantidad para proveedores
    if (this.obtenerErrorProveedor() !== null) return false;

    return true;
  }

  // REQ 4: Ir a login si no hay sesión
  irALogin() {
    this.dialogRef.close();
    this.router.navigate(['/login']);
  }

  // REQ 8: Crear el pedido con la estructura de tu imagen
  async checkOut() {
    const user = this.firebaseService.currentUser();
    const userData = this.firebaseService.userData();

    const folioGenerado = `PED-${Math.floor(Math.random() * 10000000000)}`;

    let nuevoPedido = {
      clienteEmail: user?.email,
      clienteId: user?.uid,
      clienteNombre: userData?.nombre,
      estado: 'Pendiente',
      fecha: new Date(),
      folio: folioGenerado,
      productos: this.cartService.carrito().map((item: any) => ({
        idProducto: item.idProducto,
        cantidad: item.cantidad,
        precio: item.precio,
        imagen: item.imagen,
        nombre: item.nombre,
        stock: item.stock,
        totaProducto: item.totaProducto
      })),
      total: this.cartService.calcularTotal()
    };

    try {
      await this.firebaseService.crearPedido(nuevoPedido, folioGenerado);

      for (const item of nuevoPedido.productos) {
        await this.firebaseService.descontarStock(item.idProducto, item.cantidad);
      }

      this.cartService.vaciarCarrito();
      await this.emailService.enviarCorreoPedido(nuevoPedido);
      this.cartService.snackBar.open('¡Pedido realizado con éxito!', 'Cerrar', { duration: 4000 });
      this.dialogRef.close();
    } catch (error) {
      console.error(error);
      this.cartService.snackBar.open('Error al procesar el pedido', 'Cerrar');
    }
  }
}