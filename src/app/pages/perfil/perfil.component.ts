import { Component } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { UserService } from '../../Services/user.service';

@Component({
  selector: 'app-perfil',
  imports: [CommonModule,FormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export default class PerfilComponent {
  usuario: any = null;
  perfil: any = null;
  exito: string | null = null;
  error: string | null = null;

  // Para almacenar las contraseñas
  nuevaContrasenia: string = '';
  confirmacionContrasenia: string = '';
  verContrasenia: boolean = false;
verConfirmacion: boolean = false;

  // Para editar el perfil
  editandoPerfil: boolean = false;
  nuevoNombre: string = '';
  nuevoEmail: string = '';
  constructor(private supabaseService: SupabaseService, private userService: UserService) {}

  
  
  async ngOnInit() {
    try {
      this.usuario = await this.supabaseService.getUsuarioActual(); // obtiene el auth.user
      this.perfil = await this.supabaseService.obtenerPerfilDeUsuario(this.usuario.id); // usa ese ID para buscar en profiles
    } catch (error: any) {
      console.error('Error en ngOnInit:', error.message);
    }
  }
// Método para editar el perfil
editarPerfil() {
  this.editandoPerfil = true;
  this.nuevoNombre = this.perfil?.nombre || '';
  this.nuevoEmail = this.usuario?.email || '';
}


// Guardar cambios en el perfil
async guardarCambios() {
  let cambiosRealizados = false;

  try {
    // Validación y cambio de contraseña
    if (this.nuevaContrasenia || this.confirmacionContrasenia) {
      if (this.nuevaContrasenia !== this.confirmacionContrasenia) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Las contraseñas no coinciden.',
        });
        return;
      }

      const response = await this.supabaseService.cambiarContraseña(this.nuevaContrasenia) as {
        error?: { message?: string } | string;
      };

      if (response.error) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error.message || 'Error al cambiar la contraseña.'
        );
      }

      cambiosRealizados = true;
    }

    // Cambios en nombre (reutilizando actualizarUsuario)
    if (this.perfil.nombre.trim() !== this.nuevoNombre.trim()) {
      await this.supabaseService.actualizarPerfil(this.usuario.id, {
        nombre: this.nuevoNombre,
        
      });

      this.perfil.nombre = this.nuevoNombre;
      this.userService.setNombreUsuario(this.nuevoNombre);
      cambiosRealizados = true;
    }

    // Cambios en correo
    if (this.usuario.email !== this.nuevoEmail) {
      const responseCorreo = await this.supabaseService.cambiarCorreo(this.nuevoEmail);

      if (responseCorreo.message && responseCorreo.message !== '') {
        Swal.fire({
          icon: 'success',
          title: '¡Correo electrónico actualizado!',
          text: 'Verifica tu nuevo correo electrónico.',
        });

        this.usuario.email = this.nuevoEmail;
        cambiosRealizados = true;
      } else {
        throw new Error('Hubo un error al actualizar el correo electrónico.');
      }
    }

    if (cambiosRealizados) {
      Swal.fire({
        icon: 'success',
        title: '¡Cambios guardados!',
        text: 'Tu perfil se actualizó correctamente.',
        timer: 2500,
        toast: true,
        showConfirmButton: false,
        position: 'top-end',
      });
      this.editandoPerfil = false;
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Sin cambios',
        text: 'No realizaste ningún cambio.',
      });
    }
  } catch (error: any) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Hubo un error al guardar los cambios.',
    });
  }
}




// Método para cambiar la contraseña
async cambiarContrasenia() {
  if (this.nuevaContrasenia !== this.confirmacionContrasenia) {
    this.error = 'Las contraseñas no coinciden.';
    return;
  }

  try {
    const response = await this.supabaseService.cambiarContraseña(this.nuevaContrasenia);
    if (response.error) {
      this.error = response.error;
    } else {
      this.exito = 'Contraseña actualizada correctamente.';
    }
  } catch (error: any) {
    console.error('Error al cambiar la contraseña:', error.message);
    this.error = 'Hubo un error al cambiar la contraseña.';
  }
}

// Método para alternar la visibilidad de las contraseñas
togglePasswordVisibility(id: string) {
  const input = document.getElementById(id) as HTMLInputElement;
  input.type = input.type === 'password' ? 'text' : 'password';
}
cerrarModal() {
  this.editandoPerfil = false;
  // También puedes limpiar los campos si deseas
  this.nuevoNombre = this.perfil?.nombre || '';
  this.nuevoEmail = this.usuario?.email || '';
  this.nuevaContrasenia = '';
  this.confirmacionContrasenia = '';
  this.exito = null;
  this.error = null;
}

}