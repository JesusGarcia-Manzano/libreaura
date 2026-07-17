import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { LoginService } from './../../services/login/login'
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {

  loginForm: FormGroup;

constructor(private fb: FormBuilder,
            private authService: LoginService,
            private router: Router
) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      console.log("email- > ", email)
      console.log("password -> ", password)
      try {
        await this.authService.login(email, password);
        this.router.navigate(['/home']);
        // Navegar a la home después del login
      } catch (e) {
        console.error('Error de acceso:', e);
      }
    }
  }

}
