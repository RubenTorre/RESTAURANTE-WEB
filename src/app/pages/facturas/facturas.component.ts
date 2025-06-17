import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../Services/supabase.service';
import printJS from 'print-js';
import { UserService } from '../../Services/user.service';
import Swal from 'sweetalert2';

interface Producto {
  nombre: string;
  precio: number;
  cantidad: number;
  asignado: number;
  modificaciones?: string[];  // Modificaciones es opcional
  extras?: { nombre: string; precio: number }[];  // Extras es opcional
}


interface Pedido {
  id:string;
  mesa_id: number;
  mesero_nombre: string;
  estado: string;
  productos: Producto[];
  total: number;
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
interface Ingrediente {
  id?: string;
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}


@Component({
  selector: 'app-facturas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './facturas.component.html',
  styleUrls: ['./facturas.component.css'],
})
export default class FacturasComponent implements OnInit {
  mesasOcupadas: Pedido[] = [];
  pedidoSeleccionado: Pedido | null = null;

  pagoSeparado: boolean = false;
  formaPago: 'efectivo' | 'transferencia'|'Credito' | 'tarjeta' |'pedidosya' |'beez' = 'efectivo';

  montoRecibido: number = 0;
  subtotal: number = 0;
  total: number = 0;
  vuelto: number = 0;
  codigoTransferencia: string = '';

  recetas: Receta[] = [];
  recetasFiltradas: Receta[] = [];
  terminoBusquedaReceta: string = '';
  cargando = false;
  recetasSeleccionadas: any[] = []; // Aquí guardaremos las recetas seleccionadas
  nombreUsuario: string = '';
  clienteBusqueda: string = '';
  clientesFiltrados: any[] = [];
  clientes: any[] = [];
  clientesConPrecios: any[] = [];
  clienteSeleccionadoId: string | null = null;
  datosClienteConPrecios: any[] = [];
  recetaSeleccionada: any = null;
mostrarLista: boolean = false;


  tiposDeAlmuerzo: { 
    id: string; 
    nombre: string; 
    descripcion?: string; 
    cantidad: number;
    precio?: number;
  }[] = [];
  pedido = {
    cliente_id: null as string | null,
    fecha: getFechaLocal(),
    estado_pago: 'pendiente' as 'pagado' | 'pendiente',
    total: 0,
    observaciones: '',
    tipo: 'Almuerzo',
    cantidad: 1
  };
  

  constructor(private supabase: SupabaseService,private userService: UserService) {}

  async ngOnInit() {
    this.userService.nombreUsuario$.subscribe(nombre => {
      this.nombreUsuario = nombre;  });
    await this.cargarMesasConPedidos();
    await this.cargarRecetas();
    this.cargarClientesConPrecios();
  }

  async cargarMesasConPedidos() {
    const pedidos = await this.supabase.getFacturasDelDia();
    this.mesasOcupadas = pedidos.filter((p) => p.estado === 'ocupada');
  }

  abrirModal(factura: Pedido) {
    this.pedidoSeleccionado = {
      ...factura,
      productos: factura.productos.map((p: Producto) => ({ ...p, asignado: 0 }))
    };
    this.resetValores();
    this.calcularTotales();
  }

  cerrarModal() {
    this.pedidoSeleccionado = null;
  }
// Cargar recetas desde el servicio
async cargarRecetas() {
  try {
    this.cargando = true;
    this.recetas = await this.supabase.obtenerRecetas();
    this.filtrarRecetas();
  } catch (error) {
    console.error('Error cargando recetas:', error);
  } finally {
    this.cargando = false;
  }
}
// Filtrar las recetas basadas en el término de búsqueda
filtrarRecetas() {
  if (!this.terminoBusquedaReceta) {
    this.recetasFiltradas = [];
    this.mostrarLista = false;
    return;
  }

  const termino = this.terminoBusquedaReceta.toLowerCase();
  this.recetasFiltradas = this.recetas.filter(receta =>
    receta.nombre.toLowerCase().includes(termino)
  );
  this.mostrarLista = this.recetasFiltradas.length > 0;
}
// Seleccionar una receta (agregarla a la lista de seleccionadas)
seleccionarReceta(receta: any) {
  if (!this.recetasSeleccionadas.includes(receta)) {
    this.recetasSeleccionadas.push(receta);
    this.calcularTotales(); // Actualizar el total al seleccionar
  }
  this.terminoBusquedaReceta = '';
  this.mostrarLista = false;
}
// Eliminar una receta seleccionada de la lista
eliminarRecetaSeleccionada(receta: any) {
  this.recetasSeleccionadas = this.recetasSeleccionadas.filter(r => r !== receta);
  this.calcularTotales(); // Actualizar el total al eliminar
}
limpiarBusqueda() {
  this.terminoBusquedaReceta = '';
  this.recetaSeleccionada = null;
  this.recetasFiltradas = [];
  this.mostrarLista = false;
}
  resetValores() {
    this.formaPago = 'efectivo';
    this.pagoSeparado = false;
    this.montoRecibido = 0;
    this.subtotal = 0;
    this.total = 0;
    this.vuelto = 0;
    this.codigoTransferencia = '';
  }
  calcularTotales() {
  let subtotalCalculado = 0;

  // Sumar subtotal de productos del pedido, si hay uno seleccionado
  if (this.pedidoSeleccionado) {
    if (this.pagoSeparado) {
      subtotalCalculado += this.pedidoSeleccionado.productos.reduce((sum, p) => {
        // Sumar el precio base del producto
        const precioProducto = p.precio * (p.asignado || 0);

        // Sumar los extras (si existen) al precio
        const precioExtras = p.extras?.reduce((extraSum, extra) => {
          return extraSum + (extra.precio || 0);
        }, 0) || 0;

        return sum + precioProducto + precioExtras;
      }, 0);
    } else {
      subtotalCalculado += this.pedidoSeleccionado.productos.reduce((sum, p) => {
        // Sumar el precio base del producto
        const precioProducto = p.precio * p.cantidad;

        // Sumar los extras (si existen) al precio
        const precioExtras = p.extras?.reduce((extraSum, extra) => {
          return extraSum + (extra.precio || 0);
        }, 0) || 0;

        return sum + precioProducto + precioExtras;
      }, 0);
    }
  }

  // 👉 Sumar precios de recetas seleccionadas usando `precio_venta`
  const subtotalRecetas = this.recetasSeleccionadas.reduce((sum, receta) => {
    return sum + (receta.precio_venta || 0);
  }, 0);

  subtotalCalculado += subtotalRecetas;

  this.subtotal = subtotalCalculado;

  // Calcular recargo si es tarjeta
  const recargo = this.formaPago === 'tarjeta' ? this.subtotal * 0.08 : 0;
  this.total = +(this.subtotal + recargo).toFixed(2);

  // Calcular vuelto si es efectivo
  if (this.formaPago === 'efectivo') {
    this.vuelto = +(this.montoRecibido - this.total).toFixed(2);
  } else {
    this.vuelto = 0;
  }
}

async pagarFactura() {
  if (!this.pedidoSeleccionado) return;

  // Validación: debe haber una caja abierta
  const cajaAbierta = await this.supabase.obtenerCajaAbiertas();
  if (!cajaAbierta) {
    await Swal.fire({
      icon: 'error',
      title: 'No hay caja abierta',
      text: 'Debe abrir una caja antes de realizar pagos.',
    });
    return;
  }

  // Si la forma de pago es crédito, guardar pedido primero
  if (this.formaPago === 'Credito') {
    const guardado = await this.guardarPedido();
    if (!guardado) {
      // Si no se guardó, no continuar con el pago/factura
      return;
    }
  }

  // Validación para transferencia
  if (this.formaPago === 'transferencia' && !this.codigoTransferencia?.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Código requerido',
      text: 'Debe ingresar el código de la transferencia',
    });
    return;
  }

  // Validación para efectivo
  if (this.formaPago === 'efectivo') {
    if (!this.montoRecibido || this.montoRecibido < this.total) {
      await Swal.fire({
        icon: 'warning',
        title: 'Monto insuficiente',
        text: 'Debe ingresar un monto recibido mayor o igual al total.',
      });
      return;
    }
  }

    this.calcularTotales();

    const productosPagados = this.pagoSeparado
      ? this.pedidoSeleccionado.productos.filter(p => p.asignado > 0)
      : this.pedidoSeleccionado.productos.map(p => ({ ...p, asignado: p.cantidad }));

    const extrasPagados = this.recetasSeleccionadas.map(receta => ({
      nombre: receta.nombre,
      precio: receta.precio_venta,
      cantidad: 1,
      total: receta.precio_venta
    }));

    // Incluir los extras en el total de cada producto
    const todosPagados = [
      ...productosPagados.map((p: Producto) => {
        const totalExtras = p.extras?.reduce((extraSum, extra) => extraSum + (extra.precio || 0), 0) || 0;

        return {
          nombre: p.nombre,
          precio: p.precio,
          cantidad: p.asignado,
          total: (p.precio * p.asignado) + totalExtras,
          extras: p.extras || []
        };
      }),
      ...extrasPagados
    ];

  const fechaHora = getLocalDateTimeString();

  const htmlFactura = `
    <div class="factura-container" style="width: 100%; margin: 0 auto; padding: 10px;">
      <img src="assets/splash/logo.jpg" alt="Logo" style="width: 85px; height: auto; margin-bottom: 5px;" />
      <h2 style="margin: 2px;">A FUEGO LENTO</h2>
      <p style="margin: 2px; font-size: 12px;">
        RUC: 1500956527001<br>
        📞 0958910306<br>
        📍 Av.Alfonso Almeida y Gabriela Mistral - Ibarra<br>
      </p>
      <hr style="border-top: 1px dashed black; margin: 4px 0; padding-right: 25px" />
      ${fechaHora}<br>
      <hr style="border-top: 1px dashed black; margin: 4px 0; padding-right: 25px" />
      <p style="font-size: 12px; text-align: left;">
        Mesa: ${this.pedidoSeleccionado?.mesa_id || '-'}<br>
        Vendedor: ${this.nombreUsuario || '---'}<br>
        Pago: ${this.formaPago.toUpperCase()}<br>
      </p>
      <hr style="border-top: 1px dashed black; margin: 4px 0; padding-right: 25px" />
      <table style="width: 100%; font-size: 12px; table-layout: fixed;">
        <thead>
          <tr>
            <th style="width: 15%; text-align: left;">Cant</th>
            <th style="width: 40%; text-align: left;">Producto</th>
            <th style="width: 30%; text-align: right; padding-right: 25px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${todosPagados.map((p: any) => `
            <tr>
              <td style="padding: 2px 4px;">${p.cantidad || 0}</td>
              <td style="padding: 2px 4px; white-space: normal; word-wrap: break-word; text-align: left;">
                ${p.nombre || 'Producto'}
                ${(Array.isArray(p.extras) && p.extras.length) ? `
                  <ul style="padding-left: 20px;">
                    ${p.extras.map((extra: any) => `<li>${extra?.nombre || 'Extra'}</li>`).join('')}
                  </ul>` : ''}
              </td>
              <td style="padding: 2px 4px; text-align: right; padding-right: 25px">
                $${(p.total || 0).toFixed(2)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <hr style="border-top: 1px dashed black; margin: 4px 0; padding-right: 25px" />
      <p style="text-align: right; font-size: 12px; padding-right: 25px">SUBTOTAL: $${this.subtotal.toFixed(2)}</p>

      ${this.formaPago === 'tarjeta' ? `
      <p style="text-align: right; font-size: 12px; padding-right: 25px;">
        RECARGO TARJETA (8%): $${(this.total - this.subtotal).toFixed(2)}
      </p>` : ''}

      <p style="text-align: right; font-size: 12px; padding-right: 25px"><strong>TOTAL: $${this.total.toFixed(2)}</strong></p>

      ${this.formaPago === 'efectivo' ? `
      <p style="text-align: right; font-size: 12px; padding-right: 25px">
        Recibido: $${this.montoRecibido.toFixed(2)}<br>
        Vuelto: $${this.vuelto.toFixed(2)}
      </p>` : ''}

      ${this.formaPago === 'transferencia' ? `
      <p style="text-align: right; font-size: 12px; padding-right: 25px">
        Código transferencia: ${this.codigoTransferencia}
      </p>` : ''}
      
      <hr style="border-top: 1px dashed black; margin: 4px 0;" />
      <p style="text-align: center; font-size: 11px; margin-top: 10px;">¡Gracias por su visita!</p>
      <p style="text-align: center; font-size: 10px;">Elaborado por Afuego Lento</p>
    </div>
  `;

  printJS({
    printable: htmlFactura,
    type: 'raw-html',
    style: `
      @media print {
        body {
          margin: 0;
          padding: 0;
          font-family: monospace;
        }
        .factura-container {
          width: auto;
          padding: 0;
          text-align: center;
          overflow: hidden;
        }
        @page {
          size: auto;
          margin: 0;
        }
        hr {
          border: none;
          border-top: 1px dashed #000;
        }
      }
    `
  });

  const numeroFactura = `FAC-${new Date().getTime()}`;

  const facturaData: any = {
    pedido_id: this.pedidoSeleccionado!.id,
    numero_factura: numeroFactura,
    forma_pago: this.formaPago,
    monto: this.total,
    productos: todosPagados,
    es_extra: this.recetasSeleccionadas.length > 0,
     fecha: fechaHora
  };

  if (this.codigoTransferencia?.trim()) {
    facturaData.codigo_transferencia = this.codigoTransferencia;
  }

  try {
    await this.supabase.crearFactura(facturaData);

    // Actualizar productos pagados y limpiar los asignados
    this.pedidoSeleccionado.productos = this.pedidoSeleccionado.productos
      .map((p: Producto) => {
        const cantidadPagada = this.pagoSeparado ? p.asignado : p.cantidad;
        if (cantidadPagada > 0) {
          p.cantidad -= cantidadPagada;
          p.asignado = 0;
        }
        return p;
      })
      .filter(p => p.cantidad > 0);

    // Verificar si ya no hay productos por pagar
    const todosPagados = this.pedidoSeleccionado.productos.length === 0;
    const nuevoEstado = todosPagados ? 'abierta' : 'ocupado';

    await this.supabase.actualizarPedido(this.pedidoSeleccionado.id, numeroFactura, nuevoEstado);
    this.pedidoSeleccionado.estado = nuevoEstado;
    await this.cargarMesasConPedidos();

  } catch (error) {
    console.error('Error al crear factura o actualizar pedido:', error);
  }

  this.recetasSeleccionadas = [];
  this.resetValores();

  if (this.pedidoSeleccionado.productos.length === 0) {
    this.pedidoSeleccionado = null;
  }
}
 
  togglePagoSeparado() {
    this.pagoSeparado = !this.pagoSeparado;
    this.calcularTotales();
  }
 
 async cargarClientesConPrecios() {
      try {
        const data = await this.supabase.obtenerClientesConPrecios();
    
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
          this.datosClienteConPrecios = await this.supabase.obtenerClienteConPrecios(this.clienteSeleccionadoId);
    
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
    async guardarPedido(): Promise<boolean> {
      try {
        if (!this.pedido.cliente_id) {
          await Swal.fire({
            icon: 'warning',
            title: 'Cliente requerido',
            text: 'Debe seleccionar un cliente antes de guardar el pedido.',
          });
          return false;
        }
    
        // Aseguramos que el total está actualizado
        this.calcularTotales();
    
        const almuerzosSeleccionados = this.pedidoSeleccionado?.productos.map((prod: any) => ({
          almuerzo_id: prod.almuerzo_id || prod.id,
          cantidad: prod.cantidad
        })) || [];
    
        if (almuerzosSeleccionados.length === 0) {
          await Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: 'No hay productos válidos en la factura para guardar como pedido.',
          });
          return false;
        }
    
        const pedidoParaEnviar = {
          cliente_id: this.pedido.cliente_id,
          fecha: this.pedido.fecha,
          estado_pago: this.pedido.estado_pago || 'pendiente',
        
          observaciones: (() => {
            const descripcionProductos = this.pedidoSeleccionado?.productos
              ?.map(prod => {
                const extrasTexto = prod.extras && prod.extras.length > 0
                  ? ` (Extras: ${prod.extras.map(e => e.nombre).join(', ')})`
                  : '';
                return `${prod.cantidad}x ${prod.nombre}${extrasTexto}`;
              })
              .join(', ') || '';
        
            const descripcionExtrasSueltos = this.recetasSeleccionadas && this.recetasSeleccionadas.length > 0
              ? ', Adicionales: ' + this.recetasSeleccionadas.map(r => r.nombre).join(', ')
              : '';
        
            return descripcionProductos + descripcionExtrasSueltos;
          })(),
        
          total: this.total,
        
          almuerzos: almuerzosSeleccionados
        };
        
    
        await this.supabase.crearPedidoAlmuerzos(pedidoParaEnviar);
    
        await Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Pedido creado correctamente!',
        });
    
        this.clienteBusqueda = '';
        this.clienteSeleccionadoId = null;
        this.pedido.cliente_id = null;
        this.clientesFiltrados = [];
    
        return true;
    
      } catch (error) {
        console.error('Error al guardar:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: (error as Error).message || 'Ocurrió un error inesperado',
        });
        return false;
      }
    }
    
    
}
function getFechaLocal(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function getLocalDateTimeString() {
  const ahora = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;
}