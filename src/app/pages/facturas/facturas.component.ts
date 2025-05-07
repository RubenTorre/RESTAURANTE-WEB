import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../Services/supabase.service';
import printJS from 'print-js';
import { UserService } from '../../Services/user.service';

interface Producto {
  nombre: string;
  precio: number;
  cantidad: number;
  asignado: number;
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
interface FacturaData {
  pedido_id: string;  // UUID del pedido
  numero_factura: string;
  forma_pago: 'efectivo' | 'tarjeta' | 'transferencia';  // Forma de pago seleccionada
  monto: number;  // El monto total de la factura
  monto_recibido?: number;  // Solo para 'efectivo', monto recibido
  codigo_transferencia?: string;  // Solo para 'transferencia', el código de comprobante
  productos?: ProductoFactura[];  // Lista de productos
  es_extra?: boolean;  // Si tiene productos extras
}
interface ProductoFactura {
  nombre: string;
  precio: number;
  cantidad: number;
  total: number;
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
  formaPago: 'efectivo' | 'transferencia' | 'tarjeta' = 'efectivo';

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
 

  constructor(private supabase: SupabaseService,private userService: UserService) {}

  async ngOnInit() {
    this.userService.nombreUsuario$.subscribe(nombre => {
      this.nombreUsuario = nombre;  });
    await this.cargarMesasConPedidos();
    await this.cargarRecetas();
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
 // En tu componente

recetaSeleccionada: any = null;
mostrarLista: boolean = false;





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
          return sum + p.precio * (p.asignado || 0);
        }, 0);
      } else {
        subtotalCalculado += this.pedidoSeleccionado.productos.reduce((sum, p) => {
          return sum + p.precio * p.cantidad;
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

    if (this.formaPago === 'transferencia' && !this.codigoTransferencia.trim()) {
        alert('Debe ingresar el código de la transferencia');
        return;
    }

    this.calcularTotales();

    const productosPagados = this.pagoSeparado
        ? this.pedidoSeleccionado.productos.filter(p => p.asignado > 0)
        : this.pedidoSeleccionado.productos.map(p => ({ ...p, asignado: p.cantidad }));

    const extrasPagados = this.recetasSeleccionadas.map(receta => ({
        nombre: receta.nombre + ' (Extra)',
        precio: receta.precio_venta,
        cantidad: 1,
        total: receta.precio_venta
    }));

    const todosPagados = [
        ...productosPagados.map((p: Producto) => ({
            nombre: p.nombre,
            precio: p.precio,
            cantidad: p.asignado,
            total: p.precio * p.asignado
        })),
        ...extrasPagados
    ];

    const fechaHora = new Date().toLocaleString();

    const htmlFactura = `
    <div class="factura-container" style="width: 100%; margin: 0 auto; padding: 10px;">
      <img src="assets/splash/logo.jpg" alt="Logo" style="width: 85px; height: auto; margin-bottom: 5px;" />
      <h2 style="margin: 2px;">A FUEGO LENTO</h2>
      <p style="margin: 2px; font-size: 12px;">
        RUC: 1234567890001<br>
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
              <td style="padding: 2px 4px;">${p.cantidad}</td>
              <td style="padding: 2px 4px; white-space: normal; word-wrap: break-word; text-align: left;">${p.nombre}</td>
              <td style="padding: 2px 4px; text-align: right; padding-right: 25px">$${p.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <hr style="border-top: 1px dashed black; margin: 4px 0; padding-right: 25px" />
      <p style="text-align: right; font-size: 12px; padding-right: 25px ">SUBTOTAL: $${this.subtotal.toFixed(2)}</p>
      <p style="text-align: right; font-size: 12px; padding-right: 25px"><strong>TOTAL: $${this.total.toFixed(2)}</strong></p>
      ${this.formaPago === 'efectivo' ? `
        <p style="text-align: right; font-size: 12px; padding-right: 25px">
          Recibido: $${this.montoRecibido.toFixed(2)}<br>
          Vuelto: $${this.vuelto.toFixed(2)}
        </p>
      ` : ''}
      ${this.formaPago === 'transferencia' ? `
        <p style="text-align: right; font-size: 12px; padding-right: 25px">
          Código transferencia: ${this.codigoTransferencia}
        </p>
      ` : ''}
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

    // Generar un número de factura único
    const numeroFactura = `FAC-${new Date().getTime()}`; // Número único basado en el timestamp
    const facturaData = {
        pedido_id: this.pedidoSeleccionado.id, // ID del pedido
        numero_factura: numeroFactura, // Número de la factura
        forma_pago: this.formaPago, // Forma de pago
        monto: this.total, // Monto total
        productos: todosPagados, // Productos de la factura
        es_extra: this.recetasSeleccionadas.length > 0, // Si hay productos adicionales
        codigo_transferencia:this.codigoTransferencia,
    };

    try {
      // Llamar a SupabaseService para crear la factura
      const factura = await this.supabase.crearFactura(facturaData);
      console.log('Factura creada con éxito:', factura);
  
      // Actualizar el pedido con el número de factura y estado 'pagado'
      await this.supabase.actualizarPedido(this.pedidoSeleccionado.id, numeroFactura);
      console.log('Pedido actualizado con número de factura');
  } catch (error) {
      console.error('Error al crear factura o actualizar pedido:', error);
  }
  

    // Actualizar los productos del pedido después del pago
    this.pedidoSeleccionado.productos = this.pedidoSeleccionado.productos.map((p: Producto) => {
        const cantidadPagada = this.pagoSeparado ? p.asignado : p.cantidad;
        if (cantidadPagada > 0) {
            p.cantidad -= cantidadPagada;
            p.asignado = 0;
        }
        return p;
    }).filter(p => p.cantidad > 0);

    this.recetasSeleccionadas = [];
    this.resetValores();

    // Si ya no hay productos en el pedido, marcar el pedido como pagado
    if (this.pedidoSeleccionado.productos.length === 0) {
        this.pedidoSeleccionado.estado = 'pagado';
        this.pedidoSeleccionado = null;
    }
}

  
  
  togglePagoSeparado() {
    this.pagoSeparado = !this.pagoSeparado;
    this.calcularTotales();
  }
}
