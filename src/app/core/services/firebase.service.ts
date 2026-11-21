import { Injectable, signal } from '@angular/core';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  readonly app: FirebaseApp;
  readonly firestore: Firestore;
  readonly auth: Auth;
  readonly googleProvider: GoogleAuthProvider;
  readonly isReady = signal<boolean>(false);

  constructor() {
    // Initialize or reuse existing Firebase app singleton
    this.app = getApps().length > 0 ? getApp() : initializeApp(environment.firebase);
    this.firestore = getFirestore(this.app);
    this.auth = getAuth(this.app);

    // Google Auth provider — restricted to @gmail.com accounts
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.setCustomParameters({
      hd: 'gmail.com',   // hint: Google accounts only
      prompt: 'select_account'
    });

    // Enable offline persistence for field agents with spotty connectivity
    enableIndexedDbPersistence(this.firestore).catch(() => {
      // Persistence unavailable in this environment — silent fallback to online mode
    });

    this.isReady.set(true);
  }

  getProjectId(): string {
    return environment.firebase.projectId;
  }

  getAuthDomain(): string {
    return environment.firebase.authDomain;
  }
}
