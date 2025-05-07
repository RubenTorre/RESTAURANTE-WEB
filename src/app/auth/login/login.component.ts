import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { UserService } from '../../Services/user.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  showLogin = true; // Controla si se muestra el formulario de login o registro
  username: string = '';
  password: string = '';
  registerUsername: string = '';
  registerEmail: string = '';
  registerPassword: string = '';
  isLoading = false; // Controla el estado de carga
  error: string = ''; // Mensajes de error
  nombreUsuario: string = '';

  constructor(private supabaseService: SupabaseService, private router: Router,private userService: UserService, ) {}

  // Función para alternar entre login y registro
  toggleForm() {
    this.showLogin = !this.showLogin;
  }

  // Función de login
  async login() {
    this.isLoading = true;
    this.error = '';
  
    try {
      const response = await this.supabaseService.login(this.username, this.password);
  
      if (response.error) {
        await Swal.fire({
          icon: 'error',
          title: 'Verifica',
          text: response.error,
          confirmButtonColor: '#facc15',
        });
        return;
      }
  
      const data = response.data;
      if (!data || !data.user || !data.profile) {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo obtener el usuario o su perfil.',
          confirmButtonColor: '#facc15',
        });
        return;
      }
  
      const { user, profile } = data;
  
      // ✅ Guardamos nombre y rol del perfil real desde la base de datos
      const fullName = profile.nombre || user.email;
      this.userService.setNombreUsuario(fullName);
      this.userService.setRolUsuario(profile.rol);
  
      
      // Redirigir al dashboard
      this.router.navigate(['/dashboard']);
      
    } catch (err: any) {
      console.error('Error inesperado en login:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: err.message || 'Ha ocurrido un error.',
        confirmButtonColor: '#facc15',
      });
    } finally {
      this.isLoading = false;
    }
  }
  
  
  // Función de registro
  async register() {
    this.isLoading = true;
    this.error = '';

    try {
      const response = await this.supabaseService.register(this.registerEmail, this.registerPassword, this.registerUsername);

      if (response.error) {
        // Mostrar error con SweetAlert
        await Swal.fire({
          icon: 'error',
          title: 'Verifica',
          text: response.error,
          confirmButtonColor: '#facc15',
        });
        return;
      }

      // Éxito
      await Swal.fire({
        icon: 'success',
        title: '¡Registro exitoso!',
        text: 'Ya puedes iniciar sesión.',
        confirmButtonColor: '#facc15',
      });

      // Cambiar al formulario de login
      this.toggleForm();

    } catch (err: any) {
      console.error('Error inesperado en registro:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: err.message || 'Ha ocurrido un error.',
        confirmButtonColor: '#facc15',
      });
    } finally {
      this.isLoading = false;
    }
  }
  
}
