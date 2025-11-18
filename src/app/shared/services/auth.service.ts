import { Injectable, inject } from '@angular/core';
import {
  Auth,
  authState,
  signInWithEmailAndPassword,
  signOut
} from '@angular/fire/auth';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = inject(Auth);

  /** Usuario crudo de Firebase */
  user$ = authState(this.auth);

  /** Estado booleano */
  isLoggedIn$: Observable<boolean> = this.user$.pipe(
    map(user => !!user)
  );

  /** Email del usuario admin */
  adminEmail$: Observable<string | null> = this.user$.pipe(
    map(u => u?.email ?? null)
  );

  /** Login */
  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  /** Logout */
  logout() {
    return signOut(this.auth);
  }
}
