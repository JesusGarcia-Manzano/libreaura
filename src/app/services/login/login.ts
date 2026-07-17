import { ApplicationConfig, inject, Service } from '@angular/core';

import { firebaseConfig } from '../../app/app.config'

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { Auth, authState, getAuth, provideAuth } from '@angular/fire/auth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth())
  ]
};

@Service()
export class LoginService {

private auth = inject(Auth); // Usamos inject para las nuevas versiones de Angular

  login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  register(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  logout() {
    return signOut(this.auth);
  }

 private user = inject(Auth);

  // Esto devuelve un observable que emite el usuario (o null si no hay)
  get getUser() {
    return authState(this.user);
  }

}
