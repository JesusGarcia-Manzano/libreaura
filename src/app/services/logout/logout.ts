// En tu archivo: services/firebase/firebase.ts
import { inject, Injectable } from '@angular/core';
import { Auth, signOut } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class LogoutService {
  private auth = inject(Auth);

  async cerrarSesion() {
    try {
      await signOut(this.auth);
      // Firebase disparará automáticamente authState, 
      // lo que actualizará tus observables y señales en toda la app.
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }
}