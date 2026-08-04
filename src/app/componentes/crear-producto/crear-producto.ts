import { Component, inject, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { Firebase } from '../../services/firebase/firebase';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-crear-producto',
  imports: [CommonModule, FormsModule, MatDialogModule],

  templateUrl: './crear-producto.html',
  styleUrl: './crear-producto.scss',
})
export class CrearProductoComponent {
  firebase = inject(Firebase);
  cantidad: number = 1;
  productos: any[] = [];
  formularioListo: boolean = false;
  guardando: boolean = false;
  dialogRef = inject(MatDialogRef<CrearProductoComponent>);
  private dialog = inject(MatDialog);

  iniciarFormulario() {

    if (this.cantidad > 0) {
      this.productos = Array.from({ length: this.cantidad }, () => ({
        descripcion: '', idProducto: "", imagenes: '', nombre: '',
        precio: 0, stock: 0, subCategoria: '', tipoCliente: '', tipoProducto: '',
        archivosTemporales: []
      }));
      this.formularioListo = true; // Cambiamos el estado
    }
  }

  // Captura los archivos cuando el usuario los selecciona en el input
  seleccionarImagenes(producto: any, event: any) {
    if (event.target.files) {
      // Convertimos los archivos a un arreglo real y lo guardamos temporalmente en el producto
      producto.archivosTemporales = Array.from(event.target.files);
    }
  }

  // Nueva función para manejar los checkboxes de subcategoría
  toggleSubCategoria(producto: any, subCat: string, event: any) {
    // Convertimos el string actual en un array para manipularlo fácil
    let actuales = producto.subCategoria
      ? producto.subCategoria.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      : [];

    if (event.target.checked) {
      actuales.push(subCat); // Agregamos si se marca
    } else {
      actuales = actuales.filter((s: string) => s !== subCat); // Quitamos si se desmarca
    }

    // Lo volvemos a unir como texto
    producto.subCategoria = actuales.join(', ');
  }

  async guardarProductos() {
    this.guardando = true; // Iniciamos estado de carga
    try {
      for (const p of this.productos) {
        let sku = "SKU-" + Math.floor(Math.random() * 10000000000);
        p.idProducto = sku
        let urlsDescarga: string[] = [];
        // 1. Subimos cada archivo a Storage y obtenemos su URL
        for (const archivo of p.archivosTemporales) {
          const url = await this.firebase.subirArchivoStorage(archivo);
          urlsDescarga.push(url);
        }

        // 2. Unimos las URLs por comas y lo asignamos al campo oficial 'imagenes'
        p.imagenes = urlsDescarga.join(',');

        // 3. Limpiamos propiedades temporales que NO deben ir a la base de datos
        const productoParaGuardar = { ...p };
        delete productoParaGuardar.archivosTemporales;

        // 4. Guardamos en Firestore

        await this.firebase.agregarProducto(productoParaGuardar);
      }

      this.dialog.open(ModalExitoComponent, {
        data: { mensaje: '¡Productos guardados con éxito!', tipo: '¡Éxito!"' }
      });
      this.dialogRef.close(); // Cerramos el modal

    } catch (error) {
      console.error("Error al guardar:", error);
      this.dialog.open(ModalExitoComponent, {
        data: { mensaje: '¡Problemas al crear el producto!', tipo: '¡Error!' }
      });
    } finally {
      this.guardando = false;
    }
  }

}

@Component({
  selector: 'app-modal-exito',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.tipo }}</h2>
    <mat-dialog-content>
      <p>{{ data.mensaje }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `
})
export class ModalExitoComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { mensaje: string, tipo: string }
  ) { }
}