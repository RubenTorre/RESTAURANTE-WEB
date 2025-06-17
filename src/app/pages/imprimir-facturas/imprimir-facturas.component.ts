import { Component } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import printJS from 'print-js';

export interface Producto {
  cantidad: number;
  nombre: string;
  precio?: number; // Si usas precio en el ticket
  modificaciones?: string[]; // ← Las modificaciones que quitarán algo del plato
  extras?: {
    nombre: string;
    precio: number;
  }[]; // ← Extras añadidos al producto
}

export interface Pedido {
  mesa_id: number;
  mesero_nombre: string;
  fecha: string | Date;
  productos: Producto[];
  estado: string;
  total?: number;
  forma_pago?: string;
  numero_factura?: string;
}

@Component({
  selector: 'app-imprimir-facturas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './imprimir-facturas.component.html',
  styleUrl: './imprimir-facturas.component.css'
})
export default class ImprimirFacturasComponent {
  pedidosDelDia: Pedido[] = [];
  pedidoSeleccionado: Pedido | null = null;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.cargarPedidosDelDia();
  }

  async cargarPedidosDelDia() {
    const pedidos = await this.supabaseService.getFacturasDelDia();
    this.pedidosDelDia = pedidos.filter((p: Pedido) => p.estado === 'ocupada');
    console.log(this.pedidosDelDia)
  }
getHoraCruda(fecha?: string | Date): string {
  if (!fecha) {
    return '';
  }
  if (typeof fecha === 'string') {
    return fecha.substring(11, 19);
  } else {
    return fecha.toISOString().substring(11, 19);
  }
}


  abrirModal(pedido: Pedido) {
    this.pedidoSeleccionado = pedido;
  }

  cerrarModal() {
    this.pedidoSeleccionado = null;
  }
getNombrePlataforma(mesaId: number): string {
  if (mesaId === 30) return 'Pedidos Ya';
  if (mesaId === 31) return 'Pedidos Beez';
  return '';
}

  imprimirTicket() {
    if (!this.pedidoSeleccionado) return;
   const hora = this.getHoraCruda(this.pedidoSeleccionado.fecha);
   const plataforma = this.getNombrePlataforma(this.pedidoSeleccionado.mesa_id);
const plataformaTexto = plataforma ? ` - ${plataforma}` : ''
    const content = `
      <div id="ticket-termico">
        <h3 class="text-center font-bold mb-1">Ticket Cocina</h3>
       <p class="text-center mb-1">Mesa ${this.pedidoSeleccionado.mesa_id}${plataformaTexto}</p>
        <p class="mb-2 text-center">🕒 ${hora}</p>
        <p class="mb-1">Mesero: ${this.pedidoSeleccionado.mesero_nombre}</p>
        <hr>
  
        <!-- Encabezado de columnas -->
        <div class="row header">
          <span class="col-producto font-bold underline">Producto</span>
          <span class="col-cant font-bold underline text-right">Cantidad</span>
        </div>
  
        ${this.pedidoSeleccionado.productos.map((prod: any) => `
          <div class="row">
            <span class="col-producto">${prod.nombre}</span>
            <span class="col-cant">${prod.cantidad}x</span>
          </div>
  
          ${prod.modificaciones?.length ? `
            <div class="sub-info">
              <ul>
                ${prod.modificaciones.map((mod: string) => `<li>${mod}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
  
          ${prod.extras?.length ? `
            <div class="sub-info">
              <ul>
                ${prod.extras.map((extra: any) => `
                  <li>${extra.nombre}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
  
          <div class="product-separator"></div>
        `).join('')}
        <div class="espacio-corte"></div>
      </div>
    `;
  
    printJS({
      printable: content,
      type: 'raw-html',
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
          color: #000;
        }
  
        #ticket-termico {
          padding: 0 6px;
        }
  
        .text-center {
          text-align: center;
        }
  
        .font-bold {
          font-weight: bold;
        }
  
        .underline {
          text-decoration: underline;
        }
  
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
  
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
  
        .header {
          margin-top: 6px;
          margin-bottom: 6px;
        }
  
        .col-producto {
          flex-grow: 1;
          padding-right: 5px;
          white-space: normal;
          word-wrap: break-word;
        }
  
        .col-cant {
          width: 40%;
          text-align: right;
          padding-left: 15px;
          padding-right: 25px;
          white-space: nowrap;
        }
  
        .sub-info {
          margin-left: 8px;
          font-size: 11px;
          margin-bottom: 3px;
        }
  
        .sub-info ul {
          padding-left: 12px;
          margin: 0;
        }
  
        .product-separator {
          border-bottom: 1px dashed #000;
          margin: 6px 0;
        }
  
        .espacio-corte {
          height: 80px;
        }
  
        hr {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
      `,
      scanStyles: false
    });
  
    this.cerrarModal();
  }
  
  
  
}