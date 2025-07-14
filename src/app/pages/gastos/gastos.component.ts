import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../Services/supabase.service';
import Swal from 'sweetalert2';
import { UserService } from '../../Services/user.service';

@Component({
  selector: 'app-gastos',
  imports: [CommonModule, FormsModule],
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.css']
})
export default class GastosComponent {
  // Datos del formulario
  categoria: string = '';
  descripcion: string = '';
  monto: number | null = null;
  fecha: string = '';
  metodo_pago: string = '';
  factura: string = '';
  comentarios: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  filtroCategoria: string = '';
  filtroMes: string = '';
  busquedaTexto: string = '';
  isEditing = false;
  gastoEdicion: any = {};
  rolUsuario: string = '';
   proveedor :string='';
   nombre: string = '';
ruc: string = '';
telefono: string = '';
email: string = '';
direccion: string = '';
contacto_nombre: string = '';
modalAbierto = false;
  proveedores: any[] = []; 
nuevoProveedor = {
  nombre: '',
  ruc: '',
  telefono: '',
  email: '',
  direccion: '',
  contacto_nombre: ''
};
proveedorBusqueda: string = '';        // texto que escribes en el input
proveedoresFiltrados: any[] = [];      // lista que se muestra filtrada
mostrarListaProveedores: boolean = false;
usuarios: any[] = [];
elementosDropdown: any[] = [];
elementosFiltrados: any[] = [];
mostrarListaElementos: boolean = false;
busquedaElemento: string = '';
elementoSeleccionado: any = null;


  // Inicializamos gastos como un arreglo vacío
  gastos: any[] = [];  // Cambiado a un arreglo vacío

  constructor(private supabaseService: SupabaseService, private userService: UserService) { }
  // Cargar los gastos al iniciar el componente
  ngOnInit() {
    this.obtenerGastos(); 
     this.cargarDatosDropdown();
    this.userService.rolUsuario$.subscribe(rol => {
      this.rolUsuario = rol;
      console.log('Rol del usuario:', this.rolUsuario);
    });
  }
  // Método que maneja el envío del formulario
  async onSubmit() {
    // Validación de campos obligatorios
    if (!this.categoria || !this.monto || !this.metodo_pago) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, complete todos los campos obligatorios.'
      });
      return;
    }

    // Crear objeto gasto con datos del formulario
    const gasto = {
      categoria: this.categoria,
      descripcion: this.descripcion || null,  // Si no hay descripción, lo dejamos como null
      monto: this.monto,
      fecha: new Date().toISOString().split('T')[0], // Fecha automática
      proveedor: this.elementoSeleccionado ? this.elementoSeleccionado.nombre : null,
      metodo_pago: this.metodo_pago || null,       // Lo mismo con metodo_pago
      factura: this.factura || null,               // Lo mismo con factura
      comentarios: this.comentarios || null        // Lo mismo con comentarios
    };

    try {
      // Llamada al servicio para registrar el gasto
      const resultado = await this.supabaseService.registrarGasto(gasto);

      if (resultado.error) {
        // Error al registrar el gasto
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `Error al registrar el gasto: ${resultado.error.message || resultado.error}`
        });
      } else {
        // Éxito al registrar el gasto
        Swal.fire({
          icon: 'success',
          title: 'Gasto registrado',
          text: 'El gasto fue registrado con éxito.'
        });
        this.obtenerGastos();
      }

      // Limpiar formulario después de registrar el gasto
      this.limpiarFormulario();
    } catch (error) {
      // Manejo de errores inesperados
      console.error("Error al registrar el gasto:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error de sistema',
        text: 'Hubo un error inesperado al registrar el gasto.'
      });
    }
  }
  // Limpiar el formulario
  limpiarFormulario() {
    this.categoria = '';
    this.descripcion = '';
    this.monto = null;
    this.fecha = '';
    this.elementoSeleccionado = '';
    this.metodo_pago = '';
    this.factura = '';
    this.comentarios = '';
  }

  // Método para obtener todos los gastos registrados
  async obtenerGastos() {
    try {
      const resultado = await this.supabaseService.obtenerGastos();
      if (resultado.error) {
        console.error('Error al obtener los gastos:', resultado.error);
      } else {
        this.gastos = resultado.data || [];
      }
    } catch (error) {
      console.error('Error al obtener los gastos:', error);
    }
  }

  // Paginación: calcular los gastos actuales que se deben mostrar
  get paginatedGastos() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.gastosFiltrados.slice(startIndex, endIndex);  // Aplica paginación sobre filtrados
  }

  // Cambiar de página
  setPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // Obtener el número total de páginas
  get totalPages() {
    return Math.ceil(this.gastosFiltrados.length / this.itemsPerPage);  // Total de páginas sobre filtrados
  }

  // Generar la lista de páginas a mostrar (bloques de 5 páginas)
  get pages() {
    const total = this.totalPages;
    const currentBlock = Math.floor((this.currentPage - 1) / 5);
    const startPage = currentBlock * 5 + 1;
    const endPage = Math.min(startPage + 4, total);

    const pagesToShow = [];
    for (let i = startPage; i <= endPage; i++) {
      pagesToShow.push(i);
    }

    return pagesToShow;
  }


  get gastosFiltrados() {
    return this.gastos.filter(gasto => {
      const coincideCategoria = this.filtroCategoria ? gasto.categoria === this.filtroCategoria : true;

      const coincideMes = this.filtroMes
        ? new Date(gasto.fecha).toISOString().slice(0, 7) === this.filtroMes
        : true;

      const texto = this.busquedaTexto.toLowerCase();
      const coincideBusqueda = texto
        ? gasto.descripcion?.toLowerCase().includes(texto) ||
        gasto.proveedor?.toLowerCase().includes(texto) ||
        gasto.categoria?.toLowerCase().includes(texto)
        : true;

      return coincideCategoria && coincideMes && coincideBusqueda;
    });
  }
  limpiarFiltros() {
    this.filtroCategoria = '';
    this.filtroMes = '';
    this.busquedaTexto = '';
    this.setPage(1);
  }
  // Seleccionar un gasto para editar
  async editarGastoSeleccionado(gasto: any) {
    this.isEditing = true;
    this.gastoEdicion = { ...gasto }; // Copiar los datos del gasto a editar
  }

  // Guardar los cambios del gasto editado
  // Componente donde se edita el gasto
  async editarGasto() {
    try {
      const resultado = await this.supabaseService.actualizarGasto(this.gastoEdicion);

      // Verificar si el resultado es null o contiene error
      if (resultado?.error) {
        Swal.fire({
          icon: 'error',
          title: '¡Oops!',
          text: resultado.error, // Mostrar el mensaje de error
          confirmButtonColor: '#f97316',
        });
      } else {
        this.isEditing = false;
        this.gastoEdicion = {}; // Limpiar los datos del gasto
        this.obtenerGastos(); // Recargar los gastos

        Swal.fire({
          icon: 'success',
          title: '¡Gasto editado!',
          text: 'El gasto ha sido editado correctamente.',
          confirmButtonColor: '#f97316',
        });
      }
    } catch (error) {
      console.error('Error al editar gasto:', error);
      Swal.fire({
        icon: 'error',
        title: '¡Oops!',
        text: 'Hubo un problema al editar el gasto, intenta nuevamente.',
        confirmButtonColor: '#f97316',
      });
    }
  }


  // Cancelar la edición
  cancelarEdicion() {
    this.isEditing = false;
    this.gastoEdicion = {}; // Limpiar los datos del gasto
  }

  async eliminarGasto(gasto: any) {
    const id = gasto.id;

    if (typeof id !== 'number') {
      console.error('ID no es válido:', gasto);
      Swal.fire('¡Oops!', 'El ID del gasto no es válido.', 'error');
      return;
    }

    // Mostrar mensaje de confirmación
    const confirmacion = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este gasto se eliminará permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    // Solo continuar si el usuario confirma
    if (confirmacion.isConfirmed) {
      const resultado = await this.supabaseService.eliminarGasto(id);

      if (resultado === true) {
        Swal.fire('¡Eliminado!', 'El gasto fue eliminado correctamente.', 'success');
        this.obtenerGastos(); // Recargar la lista
      } else {
        Swal.fire('¡Oops!', 'Hubo un problema al eliminar el gasto, intenta nuevamente.', 'error');
      }
    }
  }
  abrirModal() {
  this.modalAbierto = true;
}

cerrarModal() {
  this.modalAbierto = false;
  this.nuevoProveedor = {
    nombre: '',
    ruc: '',
    telefono: '',
    email: '',
    direccion: '',
    contacto_nombre: '',
  };
}

async guardarProveedor() {
  // Limpia los valores directamente dentro del objeto
  const proveedorLimpio = {
    nombre: this.nuevoProveedor.nombre?.trim() || '',
    ruc: this.nuevoProveedor.ruc?.trim() || '',
    telefono: this.nuevoProveedor.telefono?.trim() || '',
    email: this.nuevoProveedor.email?.trim() || '',
    direccion: this.nuevoProveedor.direccion?.trim() || '',
    contacto_nombre: this.nuevoProveedor.contacto_nombre?.trim() || '',
  };

  const resultado = await this.supabaseService.crearProveedor(proveedorLimpio);

  if (resultado.error) {
    console.error('Error:', resultado.error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error al guardar proveedor',
    });
  } else {
    Swal.fire({
      icon: 'success',
      title: '¡Éxito!',
      text: 'Proveedor creado correctamente',
      timer: 2000,
      showConfirmButton: false,
    });
    this.cerrarModal(); // Opcional: cerrar al guardar
  }
}

// Carga usuarios
async obtenerUsuarios() {
  try{
    this.usuarios = await this.supabaseService.obtenerUsuarios();
  } catch (error){
    console.error('Error al obterner usuarios:', error);
  }
}
async cargarProveedores() {
  try {
    this.proveedores = await this.supabaseService.obtenerProveedores();
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    Swal.fire('Error', 'No se pudieron cargar los proveedores', 'error');
  }
}
async cargarDatosDropdown() {
  try {
    this.proveedores = await this.supabaseService.obtenerProveedores();
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    Swal.fire('Error', 'No se pudieron cargar los proveedores', 'error');
  }

  try {
    this.usuarios = await this.supabaseService.obtenerUsuarios();
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
  }

  this.elementosDropdown = [
    ...this.proveedores.map(p => ({ ...p, tipo: 'proveedor' })),
    ...this.usuarios.map(u => ({ ...u, tipo: 'usuario' }))
  ];
}

filtrarElementos() {
  if (!this.busquedaElemento) {
    this.elementosFiltrados = [];
    this.mostrarListaElementos = false;
    this.elementoSeleccionado = null;
    return;
  }

  const texto = this.busquedaElemento.toLowerCase();
  this.elementosFiltrados = this.elementosDropdown.filter(e =>
    e.nombre.toLowerCase().includes(texto)
  );

  this.mostrarListaElementos = true;
}

cerrarListaSiNoSeleccionado() {
  setTimeout(() => {
    if (!this.elementoSeleccionado) {
      this.mostrarListaElementos = false;
      this.busquedaElemento = '';
    }
  }, 200);
}

seleccionarElemento(elemento: any) {
  this.elementoSeleccionado = elemento;
  this.busquedaElemento = elemento.nombre;
  this.mostrarListaElementos = false;
}




}
