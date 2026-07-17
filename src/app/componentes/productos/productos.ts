import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, OnInit, signal } from '@angular/core';
import { Firebase } from '../../services/firebase/firebase';
import { CartService } from '../../services/cart/cart-service';
import { MatDialog } from '@angular/material/dialog';
import { DetalleProductoComponent } from './../detalle-producto-component/detalle-producto-component'
import { EditarProductoComponent } from './../editar-productos/editar-productos'
import { BannerComponent } from './../banner/banner'
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-productos',
  imports: [NgClass, BannerComponent],
  templateUrl: './productos.html',
  styleUrl: './productos.scss',
})
export class ProductosComponent implements OnInit {
  firebaseService = inject(Firebase);
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);

  // Signal exclusivo para mostrar en el HTML
  productosFiltrados = signal<any[]>([]);
  
  // Arreglo vacío que se llenará con los datos reales de Firebase
  todosLosProductos: any[] = [];

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar) {
    // ELIMINAMOS la asignación directa del Signal de Firebase aquí 
    // para evitar que el filtro altere tu estado global.
  }

async ngOnInit() {
    // 1. Nos suscribimos a los cambios de la URL PRIMERO
    this.route.paramMap.subscribe(async (params) => {
      const categoriaUrl = params.get('categoria'); 
      
      // 2. Comprobamos si los productos ya están cargados localmente
      if (this.todosLosProductos.length === 0) {
          if (isPlatformBrowser(this.platformId)) {
            await this.firebaseService.cargarProductos();
            
            // Verificamos si es Signal o array para guardarlo
            this.todosLosProductos = typeof this.firebaseService.productos === 'function' 
              ? this.firebaseService.productos() 
              : this.firebaseService.productos;
          }
      }
      
      // 3. AHORA SÍ filtramos el catálogo con seguridad
      this.filtrarCatalogo(categoriaUrl);
    });
  }

  verDetalle(producto: any) {
    this.dialog.open(DetalleProductoComponent, {
      data: producto, 
      width: '600px'
    });
  }

  async confirmarEliminacion(product: any) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await this.firebaseService.eliminarProducto(product.idProducto, product.imagenes);
        this.snackBar.open('Producto eliminado correctamente', 'Cerrar', { duration: 3000 });
        
        // Recargamos y actualizamos localmente
        await this.firebaseService.cargarProductos();
        this.todosLosProductos = typeof this.firebaseService.productos === 'function' 
          ? this.firebaseService.productos() 
          : this.firebaseService.productos;
        
        
        // Volvemos a aplicar el filtro actual de la URL
        const categoriaActual = this.route.snapshot.paramMap.get('categoria');
        this.filtrarCatalogo(categoriaActual);
      } catch (error) {
        this.snackBar.open('Error al eliminar el producto', 'Cerrar', { duration: 3000 });
      }
    }
  }

  isFavorito(idProducto: string): boolean {
    const userData = this.firebaseService.userData();
    return userData?.favoritos?.includes(idProducto) || false;
  }

  async toggleFavorito(id: string) {
    const user = this.firebaseService.currentUser();

    if (!user) {
      this.dialog.open(LoginRequeridoModalComponent, { width: '350px' });
      return;
    }

    try {
      const yaEraFavorito = this.isFavorito(id);
      await this.firebaseService.toggleFavorito(user.uid, id, yaEraFavorito);
      
      const mensaje = yaEraFavorito ? 'Eliminado de favoritos 🤍' : 'Agregado a favoritos 💖';
      this.snackBar.open(mensaje, 'Cerrar', { duration: 3000, horizontalPosition: 'center', verticalPosition: 'bottom' });
    } catch (error) {
      this.snackBar.open('Error al actualizar favoritos', 'Cerrar', { duration: 3000 });
    }
  }

  cartService = inject(CartService);

  addToCart(producto: any) {
    this.cartService.agregarAlCarrito(producto, 1);
  }

  abrirEditor(producto: any) {
    const dialogRef = this.dialog.open(EditarProductoComponent, {
      data: producto,
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(async (datos) => {
      if (datos) {
        let urlsFinales = [...datos.imagenesExistentes]; 

        if (datos.archivosNuevos.length > 0) {
          // Lógica de subir imágenes si se requiere
        }

        const updatePayload = {
          nombre: datos.nombre,
          precio: datos.precio,
          stock: datos.stock,
          descripcion: datos.descripcion,
          tipoCliente: datos.tipoCliente,
          tipoProducto: datos.tipoProducto,
          subCategoria: datos.subCategoria,
          imagenes: urlsFinales.join(',') 
        };
        
        await this.firebaseService.editarProducto(datos.idProducto, updatePayload);
        
        // Recargar el catálogo local para reflejar cambios
        await this.firebaseService.cargarProductos();
        this.todosLosProductos = typeof this.firebaseService.productos === 'function' 
          ? this.firebaseService.productos() 
          : this.firebaseService.productos;
          
        const categoriaActual = this.route.snapshot.paramMap.get('categoria');
        this.filtrarCatalogo(categoriaActual);
      }
    });
  }

filtrarCatalogo(categoria: string | null) {
    
    if (!categoria || categoria === 'todo') {
      this.productosFiltrados.set(this.todosLosProductos);
    } else {
      // AQUÍ: Si en Firestore usas 'tipoProducto' (ej. 'bolsas', 'ropa')
      const filtrados = this.todosLosProductos.filter(
        producto => 
          producto.tipoProducto === categoria || // Revisa este
          producto.categoria === categoria    || // O este
          producto.subCategoria === categoria    // O este
      );
      
      this.productosFiltrados.set(filtrados);
    }
  }
}

@Component({
  selector: 'app-login-requerido-modal',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="fw-bold">Inicia sesión</h2>
    <mat-dialog-content>
      <p>Debes estar registrado y haber iniciado sesión para guardar productos en tus favoritos.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Entendido</button>
    </mat-dialog-actions>
  `
})
export class LoginRequeridoModalComponent { }