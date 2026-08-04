import { Component, inject, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Firebase } from '../../services/firebase/firebase';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DetalleProductoComponent } from '../detalle-producto-component/detalle-producto-component';

@Component({
  selector: 'app-favoritos',
  imports: [NgClass, RouterLink],
  templateUrl: './favoritos.html',
  styleUrl: './favoritos.scss',
})
export class FavoritosComponent implements OnInit {
  firebaseService = inject(Firebase);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // SEÑAL COMPUTADA: Se actualiza sola cuando cambian los productos o los favoritos del usuario
  productosFavoritos = computed(() => {
    const todosLosProductos = this.firebaseService.productos();
    const idsFavoritos = this.firebaseService.userData()?.favoritos || [];

    // Filtramos para dejar únicamente los productos cuyo ID esté en la lista de favoritos
    return todosLosProductos.filter(producto => idsFavoritos.includes(producto.id));
  });

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Aseguramos que la lista global de productos esté cargada
      await this.firebaseService.cargarProductos();
    }
  }

  verDetalle(producto: any) {
    this.dialog.open(DetalleProductoComponent, {
      data: producto,
      width: '600px'
    });
  }

  isFavorito(idProducto: string): boolean {
    const userData = this.firebaseService.userData();
    return userData?.favoritos?.includes(idProducto) || false;
  }

  async toggleFavorito(id: string) {
    const user = this.firebaseService.currentUser();
    if (!user) return;

    try {
      const yaEraFavorito = this.isFavorito(id);

      // Llama a la función que modificamos en tu servicio de Firebase
      await this.firebaseService.toggleFavorito(user.uid, id, yaEraFavorito);

      const mensaje = yaEraFavorito ? 'Eliminado de favoritos 🤍' : 'Agregado a favoritos 💖';
      this.snackBar.open(mensaje, 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    } catch (error) {
      this.snackBar.open('Error al actualizar favoritos', 'Cerrar', { duration: 3000 });
    }
  }

  async addToCart(id: string) {
    console.log('Agregado al carrito desde favoritos:', id);
    // Aquí mandas a llamar tu lógica del carrito
  }
}
