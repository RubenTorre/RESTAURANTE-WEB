import { Component } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
interface Usuario {
  id:string;
  email: string;
  nombre: string;
  rol: string;
  created_at: string;
  activo:boolean;
}


@Component({
  selector: 'app-usuarios',
  imports: [CommonModule,FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export default class UsuariosComponent {
  usuarios: Usuario[] = [];

  usuarioEditando: any = null;
  username: string = '';
  password: string = '';
  registerUsername: string = '';
  registerEmail: string = '';
  registerPassword: string = '';
  isLoading = false; // Controla el estado de carga
  error: string = ''; // Mensajes de error
  nombreUsuario: string = '';
 // Variables del modal
 showRegisterModal = false;
 mostrarContrasena: boolean = false;
 usuariosActivos: Usuario[] = [];
usuariosDesactivados: Usuario[] = [];



  constructor(private supabaseService: SupabaseService) {}

  ngOnInit() {
    this.cargarUsuarios();
  }
  
  async cargarUsuarios() {
    const usuarios = await this.supabaseService.obtenerUsuarios();
  
    // Orden original (lo que ya tenías)
    this.usuarios = usuarios.sort((a: Usuario, b: Usuario) => {
      if (a.rol === 'administrador' && b.rol !== 'administrador') return -1;
      if (a.rol !== 'administrador' && b.rol === 'administrador') return 1;
      return 0;
     
    });
     console.log(usuarios)
  
    // Filtrar por estado activo/desactivado
    this.usuariosActivos = this.usuarios.filter(u => u.activo);
    this.usuariosDesactivados = this.usuarios.filter(u => !u.activo);
  }
  
  
  
  editarUsuario(usuario: any) {
    this.usuarioEditando = { ...usuario }; // Copia los datos para editarlos
  }
  async guardarCambios() {
    try {
      await this.supabaseService.actualizarUsuario(this.usuarioEditando.id, {
        nombre: this.usuarioEditando.nombre,
        rol: this.usuarioEditando.rol,
      });
      this.usuarioEditando = null;
      this.cargarUsuarios(); // Recarga la lista de usuarios
    } catch (error) {
      console.error('No se pudo actualizar el usuario:', error);
    }
  }
  cancelarEdicion() {
    this.usuarioEditando = null;
  }
 // Función para abrir el modal
 abrirModalRegistro() {
  this.showRegisterModal = true;
}

// Función para cerrar el modal
cancelarRegistro() {
  this.showRegisterModal = false;
}
  // Función de registro
    async register() {
      this.isLoading = true;
      this.error = '';
  
      try {
        const response = await this.supabaseService.register(this.registerEmail, this.registerPassword, this.registerUsername, true);
  
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
        this.cancelarRegistro();
        this.cargarUsuarios();
  
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
    
    async eliminarUsuario(usuario: Usuario) {
      const resultado = await Swal.fire({
        title: '¿Estás seguro?',
        text: `Desactivar al usuario "${usuario.nombre}" es irreversible.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, desactivar',
        cancelButtonText: 'Cancelar'
      });
    
      if (!resultado.isConfirmed) return;
    
      try {
        // Llama a la función para desactivar el usuario
        await this.supabaseService.desactivarUsuarioPorId(usuario.id);
        // Filtra el usuario desactivado de la lista de usuarios, o haz cualquier actualización que necesites
        this.usuarios = this.usuarios.filter(u => u.id !== usuario.id);
    
        await Swal.fire({
          title: '¡Desactivado!',
          text: 'El usuario ha sido desactivado correctamente.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        this.cargarUsuarios();
      } catch (error) {
        const err = error as Error;
    
        await Swal.fire({
          title: 'Error',
          text: err.message || 'No se pudo desactivar el usuario.',
          icon: 'error'
        });
      }
    }
    
    async activarUsuario(usuario: Usuario) {
      const { error } = await this.supabaseService.actualizarEstadoUsuario(usuario.id, true);
    
      if (error) {
        await Swal.fire({
          title: 'Error',
          text: error.message || 'No se pudo activar el usuario.',
          icon: 'error'
        });
        return;
      }
    
      // Mueve el usuario a la lista de activos
      this.usuariosDesactivados = this.usuariosDesactivados.filter(u => u.id !== usuario.id);
      this.usuariosActivos.push({ ...usuario, activo: true });
    
      await Swal.fire({
        title: 'Activado',
        text: `El usuario "${usuario.nombre}" ha sido activado.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      this.cargarUsuarios();
    }
    
    
}
