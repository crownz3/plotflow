import { Injectable, signal } from '@angular/core';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
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
    // 1. Initialize or reuse existing Firebase app singleton
    this.app = getApps().length > 0 ? getApp() : initializeApp(environment.firebase);

    // 2. Initialize Cloud Firestore with multi-tab IndexedDB offline persistence
    try {
      this.firestore = initializeFirestore(this.app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch {
      // If Firestore is already initialized in this tab/process, retrieve the instance
      this.firestore = getFirestore(this.app);
    }

    // 3. Initialize Firebase Auth
    this.auth = getAuth(this.app);

    // 4. Google Auth Provider for Broker Accounts
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    // 5. Connect Firebase Auth state listener
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        console.log('✅ Firebase Auth authenticated user:', user.uid, user.email || '(anonymous)');
      }
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
