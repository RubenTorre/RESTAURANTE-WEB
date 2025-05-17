import { Component } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { NgSelectModule } from '@ng-select/ng-select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


@Component({
  selector: 'app-almuerzos-contrato',
  imports: [CommonModule,FormsModule,NgSelectModule],
  templateUrl: './almuerzos-contrato.component.html',
  styleUrl: './almuerzos-contrato.component.css'
})
export default class AlmuerzosContratoComponent {
  clienteBusqueda: string = '';
  clientesFiltrados: any[] = [];
  paginaActual: number = 1;
  clientesPorPagina: number = 5;
  terminoBusqueda: string = '';
  nombre = '';
  telefono = '';
  direccion = '';
  modalUsuarioAbierto = false;
  clientes: any[] = [];
  pedido = {
    cliente_id: null as string | null,
    fecha: getFechaLocal(),
    estado_pago: 'pendiente' as 'pagado' | 'pendiente',
    total: 0,
    observaciones: '',
    tipo: 'Almuerzo',
    cantidad: 1
  };
  tiposDeAlmuerzo: { 
    id: string; 
    nombre: string; 
    descripcion?: string; 
    cantidad: number;
    precio?: number;
  }[] = [];
  
  precio: number = 0;
  almuerzoSeleccionado: string | null = null;
  preciosDelCliente: any[] = [];
  clientesConPrecios: any[] = [];
  clienteSeleccionadoId: string | null = null;
  datosClienteConPrecios: any[] = [];
  pedidos: any[] = [];
  cargando: boolean = false;
  error: string | null = null;
  fechaInicio: string = '';
  fechaFin: string = '';

  todosLosPedidos: any[] = [];
  // Añade estas propiedades
nombreBusqueda: string = '';
pedidosFiltrados: any[] = [];
mostrarTodos: boolean = true;
estadoFiltro: string = '';
paginaPedidos: number = 1;
pedidosPorPagina: number = 10;
modalAbierto = false;
clienteEdit: any = null;
Math = Math;
  getInitials(nombre: string): string {
    if (!nombre) return '';
  
    const palabras = nombre.trim().split(/\s+/);
  
    if (palabras.length === 1) {
      // Si solo hay una palabra, tomar las 2 primeras letras
      return palabras[0].substring(0, 2).toUpperCase();
    }
  
    // Si hay más de una palabra, tomar la primera letra de las dos primeras
    return palabras.slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }
  
modalPedidoAbierto = false;

// Agrega estas propiedades al componente
preciosTemporales: { almuerzo_id: string; precio: number; nombreAlmuerzo?: string }[] = [];
nuevoPrecio = {
  almuerzo_id: '',
  precio: 0
};

  constructor(private supabaseService: SupabaseService) {}
  
  async ngOnInit() {
     this.cargarClientesConPrecios();
     this.cargarPedidos();
    try {
    const almuerzos = await this.supabaseService.obtenerTiposDeAlmuerzo();
    
   
      // Agregar propiedad "cantidad" para que el usuario pueda llenarla
      this.tiposDeAlmuerzo = almuerzos.map(a => ({ ...a, cantidad: 0 }));
    } catch (error) {
      alert('Error al cargar los tipos de almuerzo');
      console.error(error);
    }
   
    
    } 
    
    async guardarClienteConPrecios(): Promise<void> {
      try {
        if (this.preciosTemporales.length === 0) {
          throw new Error('Debe agregar al menos un precio de almuerzo');
        }
    
        const clienteConPrecios = await this.supabaseService.crearClienteConPrecios(
          this.nombre,
          this.telefono ?? undefined,
          this.direccion ?? undefined,
          this.preciosTemporales
        );
    
        Swal.fire({
          icon: 'success',
          title: 'Cliente y precios guardados',
          text: 'El cliente y sus precios fueron registrados correctamente',
          timer: 2000,
          showConfirmButton: false,
        });
      // ✅ Limpiar búsqueda del cliente
      this.clienteBusqueda = '';
      this.clienteSeleccionadoId = null;
      this.clientesFiltrados = [];
        // Limpiar formulario
        this.resetForm();
        this.cerrarModalUsuario();
        this.cargarClientesConPrecios();
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: error.message || 'Ocurrió un error inesperado',
        });
      }
    }
    
    // Método para agregar precios temporales
    agregarPrecioTemporal() {
      if (!this.almuerzoSeleccionado || this.precio <= 0) return;
    
      const almuerzoSeleccionado = this.tiposDeAlmuerzo.find(a => a.id === this.almuerzoSeleccionado);
      
      this.preciosTemporales.push({
        almuerzo_id: this.almuerzoSeleccionado,
        precio: this.precio,
        nombreAlmuerzo: almuerzoSeleccionado?.nombre
      });
    
      // Resetear campos de almuerzo y precio
      this.almuerzoSeleccionado = null;
      this.precio = 0;
    }
    
    // Método para eliminar un precio temporal
    eliminarPrecioTemporal(index: number) {
      this.preciosTemporales.splice(index, 1);
    }
    
    // Método para resetear el formulario
    resetForm() {
      this.nombre = '';
      this.telefono = '';
      this.direccion = '';
      this.precio = 0;
      this.almuerzoSeleccionado = null;
      this.preciosTemporales = [];
    }
    
    async cargarClientesConPrecios() {
      try {
        const data = await this.supabaseService.obtenerClientesConPrecios();
    
        const mapClientes = new Map<string, any>();
    
        data.forEach(item => {
          const clienteId = item.clientes.id;
    
          if (!mapClientes.has(clienteId)) {
            mapClientes.set(clienteId, {
              id: clienteId,
              nombre: item.clientes.nombre,
              telefono: item.clientes.telefono,
              direccion: item.clientes.direccion,
              activo: item.clientes.activo, // <--- Asegúrate de traer este campo desde Supabase
              almuerzos: []
            });
          }
    
          mapClientes.get(clienteId).almuerzos.push({
            id: item.almuerzos.id,
            nombre: item.almuerzos.nombre,
            precio: item.precio
          });
        });
    
        this.clientesConPrecios = Array.from(mapClientes.values()).sort((a, b) => {
          // Primero por estado activo (true > false)
          if (a.activo !== b.activo) {
            return Number(b.activo) - Number(a.activo);
          }
        
          // Luego por nombre alfabéticamente
          return a.nombre.localeCompare(b.nombre);
        });
        
        // También actualiza la lista base usada para búsqueda
        this.clientes = this.clientesConPrecios.map(cliente => ({
          id: cliente.id,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          direccion: cliente.direccion
        }));
    
      } catch (error) {
        console.error('Error cargando clientes con precios', error);
      }
    }
    
    // Para evitar que el blur se active cuando se hace clic en un elemento de la lista
preventBlur(event: MouseEvent) {
  event.preventDefault();
}

// Cuando el input pierde el foco
onBlurCliente() {
  setTimeout(() => {
    // Usamos setTimeout para permitir que el click en un item se procese primero
    if (!this.clienteSeleccionadoId && this.clienteBusqueda) {
      this.clienteBusqueda = ''; // Limpiamos la búsqueda
      this.clientesFiltrados = []; // Limpiamos los resultados
      this.onClienteSeleccionado(); // Llamamos a la función para resetear
    }
  }, 200);
}
// Variable adicional para controlar la visibilidad del dropdown
mostrarListaClientes: boolean = false;

// Función para filtrar clientes 
filtrarClientes() {
  if (!this.clienteBusqueda) {
    this.clientesFiltrados = [];
    this.mostrarListaClientes = false;  // Cierra la lista si no hay búsqueda
    this.clienteSeleccionadoId = null;
    this.onClienteSeleccionado();
    return;
  }

  const texto = this.clienteBusqueda.toLowerCase();
  this.clientesFiltrados = this.clientes
    .filter(c => c.nombre.toLowerCase().includes(texto))
    .sort((a, b) => Number(b.activo) - Number(a.activo));

  this.mostrarListaClientes = true;  // Abre la lista al buscar
}

// Función para cerrar la lista si no hay selección
cerrarListaSiNoSeleccionado() {
  setTimeout(() => {
    if (!this.clienteSeleccionadoId) {
      this.mostrarListaClientes = false;  // Cierra el dropdown
      this.clienteBusqueda = '';  // Opcional: Limpia la búsqueda
    }
  }, 200);  // Pequeño delay para permitir la selección
}

// Función al seleccionar un cliente 
seleccionarCliente(cliente: any) {
  this.clienteSeleccionadoId = cliente.id;
  this.clienteBusqueda = cliente.nombre;
  this.mostrarListaClientes = false;  // Cierra el dropdown después de seleccionar
  this.onClienteSeleccionado();
}

    
    async onClienteSeleccionado() {
      if (this.clienteSeleccionadoId) {
        try {
          this.datosClienteConPrecios = await this.supabaseService.obtenerClienteConPrecios(this.clienteSeleccionadoId);
    
          this.tiposDeAlmuerzo.forEach(almuerzo => {
            const precioCliente = this.datosClienteConPrecios.find(
              item => item.almuerzos.id === almuerzo.id
            );
            almuerzo.precio = precioCliente ? precioCliente.precio : 0;
            almuerzo.cantidad = 0;  // reiniciamos cantidad al cambiar cliente
          });
    
          this.pedido.cliente_id = this.clienteSeleccionadoId;  // <--- aquí actualizas el pedido
    
        } catch (error: any) {
          Swal.fire({
            icon: 'error',
            title: 'Error al cargar datos del cliente',
            text: error.message || 'No se pudieron obtener los datos',
          });
        }
      } else {
        this.datosClienteConPrecios = [];
        this.tiposDeAlmuerzo.forEach(almuerzo => {
          almuerzo.precio = 0;
          almuerzo.cantidad = 0;
        });
        this.pedido.cliente_id = null;  // Reiniciar cliente_id cuando no hay selección
      }
    }   
abrirModalUsuario() {
  this.modalUsuarioAbierto = true;
}
cerrarModalUsuario() {
  this.modalUsuarioAbierto = false;
}
async guardarPedido() {
  try {
    // ✅ Validar cliente seleccionado
    if (!this.pedido.cliente_id) {
      await Swal.fire({
        icon: 'warning',
        title: 'Cliente requerido',
        text: 'Debe seleccionar un cliente antes de guardar el pedido.',
      });
      return;
    }

    // ✅ Validar almuerzos seleccionados con cantidad > 0
    const almuerzosSeleccionados = this.tiposDeAlmuerzo
      .filter(a => a.cantidad && a.cantidad > 0)
      .map(a => ({
        almuerzo_id: a.id,
        cantidad: a.cantidad
      }));

    if (almuerzosSeleccionados.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debe seleccionar al menos un tipo de almuerzo con cantidad mayor a 0',
      });
      return;
    }

    // ✅ Calcular total
    const totalCalculado = this.calcularTotal(
      this.tiposDeAlmuerzo.filter(a => a.cantidad && a.cantidad > 0)
    );

    // ✅ Armar el pedido
    const pedidoParaEnviar = {
      cliente_id: this.pedido.cliente_id,
      fecha: this.pedido.fecha,
      estado_pago: this.pedido.estado_pago || 'pendiente',
      observaciones: this.pedido.observaciones || '',
      total: totalCalculado,
      almuerzos: almuerzosSeleccionados
    };

    // ✅ Guardar en Supabase
    const resultado = await this.supabaseService.crearPedidoAlmuerzos(pedidoParaEnviar);

    // ✅ Mostrar confirmación
    await Swal.fire({
      icon: 'success',
      title: 'Éxito',
      text: 'Pedido creado correctamente!',
    });

    // ✅ Limpiar formulario
    this.clienteBusqueda = '';
    this.clienteSeleccionadoId = null;
    this.pedido.cliente_id = null;
    this.clientesFiltrados = [];
    this.resetearFormulario();
    this.cargarPedidos();
    
  } catch (error) {
    console.error('Error al guardar:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: (error as Error).message || 'Ocurrió un error inesperado',
    });
  }
}
calcularTotal(almuerzos: { precio?: number; cantidad: number }[]): number {
  return almuerzos.reduce((total, almuerzo) => {
    return total + ((almuerzo.precio ?? 0) * (almuerzo.cantidad || 0));
  }, 0);
}

resetearFormulario() {
  this.pedido = {
    cliente_id: null,
    fecha: new Date().toISOString().split('T')[0],
    estado_pago: 'pendiente',
    total: 0,
    observaciones: '',
    tipo: 'Almuerzo',
    cantidad: 1
  };
}


get clientesBuscados(): any[] {
  if (!this.terminoBusqueda.trim()) {
    return this.clientesConPrecios;
  }

  const termino = this.terminoBusqueda.toLowerCase();
  return this.clientesConPrecios.filter(cliente =>
    cliente.nombre.toLowerCase().includes(termino)
  );
}

get clientesPaginados(): any[] {
  const inicio = (this.paginaActual - 1) * this.clientesPorPagina;
  return this.clientesBuscados.slice(inicio, inicio + this.clientesPorPagina);
}

get totalPaginas(): number {
  return Math.ceil(this.clientesBuscados.length / this.clientesPorPagina);
}

cambiarPagina(nuevaPagina: number) {
  if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
    this.paginaActual = nuevaPagina;
  }
}
// Modifica tu método cargarPedidos
async cargarPedidos() {
  this.cargando = true;
  this.error = null;
  try {
    const pedidos = await this.supabaseService.obtenerPedidosConDetalle();
    this.pedidos = pedidos;
    this.pedidosFiltrados = [...pedidos]; // Inicializa con todos los pedidos
    this.mostrarTodos = true;
  } catch (e: any) {
    this.error = e.message || 'Error al cargar pedidos';
  } finally {
    this.cargando = false;
  }
}

// Método para obtener clases CSS según estado de pago
getEstadoClase(estado: string | null): string {
  switch (estado?.toLowerCase()) {
    case 'pagado': return 'bg-green-100 text-green-800';
    case 'pendiente': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
// Método para filtrar por nombre (filtrado local)
  filtrarPorNombre() {
    if (!this.nombreBusqueda) {
      this.pedidosFiltrados = [...this.pedidos];
      return;
    }

    this.pedidosFiltrados = this.pedidos.filter(pedido => 
      pedido.clientes?.nombre?.toLowerCase().includes(this.nombreBusqueda.toLowerCase())
    );
    this.mostrarTodos = false;
  }

  // Modifica tu método filtrarPorFechas para que trabaje con pedidosFiltrados
  async filtrarPorFechas() {
    if (!this.fechaInicio || !this.fechaFin) return;

    this.cargando = true;
    try {
      const data = await this.supabaseService.obtenerPedidosConDetalleFiltrado(this.fechaInicio, this.fechaFin);
      this.pedidosFiltrados = data;
      this.mostrarTodos = false;
      
      // Si hay búsqueda por nombre, aplica el filtro también
      if (this.nombreBusqueda) {
        this.filtrarPorNombre();
      }
    } catch (error) {
      console.error('Error al filtrar pedidos:', error);
    } finally {
      this.cargando = false;
    }
  }
    // Método para calcular el total mostrado
    calcularTotalMostrado(): number {
      return this.pedidosFiltrados.reduce((total, pedido) => total + (pedido.total || 0), 0);
    }

  // Método para limpiar filtros actualizado
  limpiarFiltros() {
    this.nombreBusqueda = '';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.estadoFiltro = '';
    this.cargarPedidos();
  }

  // Método para filtrar pedidos actualizado
  async filtrarPedidos() {
    this.cargando = true;
    try {
      if (this.fechaInicio && this.fechaFin) {
        const pedidosFiltradosPorFecha = await this.supabaseService.obtenerPedidosConDetalleFiltrado(this.fechaInicio, this.fechaFin);
        this.pedidosFiltrados = pedidosFiltradosPorFecha;
        this.mostrarTodos = false;
      } else {
        this.pedidosFiltrados = [...this.pedidos];
        this.mostrarTodos = true;
      }
  
      // Filtro por nombre
      if (this.nombreBusqueda) {
        this.pedidosFiltrados = this.pedidosFiltrados.filter(pedido => 
          pedido.clientes?.nombre?.toLowerCase().includes(this.nombreBusqueda.toLowerCase())
        );
        this.mostrarTodos = false;
      }
  
      // Filtro por estado de pago
      if (this.estadoFiltro) {
        this.pedidosFiltrados = this.pedidosFiltrados.filter(pedido =>
          pedido.estado_pago?.toLowerCase() === this.estadoFiltro
        );
      }
  
      // 🔽 Ordenar por fecha ASC (de menor a mayor)
      this.pedidosFiltrados.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  
    } catch (error) {
      console.error('Error al filtrar pedidos:', error);
    } finally {
      this.cargando = false;
    }
  }
  
  
  get pedidosPaginados(): any[] {
    const inicio = (this.paginaPedidos - 1) * this.pedidosPorPagina;
    return this.pedidosFiltrados.slice(inicio, inicio + this.pedidosPorPagina);
  }
  
  get totalPaginasPedidos(): number {
    return Math.ceil(this.pedidosFiltrados.length / this.pedidosPorPagina);
  }
  
  cambiarPaginaPedidos(nuevaPagina: number) {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginasPedidos) {
      this.paginaPedidos = nuevaPagina;
      this.cargarClientesConPrecios();
    }
  }
  async toggleEstadoCliente(cliente: any) {
    const nuevoEstado = !cliente.activo;
    try {
      await this.supabaseService.cambiarEstadoCliente(cliente.id, nuevoEstado);
      cliente.activo = nuevoEstado; // Actualiza localmente para cambio inmediato
  
      Swal.fire({
        icon: 'success',
        title: nuevoEstado ? 'Cliente activado' : 'Cliente eliminado',
        timer: 1500,
        showConfirmButton: false,
      });
  
      // Opcional: si quieres recargar toda la lista en vez de actualizar localmente
      // await this.cargarClientesConPrecios();
  
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo actualizar el estado del cliente',
      });
    }
  }
  abrirModalEditarCliente(cliente: any) {
    // Clona para no modificar el original directamente (evita dos vías antes de guardar)
    this.clienteEdit = JSON.parse(JSON.stringify(cliente));
    this.modalAbierto = true;
  }
  
  cerrarModal() {
    this.modalAbierto = false;
    this.clienteEdit = null;
  }
  async guardarCambiosCliente() {
    if (!this.clienteEdit) return;
  
    try {
      // Aquí llamas al servicio de actualizar, pasándole los datos editados
      await this.supabaseService.actualizarClienteConPrecios(
        this.clienteEdit.id,
        this.clienteEdit.nombre,
        this.clienteEdit.telefono,
        this.clienteEdit.direccion,
        this.clienteEdit.almuerzos.map((a: any) => ({
          almuerzo_id: a.id,
          precio: Number(a.precio),
        }))
      );
  
      Swal.fire('¡Éxito!', 'Cliente actualizado correctamente', 'success');
  
      
      this.cerrarModal();
      this.cargarPedidos();
      this.cargarClientesConPrecios();
    } catch (error: any) {
      Swal.fire('Error', error.message || 'No se pudo actualizar', 'error');
    }
  }
  async marcarPedidosFiltradosComoPagados() {
    try {
      if (!this.pedidosFiltrados.length) {
        await Swal.fire({
          icon: 'info',
          title: 'Sin pedidos',
          text: 'No hay pedidos filtrados para actualizar.',
        });
        return;
      }
  
      const nombreCliente = this.pedidosFiltrados[0].clientes?.nombre || 'Cliente desconocido';
      const total = this.pedidosFiltrados.reduce((sum, p) => sum + (p.total || 0), 0);
  
      const confirmacion = await Swal.fire({
        html: `
  <div style="
    font-family: 'Segoe UI', sans-serif;
    background-color: #fef3c7;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid #fcd34d;
    color: #78350f;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  ">
    <h3 style="margin-top: 0; font-size: 18px; font-weight: bold; display: flex; align-items: center;">
      📦 Confirmación de pago masivo
    </h3>

    <p style="margin: 8px 0;">
      Vas a marcar como <strong>pagados</strong> los pedidos del siguiente cliente:
    </p>

    <div style="
      background-color: #fde68a;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 10px;
    ">
      👤 ${nombreCliente}
    </div>

    <p style="margin: 6px 0;"><strong>Rango de fechas:</strong></p>
    <ul style="list-style: none; padding-left: 0; margin: 0 0 10px 0;">
      <li>📅 <strong>Desde:</strong>  ${this.formatearFecha(this.fechaInicio)}</li>
      <li>📅 <strong>Hasta:</strong>  ${this.formatearFecha(this.fechaFin)}</li>
    </ul>

    <p style="font-size: 15px; margin: 8px 0;"><strong>Total a pagar:</strong></p>
    <div style="
      background-color: #bbf7d0;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 18px;
      color: #065f46;
      display: inline-block;
      margin-bottom: 10px;
    ">
      💵 S/ ${total.toFixed(2)}
    </div>

    <hr style="margin: 12px 0; border: none; border-top: 1px solid #facc15;" />

    <p style="text-align: center; font-weight: 500;">¿Deseas continuar con esta acción?</p>
  </div>
`,
showCancelButton: true,
confirmButtonText: '✅ Sí, marcar como pagados',
cancelButtonText: '❌ Cancelar',
confirmButtonColor: '#16a34a',
cancelButtonColor: '#dc2626',

      });
  
      if (!confirmacion.isConfirmed) return;
  
      const idsPedidos = this.pedidosFiltrados.map(p => p.id);
  
      await this.supabaseService.actualizarEstadoPagado(idsPedidos);
  
      await Swal.fire({
        icon: 'success',
        title: 'Pagos actualizados',
        text: `Se marcaron ${idsPedidos.length} pedidos como pagados.`,
      });
  
      // Recarga la lista
      this.limpiarFiltros();
      this.cargarPedidos();
  
    } catch (error) {
      console.error('Error actualizando pagos:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron actualizar los pagos.',
      });
    }
  }
  
  get botonActualizarDeshabilitado(): boolean {
    if (!this.pedidosFiltrados?.length) return true;
  
    // Solo mostrar si el filtro actual es "pendiente"
    if (this.estadoFiltro !== 'pendiente') return true;
  
    // Deshabilitado si ya están todos pagados (aunque con filtro "pendiente" esto no debería pasar)
    return this.pedidosFiltrados.every(p => p.estado_pago === 'pagado');
  }
  
  get filtrosAplicados(): boolean {
    const fechas = !!this.fechaInicio && !!this.fechaFin;
    const nombre = !!this.nombreBusqueda && this.nombreBusqueda.trim() !== '';
    const estado = this.estadoFiltro === 'pendiente' || this.estadoFiltro === 'pagado';
  
    return fechas && nombre && estado;
  }
  
  
  formatearFecha(fechaISO: string): string {
    const [year, month, day] = fechaISO.split('-').map(Number);
    const fecha = new Date(year, month - 1, day); // ✅ Mes se cuenta desde 0
  
    return fecha.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  async cargarLogo(): Promise<string> {
    const response = await fetch('assets/splash/logo.jpg');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
  async generarPDF() {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // ---------- MARCA DE AGUA ----------
    doc.setTextColor(240, 240, 240); // Casi invisible gris claro
doc.setDrawColor(240, 240, 240); // Opcional: evita borde negro
doc.setFontSize(60);
doc.setFont('helvetica', 'bold');
doc.text('A FUEGO LENTO', pageWidth / 2, pageHeight / 2, {
  align: 'center',
  angle: 45,
  renderingMode: 'fill' // <- Solo relleno, sin borde negro
});

  
    // ---------- RECTÁNGULO DE FONDO PARA ENCABEZADO ----------
    // Primero dibujamos el rectángulo para que quede detrás del logo
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(10, 8, pageWidth - 20, 26, 'FD');
  
    // ---------- LOGO ----------
    // Ahora añadimos el logo DESPUÉS del rectángulo para que aparezca encima
    try {
      const logoData = await this.getBase64ImageFromURL('assets/splash/logo.jpg');
      // Ajustamos la posición para que sea más visible
      doc.addImage(logoData, 'JPEG', 15, 10, 25, 15);
    } catch (error) {
      console.warn('No se pudo cargar el logo:', error);
    }
  
    // ---------- DATOS DEL RESTAURANTE (MEJORADOS) ----------
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
  
    // Nombre grande y centrado - ajustado para no solapar con el logo
    doc.setFontSize(16);
    doc.text('A FUEGO LENTO', doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
  
    // RUC, teléfono y correo más pequeños
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const datosSecundarios = [
      'RUC: 1500956527001',
      'Tel: 0958910306'
    ];
  
    datosSecundarios.forEach((linea, i) => {
      doc.text(linea, doc.internal.pageSize.getWidth() / 2, 22 + i * 4, { align: 'center' });
    });
  
    // ---------- NÚMERO DE DOCUMENTO ----------
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Documento N°: ${this.generarNumeroDocumento()}`, pageWidth - 15, 12, { align: 'right' });
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE')}`, pageWidth - 15, 16, { align: 'right' });
  
    // ---------- TÍTULO DEL REPORTE ----------
    // Fondo para el título
    doc.setFillColor(60, 60, 60);
    doc.rect(pageWidth/2 - 35, 38, 70, 8, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE PAGOS', pageWidth / 2, 44, { align: 'center' });
  
    // ---------- PANEL DE FILTROS (MEJORADO) ----------
    // Variables para filtrar texto
    const clienteText = this.nombreBusqueda ? `CLIENTE: ${this.nombreBusqueda.toUpperCase()}` : '';
    const estadoPagoText = this.estadoFiltro ? `ESTADO DE PAGO: ${this.estadoFiltro.toUpperCase()}` : '';
    const periodoText = (this.fechaInicio && this.fechaFin) ? `PERÍODO: ${this.formatearFecha(this.fechaInicio)} HASTA ${this.formatearFecha(this.fechaFin)}` : '';
  
    // Configuración visual
    const filtroX = 15;
    const filtroWidth = pageWidth - 30;
    const filtroHeight = 24;
    const filtroRadius = 2;
    const paddingLeft = 10;
    const lineHeight = 7;
  
    // Fondo y borde más profesional
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(filtroX, 50, filtroWidth, filtroHeight, filtroRadius, filtroRadius, 'F');
  
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(filtroX, 50, filtroWidth, filtroHeight, filtroRadius, filtroRadius, 'S');
  
    // Texto
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'bold');
  
    // Línea 1: Cliente con estilo destacado
    doc.text(clienteText, filtroX + paddingLeft, 58);
    
    // Estado de pago con fondo de color según estado
    if (this.estadoFiltro) {
      const estadoX = filtroX + filtroWidth - 70;
      const estadoWidth = 60;
      const estadoHeight = 7;
      
      // Fondo rojo suave para PENDIENTE, verde suave para PAGADO
      if (this.estadoFiltro.toUpperCase() === 'PENDIENTE') {
        doc.setFillColor(255, 235, 235);
        doc.setDrawColor(255, 180, 180);
      } else {
        doc.setFillColor(235, 255, 235);
        doc.setDrawColor(180, 255, 180);
      }
      
      doc.roundedRect(estadoX, 54, estadoWidth, estadoHeight, 1, 1, 'FD');
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.text(estadoPagoText, estadoX + estadoWidth/2, 58, { align: 'center' });
    }
  
    // Línea 2: Período en línea separada
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(periodoText, filtroX + paddingLeft, 58 + lineHeight);
  
    // ---------- TABLA DE DATOS (MEJORADA) ----------
    // Preparar datos con formato mejorado para estados
    const data = this.pedidosFiltrados.map(pedido => {
      const estadoPago = pedido.estado_pago?.toUpperCase();
      // Devolvemos el array normal, el formato se aplicará en didDrawCell
      return [
        this.formatearFecha(pedido.fecha),
        pedido.pedidos_almuerzo?.map((d: any) => `${d.almuerzos?.nombre} (${d.cantidad})`).join(', ') || 'Sin detalles',
        `$/ ${pedido.total?.toFixed(2)}`,
        estadoPago
      ];
    });
    
    await autoTable(doc, {
      head: [['FECHA', 'DETALLE', 'TOTAL']],
      body: data,
      startY: 78,
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [50, 50, 50],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.5,
        lineColor: [200, 200, 200]
      },
      bodyStyles: {
        textColor: [60, 60, 60],
        fontSize: 9,
        lineWidth: 0.3,
        lineColor: [230, 230, 230]
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }     
      },
      styles: {
        cellPadding: 4,
        overflow: 'linebreak',
        font: 'helvetica',
        valign: 'middle'
      },
      margin: { left: 15, right: 15 },
      tableLineColor: [210, 210, 210],
      tableLineWidth: 0.4,
      // Función para personalizar celdas (especialmente para el estado de pago)
      didDrawCell: (data) => {
        if (data.column.index === 3 && data.row.section === 'body') {
          const estado = data.cell.text[0];
          const x = data.cell.x + 5;
          const y = data.cell.y + 2;
          const width = data.cell.width - 10;
          const height = data.cell.height - 4;
      
          if (estado === 'PENDIENTE') {
            doc.setFillColor(255, 235, 235);
            doc.setDrawColor(255, 180, 180);
          } else {
            doc.setFillColor(235, 255, 235);
            doc.setDrawColor(180, 255, 180);
          }
      
          doc.roundedRect(x, y, width, height, 1, 1, 'FD');
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(estado, x + width / 2, y + height / 2 + 1, { align: 'center', baseline: 'middle' });
      
          return true; // indica que manejamos esta celda
        }
        return false; // o simplemente return undefined para los otros casos
      
      }
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
  
    // ---------- TOTAL GENERAL (MEJORADO) ----------
    // Rectángulo para el resumen
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.roundedRect(pageWidth - 85, finalY + 5, 70, 25, 2, 2, 'FD');
    
    // Línea separadora para el total
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(pageWidth - 80, finalY + 20, pageWidth - 20, finalY + 20);
    
    // Subtotal
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Subtotal:', pageWidth - 75, finalY + 12);
    doc.text(`$/ ${this.calcularTotalMostrado().toFixed(2)}`, pageWidth - 20, finalY + 12, { align: 'right' });
    
    // IGV (si aplica)
    doc.text('IVA (0%):', pageWidth - 75, finalY + 17);
    doc.text('$/ 0.00', pageWidth - 20, finalY + 17, { align: 'right' });
    
    // Total final
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('TOTAL:', pageWidth - 75, finalY + 25);
    doc.text(`$/ ${this.calcularTotalMostrado().toFixed(2)}`, pageWidth - 20, finalY + 25, { align: 'right' });
  
    // ---------- INFORMACIÓN DE PAGO ----------
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(15, finalY + 5, pageWidth - 105, 25, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text('INFORMACIÓN DE PAGO', 20, finalY + 12);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Métodos de pago aceptados:', 20, finalY + 17);
    doc.text('Efectivo, Transferencia Bancaria,', 20, finalY + 21);
    
    doc.text('Cuenta bancaria: Ruben Torres', 20, finalY + 25);
    doc.text('B.Pichincha: 2209495234 - B.Internacional: 1234567890', 20, finalY + 29);
    
  
    // ---------- PIE DE PÁGINA (MEJORADO) ----------
    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
    
    // Texto del pie de página
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    
    const fechaGeneracion = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    doc.text(`Generado el ${fechaGeneracion}`, 15, pageHeight - 15);
    doc.text('Este documento es un reporte oficial de A FUEGO LENTO', pageWidth / 2, pageHeight - 15, { align: 'center' });
    
  
    // ---------- GUARDAR PDF ----------
    doc.save(`Reporte_PAGOS_${this.nombreBusqueda || 'General'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
  
  
  generarNumeroDocumento(prefijo = 'CL'): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
  
    return `${prefijo}-${anio}-${mes}${dia}`;
  }
  
  // Función auxiliar para imágenes
  private getBase64ImageFromURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = img.height;
        canvas.width = img.width;
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = error => reject(error);
      img.src = url;
    });
  }
  

  
}
function getFechaLocal(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
