import { Component,OnDestroy  } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from '../../Services/user.service';
import Swal from 'sweetalert2';
import printJS from 'print-js'; 

type TipoAlmuerzo = 'completo' | 'solo_segundo' | 'media_sopa_segundo' | 'solo_sopa';


interface Ingrediente {
  id?: string;
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}
interface Extra {
  nombre: string;
  precio: number;
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
  estado: 'ocupada' | 'abierta'| 'reservada'|'virtual';
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
mostrarMenu: boolean = false;
  ultimaNotificacion: any; // Añade esta propiedad
  proteinas: string[] = ['Pollo', 'Cerdo', 'Lomo', 'Carne', 'Pescado','Camaron'];
  preparaciones: string[] = ['Frito', 'Ahumado', 'Seco', 'En salsa','Apanado','A la Plancha'];
  
  proteinaSeleccionada: string = '';
  preparacionSeleccionada: string = '';
   // Modal
 mostrarModalAlmuerzo: boolean = false;

 // Opciones de almuerzo
 tipoAlmuerzo: TipoAlmuerzo = 'completo';
 segundoSeleccionado: string = '';

 // Modificadores
 sinArroz: boolean = false;
 sinMenestra: boolean = false;
 sinEnsalada: boolean = false;
 paraLlevar: boolean = false;
 alaplancha: boolean = false;

 // Carrito (ya lo tienes en tu lógica actual)

  // Mapa de precios por tipo de almuerzo
  preciosAlmuerzo: Record<TipoAlmuerzo, number> = {
    completo: 3,
    solo_segundo: 2.5,
    media_sopa_segundo: 3,
    solo_sopa: 1.5
  };

  extraPapas: boolean = false;
extraArroz: boolean = false;
extraEnsalada: boolean = false;
extraChorizo: boolean = false;
 // Extras con precio
 porcionesExtras = [
  { nombre: 'Porción de papas', precio: 1.50, seleccionado: false },
  { nombre: 'Porción de arroz', precio: 1.50, seleccionado: false },
  { nombre: 'Porción de ensalada', precio: 1.5, seleccionado: false },
  { nombre: 'Chorizo', precio: 1.5, seleccionado: false }
];
mesaVirtualPedidosYa: Mesa = {
  id: 30,
  nombre: 'Pedidos Ya',
  estado: 'virtual' as any
};

mesaVirtualPedidosBezz: Mesa = {
  id: 31,
  nombre: 'Pedidos Bezz',
  estado: 'virtual' as any
};


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
    });
  }

  ngOnDestroy() {
    // Limpieza opcional (si SupabaseService no maneja la desuscripción automática)
    // this.supabaseService.detenerNotificaciones();
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
  console.log('Mesa seleccionada:', mesa.nombre);
}

seleccionarSiAbierta(mesa: Mesa) {
  if (mesa.estado === 'abierta') {
    this.seleccionarMesa(mesa);
  }
}

// Método para seleccionar mesa virtual al elegir pedido virtual
seleccionarMesaVirtual(mesa: Mesa) {
  this.seleccionarMesa(mesa);
}

esPedidosYaSeleccionado(): boolean {
  return this.mesaSeleccionada?.id === 30;
}

esPedidosBezzSeleccionado(): boolean {
  return this.mesaSeleccionada?.id === 31;
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
  modificacionesSeleccionadas: string[] = [];
  agregarAlCarrito(receta: any) {
    // Verificación explícita de si 'mesaSeleccionada' es null
    if (this.mesaSeleccionada === null) {
      alert('Por favor selecciona una mesa primero.');
      return;
    }
  
    // Guardar la referencia de mesaSeleccionada en una variable temporal
    const mesaId = this.mesaSeleccionada.id;
  
    // Crear un objeto para las modificaciones
    const recetaConModificaciones = {
      ...receta,
      modificaciones: this.modificacionesSeleccionadas.length > 0 ? this.modificacionesSeleccionadas : [], // Aseguramos que las modificaciones se guarden correctamente
      cantidad: 1
    };
  
    // Crear un objeto para los extras seleccionados (con precio)
    const extrasSeleccionados = this.porcionesExtras
      .filter(extra => extra.seleccionado)  // Filtramos solo los extras seleccionados
      .map(extra => ({ nombre: extra.nombre, precio: extra.precio }));  // Mapeamos a un formato con nombre y precio
  
    // Verificamos si el producto con las modificaciones y extras ya está en el carrito
    const recetaEnCarrito = this.carrito.find(
      item => item.id === recetaConModificaciones.id && item.mesaId === mesaId && 
              JSON.stringify(item.modificaciones) === JSON.stringify(recetaConModificaciones.modificaciones) &&
              JSON.stringify(item.extras) === JSON.stringify(extrasSeleccionados)  // Comparamos los extras también
    );
  
    if (recetaEnCarrito) {
      // Si ya existe, solo aumentamos la cantidad
      recetaEnCarrito.cantidad++;
    } else {
      // Si no existe, agregamos el producto con las modificaciones y los extras al carrito
      this.carrito.push({
        ...recetaConModificaciones,
        extras: extrasSeleccionados,  // Agregamos los extras seleccionados
        mesaId: mesaId  // Usamos la variable temporal `mesaId`
      });
    }
  }
  
 
// Total general (subtotal + extras)
calcularTotalCarrito(): number {
  const total = this.calcularSubtotal() + this.calcularTotalExtras();
  return parseFloat(total.toFixed(2));
}

  eliminarProducto(index: number): void {
    // Decrementamos la cantidad del producto
    this.carrito[index].cantidad -= 1;
    
    // Si la cantidad llega a cero, lo eliminamos del carrito
    if (this.carrito[index].cantidad === 0) {
      this.carrito.splice(index, 1);  // Elimina el producto si su cantidad llega a 0
    }
  }
  
  
  // Método modificado para mostrar vista previa
  async realizarPedido() {
    if (this.carrito.length === 0) {
      Swal.fire("Error", "Carrito vacío", "error");
      return;
    }
  
    if (!this.mesaSeleccionada || !this.nombreUsuario) {
      Swal.fire("Error", "Mesa o mesero no ingresados", "error");
      return;
    }
  
    // ✅ Solo asegurar que 'extras' exista (sin tocar modificaciones)
    this.carrito = this.carrito.map(p => ({
      ...p,
      extras: p.extras || [] // Solo inicializa si no existe
    }));
  
    this.mostrarVistaPrevia = true;
    this.generarNumeroTicket();
  }
  
  

 // Método para confirmar e imprimir
 async confirmarYImprimir() {
  if (!this.mesaSeleccionada) {
    Swal.fire('Error', 'No se ha seleccionado mesa', 'error');
    return;
  }

  // Crear la factura (usando TU estructura actual)
  const factura = {
    numero_factura: uuidv4(),
    productos: this.carrito.map(item => ({
      nombre: item.nombre,
      precio: item.precio_venta,
      cantidad: item.cantidad ?? 1,
      modificaciones: item.modificaciones || [],
      // (Opcional) Si quieres guardar los extras por producto:
      extras: item.extras || [] 
    })),
    // CAMBIO CLAVE: Usar calcularTotalCarrito() para el total
    total: this.calcularTotalCarrito(), // <-- Aquí se incluyen extras
    fecha: getLocalDateTimeString(),
    mesa_id: this.mesaSeleccionada.id,
    mesero_nombre: this.nombreUsuario,
    forma_pago: '', 
    estado: 'ocupada'
  };

  try {
    const facturaCreada = await this.supabaseService.crearPedido(factura);
    if (facturaCreada) {
      this.imprimirTicketTermico();
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




   // Método de impresión
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
          font-size: 12px;
        }
    
        #ticket-termico {
          padding: 0 6px;
          width: 100%;
        }
    
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 6px; }
    
        /* Estilos para el listado de productos */
        .cart-container {
          width: 100%;
          margin-top: 5px;
        }
    
        .row {
          display: flex;
          align-items: flex-start;
          margin-bottom: 5px;
        }
    
        .header {
          border-bottom: 1px dashed #000;
          margin-bottom: 5px;
          padding-bottom: 3px;
          font-weight: bold;
        }
    
        .col-producto {
          flex: 1;
          padding-right: 5px;
          word-break: break-word;
        }
    
        .col-cant {
          width: 20px;
          text-align: right;
            padding-left: 15px;
          padding-right: 25px;
          white-space: nowrap;
        }
    
        .product-name {
          font-weight: bold;
          margin-bottom: 2px;
        }
    
        .modifications, .extras {
          margin-left: 3px;
          font-size: 11px;
        }
    
        .mod-item, .extra-item {
          line-height: 1.2;
          margin-bottom: 1px;
        }
    
        /* Estilo para los guiones (importante en monospace) */
        .mod-item:before, .extra-item:before {
          content: "- ";
        }
    
        /* Separación entre productos */
        .product-separator {
          border-bottom: 1px dashed #ccc;
          margin: 3px 0;
        }
      `,
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
    


 // Abre modal
 abrirModalAlmuerzo() {
   this.resetearFormulario();
   this.mostrarModalAlmuerzo = true;
 }

 // Cierra modal
 cerrarModalAlmuerzo() {
   this.mostrarModalAlmuerzo = false;
 }

// Agrega al carrito
agregarAlmuerzo() {
  const nombreBase = this.generarNombreAlmuerzo();
  let precio = this.preciosAlmuerzo[this.tipoAlmuerzo];

  // Aplicar recargo según tipo y si es para llevar
  if (this.paraLlevar) {
    if (this.tipoAlmuerzo === 'solo_sopa') {
      precio += 0.25;
    } else {
      precio += 0.5;
    }
  }

  this.carrito.push({
    nombre: nombreBase,
    precio_venta: precio,
    cantidad: 1
  });

  this.cerrarModalAlmuerzo();
  this.resetearFormulario();
}


private generarNombreAlmuerzo(): string {
  // Caso especial: solo sopa
  if (this.tipoAlmuerzo === 'solo_sopa') {
    const partes = ['Solo sopa'];

    if (this.paraLlevar) {
      partes.push('- para llevar');
    }

    return partes.join(' ');
  }

  const partes: string[] = [];

  // Tipo
  switch (this.tipoAlmuerzo) {
    case 'completo':
      partes.push('Almuerzo completo');
      break;
    case 'solo_segundo':
      partes.push('Solo segundo');
      break;
    case 'media_sopa_segundo':
      partes.push('Media sopa + segundo');
      break;
  }

  // Proteína + preparación (si aplica)
  if (this.proteinaSeleccionada) {
    let nombreProteina = this.proteinaSeleccionada;
    if (this.preparacionSeleccionada) {
      nombreProteina += ` ${this.preparacionSeleccionada}`;
    }
    partes.push(`(${nombreProteina})`);
  }

  // Modificadores
  const modificadores: string[] = [];
  if (this.sinArroz) modificadores.push('sin arroz');
  if (this.sinMenestra) modificadores.push('sin menestra');
  if (this.sinEnsalada) modificadores.push('sin ensalada');
  if (this.paraLlevar) modificadores.push('para llevar');

  if (modificadores.length > 0) {
    partes.push(`- ${modificadores.join(', ')}`);
  }

  return partes.join(' ');
}

 // Limpia selección
 private resetearFormulario() {
   this.tipoAlmuerzo = 'completo';
   this.segundoSeleccionado = '';
   this.sinArroz = false;
   this.sinMenestra = false;
   this.sinEnsalada = false;
   this.alaplancha = false;
   this.paraLlevar = false;
 }

 
 seleccionarProteina(proteina: string) {
   this.proteinaSeleccionada = proteina;
 }
 
 seleccionarPreparacion(preparacion: string) {
   this.preparacionSeleccionada = preparacion;
 }
 sinPapas: boolean = false;
papasFritas: boolean = false;
gratinadas: boolean = false;
mostrarModalModificaciones: boolean = false;
recetaSeleccionada: any = null;
obtenerModificaciones(): string[] {
  let modificaciones: string[] = [];

  if (this.sinPapas) modificaciones.push("Sin papas");
  if (this.sinEnsalada) modificaciones.push("Sin ensalada");
  if (this.papasFritas) modificaciones.push("Papas fritas");
  if (this.gratinadas) modificaciones.push("Gratinadas");

  return modificaciones;
}
abrirModalModificaciones(receta: any) {
  this.recetaSeleccionada = receta;
  this.mostrarModalModificaciones = true;

  // Reiniciar selecciones anteriores
  this.sinPapas = false;
  this.sinEnsalada = false;
  this.papasFritas = false;
  this.gratinadas = false;
}

confirmarAgregarAlCarrito() {
  // 1️⃣ Modificaciones ESPECÍFICAS para este producto (no globales)
  const modificaciones: string[] = [];
  
  if (this.sinPapas) modificaciones.push("Sin papas");
  if (this.sinEnsalada) modificaciones.push("Sin ensalada");
  if (this.papasFritas) modificaciones.push("Papas fritas");
  if (this.gratinadas) modificaciones.push("Gratinadas");

  // 2️⃣ Extras (con precio)
  const extrasSeleccionados = this.porcionesExtras
    .filter(extra => extra.seleccionado)
    .map(extra => ({ nombre: extra.nombre, precio: extra.precio }));

  // 3️⃣ Crear el producto con SUS modificaciones (no hereda nada global)
  const producto = {
    ...this.recetaSeleccionada,
    cantidad: 1,
    modificaciones, // Solo las de este producto
    extras: extrasSeleccionados
  };

  // 4️⃣ Agregar al carrito
  this.carrito.push(producto);

  // 5️⃣ Cerrar modal y resetear selecciones
  this.mostrarModalModificaciones = false;
  this.recetaSeleccionada = null;
  this.resetearModificaciones();
}

resetearModificaciones() {
  this.sinPapas = false;
  this.sinEnsalada = false;
  this.papasFritas = false;
  this.gratinadas = false;
  
  // Resetear extras también
  this.porcionesExtras.forEach(extra => extra.seleccionado = false);
}

// Luego en tu función:
calcularTotalExtras(): number {
  return this.carrito.reduce((total, item) => {
    if (!item.extras) return total;
    return total + item.extras.reduce((extraTotal: number, extra: Extra) => {
      return extraTotal + (extra.precio * item.cantidad);
    }, 0);
  }, 0);
}
// Añade esto en tu CartaComponent (carta.component.ts)
calcularExtrasItem(item: any): number {
  if (!item.extras || !item.cantidad) return 0;
  
  return item.extras.reduce(
    (suma: number, extra: any) => suma + (extra.precio || 0),
    0
  ) * item.cantidad;
}

}
function getLocalDateTimeString() {
  const ahora = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;
}