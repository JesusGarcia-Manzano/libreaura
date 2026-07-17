import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ChangeDetectorRef } from '@angular/core';
import { ViewChild } from '@angular/core';
import { MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-editar-producto',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatSelectModule,
    MatCheckboxModule,
    FormsModule
  ],
  templateUrl: './editar-productos.html',
  styleUrl: './editar-productos.scss'
})
export class EditarProductoComponent {
  @ViewChild('miSelect') miSelect!: MatSelect;
  editForm: FormGroup;
  imagenesActuales: string[] = [];
  imagenesParaBorrar: string[] = [];

  archivosNuevos: File[] = [];
  vistasPreviasNuevas: string[] = [];
  estilosBolso = [
      { valor: 'elegante', etiqueta: 'Elegante' },
      { valor: 'casual', etiqueta: 'Casual' },
      { valor: 'mochila', etiqueta: 'Mochila' },
      { valor: 'cartera', etiqueta: 'Cartera' },
      { valor: 'divertida', etiqueta: 'Divertida' },
      { valor: 'alternativa', etiqueta: 'Alternativa' },
      { valor: 'personalizado', etiqueta: 'Personalizado' }
    ];

  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef)
  constructor(
    public dialogRef: MatDialogRef<EditarProductoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any // Recibe el producto completo
  ) {

    let subCategoriasIniciales = [];
    if (this.data.subCategoria) {
      if (Array.isArray(this.data.subCategoria)) {
        subCategoriasIniciales = this.data.subCategoria;
      } else if (typeof this.data.subCategoria === 'string') {
        subCategoriasIniciales = this.data.subCategoria.split(',').map((v: string) => v.trim());
      }
    }
    // 1. Inicializar el formulario con los datos recibidos
    this.editForm = this.fb.group({
      idProducto: [this.data.idProducto],
      descripcion: [this.data.descripcion],
      imagenes: [this.data.imagenes],
      nombre: [this.data.nombre, Validators.required],
      precio: [this.data.precio, Validators.required],
      stock: [this.data.stock, Validators.required],
      subCategoria: [subCategoriasIniciales],
      tipoCliente: [this.data.tipoCliente],
      tipoProducto: [this.data.tipoProducto]
    });

    // 2. Lógica que antes estaba en prepararEdicion()
    console.log("this.data -> ", this.data);
    if (this.data.imagenes) {
      this.imagenesActuales = this.data.imagenes.split(',').filter((url: string) => url.trim() !== '');
    }
    // Forzar detección tras inicializar
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

// --- Lógica para imágenes antiguas ---
eliminarImagen(index: number) {
  // Guardamos la URL antes de quitarla del array de visualización
  const urlABorrar = this.imagenesActuales[index];
  this.imagenesParaBorrar.push(urlABorrar);
  
  // La quitamos de la vista
  this.imagenesActuales.splice(index, 1);
}

// --- Lógica para imágenes nuevas ---
  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach(file => {
        this.archivosNuevos.push(file);

        // Crear previsualización local para la vista
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.vistasPreviasNuevas.push(e.target.result);
        };
        reader.readAsDataURL(file);
      });
    }
    // Limpiar el input para permitir seleccionar el mismo archivo si se elimina
    input.value = '';
  }

eliminarImagenNueva(index: number) {
    this.archivosNuevos.splice(index, 1);
    this.vistasPreviasNuevas.splice(index, 1);
  }

guardar() {
  if (this.editForm.valid) {
    // Obtenemos los valores actuales
    const valoresFormulario = this.editForm.value;
    // Convertimos el array a string antes de enviar
    if (Array.isArray(valoresFormulario.subCategoria)) {
      valoresFormulario.subCategoria = valoresFormulario.subCategoria.join(',');
    }
    
    const datosListos = {
      ...valoresFormulario,
      imagenesExistentes: this.imagenesActuales,
      archivosNuevos: this.archivosNuevos
    };
    
    this.dialogRef.close(datosListos);
  }
}

// Método único para actualizar cualquiera de los dos
onSelectChange() {
  // Simplemente marcamos para detección de cambios
  this.cdr.detectChanges();
}

onCheckboxChange(valor: string, isChecked: boolean) {
    const subCatControl = this.editForm.get('subCategoria');
    
    // 1. Obtenemos el valor actual y garantizamos que sea un arreglo
    let valoresActuales = subCatControl?.value;
    
    if (!valoresActuales) {
      valoresActuales = [];
    } else if (typeof valoresActuales === 'string') {
      valoresActuales = valoresActuales.split(',').map((v: string) => v.trim()).filter((v: string) => v !== '');
    }

    // 2. Lógica para agregar o quitar (permitiendo múltiples)
    let nuevosValores: string[];
    
    if (isChecked) {
      // Si se marca, creamos un nuevo arreglo combinando los que ya estaban + el nuevo
      // Usamos Set para evitar duplicados por si acaso
      nuevosValores = [...new Set([...valoresActuales, valor])]; 
    } else {
      // Si se desmarca, filtramos para quitar solo ese valor
      nuevosValores = valoresActuales.filter((v: string) => v !== valor);
    }

    // 3. Guardamos el arreglo con los múltiples valores en el formulario
    subCatControl?.setValue(nuevosValores);
    
    // EXTRA: Agrega este console.log para que veas en tu navegador (F12) 
    // cómo se va armando el arreglo con múltiples opciones ej: ['casual', 'elegante', 'mochila']
    console.log('Subcategorías seleccionadas:', subCatControl?.value);
  }

  isChecked(valor: string): boolean {
      const valoresActuales = this.editForm.get('subCategoria')?.value;
      if (!valoresActuales) return false;
      
      if (typeof valoresActuales === 'string') {
        return valoresActuales.includes(valor);
      }
      return valoresActuales.includes(valor);
    }

onTipoProductoChange(valor: any) {
    this.editForm.get('tipoProducto')?.setValue(valor);

    // 2. Fuerza al componente a actualizar su estado visual
    if (this.miSelect) {
      this.miSelect.stateChanges.next();
    }
    
    this.cdr.detectChanges();
  }

}