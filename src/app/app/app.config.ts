import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';

export const firebaseConfig = {
    apiKey: "AIzaSyC7tdpXaE5bwRFPb8HLOHNtF0lf_skt7Ss",
    authDomain: "bolsos-665b1.firebaseapp.com",
    projectId: "bolsos-665b1",
    storageBucket: "bolsos-665b1.firebasestorage.app",
    messagingSenderId: "796560660034",
    appId: "1:796560660034:web:7f529b4ed27314e0afbfdb",
    measurementId: "G-K3RYL1GL6Z"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), 
    provideClientHydration(withEventReplay()),

    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideAnimations()
  ]
};
