import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideAuth, getAuth } from '@angular/fire/auth';

import { FormsModule } from '@angular/forms';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    // RUTAS
    provideRouter(routes),

    // FIREBASE APP
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    // FIRESTORE
    provideFirestore(() => getFirestore()),

    // STORAGE
    provideStorage(() => getStorage()),

    // AUTH
    provideAuth(() => getAuth()),

    // FORMS MODULE (necesario para ngModel en componentes standalone)
    importProvidersFrom(FormsModule),
  ]
};
