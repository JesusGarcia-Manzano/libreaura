import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { Firebase } from './../firebase/firebase';
import { MatSnackBar } from '@angular/material/snack-bar';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class CartService {
    carrito = signal<any[]>([]);
    firebaseService = inject(Firebase);
    snackBar = inject(MatSnackBar);

    private platformId = inject(PLATFORM_ID);

    constructor() {
        // 4. Verificamos si estamos en el navegador antes de acceder a localStorage
        if (isPlatformBrowser(this.platformId)) {
            const guardado = localStorage.getItem('carritoStore');
            if (guardado) {
                this.carrito.set(JSON.parse(guardado));
            }
        }

        // El effect no debería dar error porque se ejecuta después, 
        // pero también puedes protegerlo si accedes a localStorage dentro
        effect(() => {
            const user = this.firebaseService.currentUser();
            const userData = this.firebaseService.userData();

            if (user && userData && userData.carrito) {
                this.carrito.set(userData.carrito);
                // También protege esta línea
                if (isPlatformBrowser(this.platformId)) {
                    localStorage.setItem('carritoStore', JSON.stringify(userData.carrito));
                }
            }
        });
    }

    // REQ 1 y 2: Agregar producto (por defecto 1, o la cantidad que mande el detalle)
    agregarAlCarrito(producto: any, cantidad: number) {
        let actual = [...this.carrito()];
        console.log("1.- actual -> ", actual);

        let index = actual.findIndex(item => item.idProducto === producto.id);

        if (index !== -1) {
            // Si ya existe, sumamos
            let nuevaCantidad = actual[index].cantidad + cantidad;

            if (nuevaCantidad > producto.stock) {
                nuevaCantidad = producto.stock;
                this.snackBar.open('Límite de stock alcanzado', 'Cerrar', { duration: 3000 });
            }
            actual[index].cantidad = nuevaCantidad;
            actual[index].totaProducto = actual[index].precio * nuevaCantidad
        } else {
            // Si es nuevo en el carrito

            actual.push({
                idProducto: producto.id,
                cantidad: Math.min(cantidad, producto.stock),
                precio: producto.precio,
                imagen: producto.imagenes,
                nombre: producto.nombre,
                stock: producto.stock,
                totaProducto: producto.precio * cantidad
            });
        }

        this.guardarEstado(actual);
        this.snackBar.open(`Se agregó ${cantidad} ${producto.nombre} al carrito`, 'Cerrar', { duration: 2000 });
    }

    // REQ 5 y 6: Botones + y - en el carrito
    // En cart-service.ts dentro del método actualizarCantidad

    actualizarCantidad(idProducto: string, operacion: number, stockActual: number) {
        let actual = [...this.carrito()];
        let index = actual.findIndex(item => item.idProducto === idProducto);

        if (index !== -1) {
            let nuevaCantidad = actual[index].cantidad + operacion;

            if (nuevaCantidad > stockActual) {
                this.snackBar.open('Ya llegaste al tope de stock disponible', 'Cerrar', { duration: 3000 });
                return;
            }

            // Si llega a 0, se elimina
            if (nuevaCantidad <= 0) {
                actual.splice(index, 1);
            } else {
                actual[index].cantidad = nuevaCantidad;
                // AQUÍ ESTÁ LA CORRECCIÓN: Actualizamos el total del producto
                actual[index].totaProducto = actual[index].precio * nuevaCantidad;
            }
            this.guardarEstado(actual);
        }
    }

    // REQ 7: Botón eliminar
    eliminarDelCarrito(idProducto: string) {
        let actual = this.carrito().filter(item => item.idProducto !== idProducto);
        this.guardarEstado(actual);
    }

    vaciarCarrito() {
        this.guardarEstado([]);
    }

    // Persiste en local y, si hay sesión, en Firebase
    private guardarEstado(nuevoCarrito: any[]) {
        this.carrito.set(nuevoCarrito);

        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('carritoStore', JSON.stringify(nuevoCarrito));
        }

        const user = this.firebaseService.currentUser();
        if (user) {
            this.firebaseService.actualizarCarritoUsuario(user.uid, nuevoCarrito);
        }
    }

    calcularTotal() {
        return this.carrito().reduce((total, item) => total + (item.precio * item.cantidad), 0);
    }

}
