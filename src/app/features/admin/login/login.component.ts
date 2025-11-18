import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  email = '';
  password = '';
  loading = false;
  errorMsg = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.auth.isLoggedIn$
      .pipe(take(1))
      .subscribe((isLogged) => {
        if (isLogged) {
          this.router.navigate(['/admin/productos']);
        }
      });
  }

  async login() {
    this.errorMsg = '';
    this.loading = true;

    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/admin/productos']);
    } catch (err: any) {
      this.errorMsg = 'Credenciales incorrectas.';
    }

    this.loading = false;
  }
}
