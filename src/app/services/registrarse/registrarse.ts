import { inject, Service } from '@angular/core';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { doc, Firestore, setDoc } from '@angular/fire/firestore';

@Service()
export class RegistrarseService {

  private authService = inject(Auth);
  private authFireStore = inject(Firestore);

  // Método para registrar
  async register(email: string, pass: string, name: string, number: string, direccion: string, indicaciones: string, tipoCliente: string) {
    const userCredential = await createUserWithEmailAndPassword(this.authService, email, pass);
    const user = userCredential.user;

// 2. Guardar los datos extra en Firestore, usando el UID del usuario como ID del documento
    const userDocRef = doc(this.authFireStore, 'usuarios', user.uid);
    
    await setDoc(userDocRef, {
      nombre: name,
      telefono: number,
      direccion: direccion,
      rol: tipoCliente,
      email: email, // Guardamos el email también por referencia
      fechaRegistro: new Date(),
      indicaciones: indicaciones
    });

    return user;
  }
}
