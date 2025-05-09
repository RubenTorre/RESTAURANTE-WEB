import { Component,OnDestroy  } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from '../../Services/user.service';
import Swal from 'sweetalert2';
import printJS from 'print-js'; 

interface Ingrediente {
  id?: string;
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

interface Receta {
  id?: string;
  nombre: string;
  ingredientes: Ingrediente[];
  precio_preparacion: number;
  imagen_url?: string | null;
  precio_venta?:number;
  ganancia?:number;
  porcentajeGanancia?: number;
  
}
interface Mesa {
  id: number;
  nombre: string;
  estado: 'ocupada' | 'abierta';
}
interface Factura {
  numero_factura: string;
  productos: Array<{
    nombre: string;
    precio: number;
    cantidad: number;
  }>;
  total: number;
  fecha: string;
  mesa_id: number;
  mesero_nombre: string;
  forma_pago: string;
  estado: string;
}
@Component({
  selector: 'app-carta',
  imports: [CommonModule, FormsModule],
  templateUrl: './carta.component.html',
  styleUrls: ['./carta.component.css']
})
export default class CartaComponent {

  recetas: Receta[] = [];
  recetasFiltradas: Receta[] = [];
  terminoBusquedaReceta: string = '';
  cargando = false;
  mesas: Mesa[] = [];
  mesaSeleccionada: Mesa | null = null;
  nombreUsuario: string = '';
  mostrarVistaPrevia = false;
  currentDate = new Date();
  ticketNumero: string = '';
  // Para simular el carrito visualmente (sin funcionalidad)
  carrito: any[] = [];

  ultimaNotificacion: any; // Añade esta propiedad

  constructor(private supabaseService: SupabaseService,private userService: UserService,
  ) {}
  
  async ngOnInit() {
    this.userService.nombreUsuario$.subscribe(nombre => {
      this.nombreUsuario = nombre;
    });
    this.inicializarMesas();
    await this.cargarRecetas();
    
    // Inicia la escucha de notificaciones
    this.supabaseService.listenNotifications((notificacion) => {
      this.ultimaNotificacion = notificacion;
      this.mostrarNotificacion(notificacion.mensaje);
    });
  }

  ngOnDestroy() {
    // Limpieza opcional (si SupabaseService no maneja la desuscripción automática)
    // this.supabaseService.detenerNotificaciones();
  }

  mostrarNotificacion(mensaje: string) {
    Swal.fire({
      title: '¡Nueva notificación!',
      text: mensaje,
      icon: 'info',
      confirmButtonText: 'Entendido'
    });

   
   
  }

  
  async inicializarMesas() {
    this.mesas = Array.from({ length: 26 }, (_, i) => ({
      id: i + 1,
      nombre: `Mesa ${i + 1}`,
      estado: 'abierta'  // Por defecto todas abiertas
    }));
  
    const facturasDelDia = await this.supabaseService.getFacturasDelDia();  // No hace falta filtrar aquí
    facturasDelDia.forEach(factura => {
      const mesa = this.mesas.find(m => m.id === factura.mesa_id); // asegúrate que factura.mesa_id existe
      if (mesa) {
        mesa.estado = factura.estado;  // aquí asignamos el estado que trae la factura (abierta o cerrada)
      }
    });
  }
  
  seleccionarMesa(mesa: Mesa) {
    this.mesaSeleccionada = mesa;
    
  }
  seleccionarSiAbierta(mesa: Mesa) {
    if (mesa.estado === 'abierta') {
      this.seleccionarMesa(mesa);
    }
  }
  
  volverAMesas() {
    this.mesaSeleccionada = null;
    this.limpiarCarrito();
  }

  aumentarCantidad(index: number): void {
    this.carrito[index].cantidad += 1;
  }

  disminuirCantidad(index: number): void {
    if (this.carrito[index].cantidad > 1) {
      this.carrito[index].cantidad -= 1;
    } else {
      this.eliminarProducto(index);
    }
  }

  calcularSubtotal(): number {
    return this.carrito.reduce((total, item) => total + (item.precio_venta * item.cantidad), 0);
  }

 
  async cargarRecetas() {
    try {
      this.cargando = true;
      this.recetas = await this.supabaseService.obtenerRecetas();
      this.filtrarRecetas();
    } catch (error) {
      console.error('Error cargando recetas:', error);
    } finally {
      this.cargando = false;
    }
  }

  filtrarRecetas() {
    if (!this.terminoBusquedaReceta) {
      this.recetasFiltradas = [...this.recetas];
      return;
    }

    const termino = this.terminoBusquedaReceta.toLowerCase();
    this.recetasFiltradas = this.recetas.filter(receta =>
      receta.nombre.toLowerCase().includes(termino)
    );
  }
  
  agregarAlCarrito(receta: any) {
    if (!this.mesaSeleccionada) {
      alert('Por favor selecciona una mesa primero.');
      return;
    }

    this.carrito.push({
      ...receta,
      mesaId: this.mesaSeleccionada.id,
      cantidad: 1
    });
  }
  calcularTotalCarrito() {
    return this.carrito.reduce((total, item) => total + (item.precio_venta || 0), 0);
  }
  eliminarProducto(index: number): void {
    this.carrito[index].cantidad -= 1;  // Decrece la cantidad del producto
    if (this.carrito[index].cantidad === 0) {
      this.carrito.splice(index, 1);  // Elimina el producto si su cantidad llega a 0
    }
  }
  
  // Método modificado para mostrar vista previa
  async realizarPedido() {
    if (this.carrito.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Carrito vacío',
        text: 'No hay productos en el carrito'
      });
      return;
    }

    if (!this.mesaSeleccionada || !this.nombreUsuario) {
      Swal.fire({
        icon: 'error',
        title: 'Datos incompletos',
        text: 'Debe seleccionar una mesa e ingresar el nombre del mesero'
      });
      return;
    }

    this.mostrarVistaPrevia = true;
    this.generarNumeroTicket();
  }

  // Método para confirmar e imprimir
  async confirmarYImprimir() {
    // Validación adicional para mesaSeleccionada
    if (!this.mesaSeleccionada) {
      Swal.fire('Error', 'No se ha seleccionado mesa', 'error');
      return;
    }
  
    const factura = {
      numero_factura: uuidv4(),
      productos: this.carrito.map(item => ({
        nombre: item.nombre,
        precio: item.precio_venta,
        cantidad: item.cantidad ?? 1,
      })),
      total: this.calcularSubtotal(),
      fecha: new Date().toISOString(),
      mesa_id: this.mesaSeleccionada.id, // Aseguramos que existe por la validación anterior
      mesero_nombre: this.nombreUsuario,
      forma_pago: '', // Puedes hacer esto configurable
      estado: 'ocupada' // O el estado inicial que uses
    };
  
    try {
      const facturaCreada = await this.supabaseService.crearPedido(factura);
      
      if (facturaCreada) {
        this.imprimirTicketTermico();
        
         // Cerrar el modal después de imprimir
      this.mostrarVistaPrevia = false;
      this.limpiarCarrito();
      this.volverAMesas();
      this.inicializarMesas();
      }
    } catch (error) {
      console.error('Error al crear factura:', error);
      Swal.fire('Error', 'No se pudo crear la factura', 'error');
    }
  }

   // Métodos de impresión
   imprimirTicketTermico() {
    printJS({
      printable: 'ticket-termico',
      type: 'html',
      style: `
  @page {
    size: 80mm auto;
    margin: 0;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 80mm;
    font-family: monospace;
    font-size: 14px;
  }

  #ticket-termico {
    padding: 0 6px;
    margin: 0;
  }

  .text-center {
    text-align: center;
  }

  .font-bold {
    font-weight: bold;
  }

  .mb-1 {
    margin-bottom: 4px;
  }

  .mb-2 {
    margin-bottom: 8px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    word-wrap: break-word; /* Permite que el texto se ajuste en varias líneas */
  }

  .col-producto {
    flex-grow: 1; /* La columna de producto ocupará todo el espacio disponible */
    text-align: left;
    padding-right: 5px;
    white-space: normal; /* Permite que el texto se divida en varias líneas */
    word-wrap: break-word; /* Rompe las palabras largas y las ajusta */
  }

 .col-cant {
  width: 40%; /* La columna de cantidad tendrá un ancho del 40% */
  text-align: right; /* La cantidad se alineará a la derecha */
  padding-left: 15px; /* Agrega espacio a la izquierda para la cantidad */
  padding-right: 25px; /* Espacio adicional a la derecha para que no quede pegado al borde de la hoja */
  white-space: nowrap; /* La cantidad se mantendrá en una sola línea */
}


  .espacio-corte {
    height: 80px;
  }
`
,
      scanStyles: false
    });
  }
  

  imprimirFactura() {
    printJS({
      printable: 'factura-detallada',
      type: 'html',
      style: `
        @page { size: A4; margin: 10mm; }
        body { font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
      `,
      targetStyles: ['*']
    });
  }
  
  generarNumeroTicket() {
    const fecha = new Date();
    const fechaHoy = fecha.toISOString().split('T')[0]; // formato YYYY-MM-DD
  
    // Obtener datos guardados
    const ultimoTicketGuardado = localStorage.getItem('ultimoTicket');
    let contador = 1;
  
    if (ultimoTicketGuardado) {
      const data = JSON.parse(ultimoTicketGuardado);
      if (data.fecha === fechaHoy) {
        contador = data.contador + 1;
      }
    }
  
    // Limitar a 1000 máximo
    if (contador > 1000) contador = 1;
  
    // Guardar nuevo contador
    localStorage.setItem('ultimoTicket', JSON.stringify({
      fecha: fechaHoy,
      contador: contador
    }));
  
    this.ticketNumero = contador.toString().padStart(3, '0');  }
    limpiarCarrito() {
      this.carrito = [];
    }
    

   
}
