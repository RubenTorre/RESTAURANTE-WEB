import { Component } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import printJS from 'print-js';

interface Producto {
  cantidad: number;
  nombre: string;
  // Agrega otras propiedades si las hay
}

interface Pedido {
  mesa_id: number;
  mesero_nombre: string;
  fecha: string | Date;
  productos: Producto[];
  estado: string;
  // Agrega otras propiedades si las hay
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
    console.log('pedidos', this.pedidosDelDia);
  }

  abrirModal(pedido: Pedido) {
    this.pedidoSeleccionado = pedido;
  }

  cerrarModal() {
    this.pedidoSeleccionado = null;
  }

  imprimirTicket() {
    if (!this.pedidoSeleccionado) return;
  
    const content = `
      <div id="ticket-termico">
        <h3 class="text-center font-bold mb-1">Ticket Cocina</h3>
        <p class="text-center mb-1">Mesa ${this.pedidoSeleccionado.mesa_id}</p>
        <p class="mb-2 text-center">🕒 ${new Date(this.pedidoSeleccionado.fecha).toLocaleTimeString()}</p>
        <p class="mb-1">Mesero: ${this.pedidoSeleccionado.mesero_nombre}</p>
        <hr>
        ${this.pedidoSeleccionado.productos.map((prod: Producto) => `
          <div class="row">
            <span class="col-producto">${prod.nombre}</span>
            <span class="col-cant">${prod.cantidad}x</span>
          </div>
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
          word-wrap: break-word;
        }
  
        .col-producto {
          flex-grow: 1;
          text-align: left;
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