import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { RegistrarseService } from './../../services/registrarse/registrarse'
import { MatSelectModule } from '@angular/material/select'
import { ErrorModalComponent } from "./../error-modal/error-modal";
import { MatDialog } from '@angular/material/dialog';


@Component({
  selector: 'app-registrarse',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, RouterLink],
  templateUrl: './registrarse.html',
  styleUrl: './registrarse.scss',
})
export class RegistrarseComponent {
  private fb = inject(FormBuilder)
  constructor(private authService: RegistrarseService, private router: Router, private dialog: MatDialog) {

  }

  registerForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    name: ['', [Validators.required]],
    number: ['', [Validators.required]],
    direccion: ['', [Validators.required]],
    indicaciones: ['', [Validators.required]],
    tipoCliente: ['', [Validators.required]]
  });

  async onRegister() {
    if (this.registerForm.valid) {

      const { email, password, name, number, direccion, indicaciones, tipoCliente } = this.registerForm.value;
      try {
        await this.authService.register(email, password, name, number, direccion, indicaciones, tipoCliente);
        this.mostrarError(this.traducirErrorFirebase("exito"));
        this.router.navigate(['/home']); // Redirigir al home
      } catch (error: any) {
        this.mostrarError(this.traducirErrorFirebase(error.code));
      }
    }
  }

  mostrarError(dataObj: object) {
    this.dialog.open(ErrorModalComponent, {
      data: dataObj,
      width: '400px', // Puedes ajustar el ancho
      disableClose: false // Permite cerrar haciendo clic afuera
    });
  }

  // Opcional: Un pequeño traductor para que los errores no salgan en inglés o con códigos feos
  traducirErrorFirebase(codigo: string): object {
    switch (codigo) {
      case 'auth/email-already-in-use':
        return {
          mensaje: 'Este correo electrónico ya está registrado.',
          mode: "#FFEB3B",
          icono: "warning",
          textoLabel: "Alerta"
        };

      case 'auth/weak-password':
        return {
          mensaje: 'La contraseña es muy débil. Debe tener al menos 6 caracteres.',
          mode: "#FFEB3B",
          icono: "warning",
          textoLabel: "Alerta"
        };

      case 'auth/invalid-email':
        return {
          mensaje: 'El formato del correo electrónico no es válido.',
          mode: "#FFEB3B",
          icono: "warning",
          textoLabel: "Alerta"
        };

      case "exito":
        return {
          mensaje: "Usuario registrado con exito",
          mode: "#5cb85c",
          icono: "done_outline",
          textoLabel: "Felicidades"
        };

      default:
        return {
          mensaje: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
          mode: "#EF4444",
          icono: "error",
          textoLabel: "Error"
        };

    }
  }
}
