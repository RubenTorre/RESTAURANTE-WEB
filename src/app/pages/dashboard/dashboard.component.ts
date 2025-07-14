import { Component, ElementRef, ViewChild } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { Subject } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule,FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export default class DashboardComponent {
   private destroy$ = new Subject<void>();
  
  // Stats
  totalVentasHoy: number = 0;
  pedidosActivos: number = 0;
  gastosHoy: number = 0;
  balanceNeto: number = 0;
  totalVentasMes: number = 0;

  // Charts
  salesChart: any;
  expensesChart: any;
  
  // Top Products
  topProducts: any[] = [];
  
  // Low Stock
  lowStockProducts: any[] = [];
  
  // Recent Orders
  recentOrders: any[] = [];
  
  // Today's Reservations
  todaysReservations: any[] = [];
  
  // Loading states
  isLoadingStats: boolean = true;
  isLoadingCharts: boolean = true;
  isLoadingProducts: boolean = true;
  isLoadingOrders: boolean = true;
  isLoadingReservations: boolean = true;
  filtroPeriodo: 'diario' | 'semanal' | 'mensual' | 'anual' = 'mensual';
@ViewChild('ventasMetodoPagoChart') ventasMetodoPagoChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ventasGastosChart') ventasGastosChart!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;
  // Guarda los datos para el gráfico
  labels: string[] = [];
  ventasData: number[] = [];
  gastosData: number[] = [];
  periodo: 'dia' | 'mes' | 'anio' = 'dia';
  listaReservaciones: any[] = [];

  constructor(private supabase: SupabaseService, private router:Router) {
    Chart.register(...registerables);
  }
 ngAfterViewInit(): void {
    // Verificar que el elemento existe antes de usarlo
    if (this.ventasMetodoPagoChart?.nativeElement) {
      this.mostrarGraficoVentas(this.periodoSeleccionado);
    }
  }

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupRealtimeUpdates();
    this.cargarTopProductos();
    this.cargarReservaciones();
    
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.salesChart) this.salesChart.destroy();
    if (this.expensesChart) this.expensesChart.destroy();
  }

  private loadDashboardData(): void {
    this.loadStats();
    this.loadLowStockProducts();
    this.loadRecentOrders();
    this.loadTodaysReservations();
    this.loadDataAndPrepareChart();
  }
  

  private setupRealtimeUpdates(): void {
    // Escuchar cambios usando el método existente listenNotifications
    this.supabase.listenNotifications((notificacion) => {
      // Actualizar los datos relevantes según el tipo de notificación
      if (notificacion.mensaje.includes('pedido')) {
        this.loadStats();
        this.loadRecentOrders();
      }
      if (notificacion.mensaje.includes('inventario')) {
        this.loadLowStockProducts();
      }
    });
  }

  private async loadStats(): Promise<void> {
    this.isLoadingStats = true;
try {
  const ventasResponse = await this.supabase.obtenerFacturasHoy();
  const facturas = ventasResponse.data;
  if (Array.isArray(facturas)) {
    this.totalVentasHoy = facturas.reduce((sum, factura) => sum + (factura.monto || 0), 0);
  }
 // Ventas del mes
   const facturasMes = await this.supabase.getFacturas();
   
const hoy = new Date();
const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

const ventasDelMes = facturasMes.filter((factura: any) => {
  const fecha = new Date(factura.fecha);
  return fecha >= inicioMes && fecha <= hoy;
});

const totalVentasMes = ventasDelMes.reduce((sum, factura) => sum + (factura.total || 0), 0);
this.totalVentasMes = totalVentasMes;
      // Obtener gastos del día usando el método existente
      const gastosResponse = await this.supabase.obtenerGastosHoy();
      if (gastosResponse.data) {
        this.gastosHoy = gastosResponse.data.reduce((sum, gasto) => sum + (gasto.monto || 0), 0);
      }
      
      // Calcular balance neto
      this.balanceNeto = this.totalVentasHoy - this.gastosHoy;

      // Obtener pedidos activos usando el método existente
      const pedidosResponse = await this.supabase.getFacturasDelDia();
      if (Array.isArray(pedidosResponse)) {
        this.pedidosActivos = pedidosResponse.filter(p => p.estado !== 'abierta').length;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      this.isLoadingStats = false;
    }
  }
// Método para agrupar las ventas según el periodo y método de pago
private agruparVentasPorMetodoYPeriodo(facturas: any[], periodo: 'dia' | 'mes' | 'anio'): {[key: string]: number} {
  const ventasAgrupadas: {[key: string]: number} = {};
  const ahora = new Date();

  // Función auxiliar para obtener el lunes de la semana de una fecha
  function getMonday(d: Date): Date {
    const day = d.getDay(); // 0 domingo, 1 lunes, ...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta si es domingo
    return new Date(d.setDate(diff));
  }

  // Obtener lunes de la semana actual (para el filtro semanal)
  const lunesSemanaActual = getMonday(new Date(ahora));

  facturas.forEach(factura => {
    const fechaFactura = new Date(factura.fecha);
    const formaPago = factura.forma_pago || 'desconocido';
    const monto = factura.monto || 0;

    let incluir = false;
    let key = '';

    if (periodo === 'dia') {
      // Queremos una semana completa: del lunesSemanaActual al domingo (lunes + 6)
      const domingoSemanaActual = new Date(lunesSemanaActual);
      domingoSemanaActual.setDate(lunesSemanaActual.getDate() + 6);

      incluir = fechaFactura >= lunesSemanaActual && fechaFactura <= domingoSemanaActual;

      if (incluir) {
        // Clave será: "DiaDeLaSemana|MétodoDePago" (ej: "Lunes|efectivo")
        const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const nombreDia = diasSemana[fechaFactura.getDay()];
        key = `${nombreDia}|${formaPago}`;
      }

    } else if (periodo === 'mes') {
      // Filtrar mes actual
      incluir = fechaFactura.getFullYear() === ahora.getFullYear() &&
                fechaFactura.getMonth() === ahora.getMonth();

      if (incluir) {
        // Calcular la semana del mes (1 a 5)
        const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const semanaDelMes = Math.ceil( (fechaFactura.getDate() + primerDiaMes.getDay()) / 7 );
        key = `Semana ${semanaDelMes}|${formaPago}`;
      }

    } else if (periodo === 'anio') {
      incluir = fechaFactura.getFullYear() === ahora.getFullYear();

      if (incluir) {
        // Clave: "Mes|MétodoDePago" (ej: "Enero|efectivo")
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const nombreMes = meses[fechaFactura.getMonth()];
        key = `${nombreMes}|${formaPago}`;
      }
    }

    if (incluir) {
      ventasAgrupadas[key] = (ventasAgrupadas[key] || 0) + monto;
    }
  });

  return ventasAgrupadas;
}

private ventasChart: any; // arriba en tu componente

private async mostrarGraficoVentas(periodo: 'dia' | 'mes' | 'anio') {
  try {
    const facturas = await this.supabase.obtenerTodasFacturas();
    const agrupadas = this.agruparVentasPorMetodoYPeriodo(facturas, periodo);

    // Extraer todos los labels (unidad temporal) y métodos de pago únicos
    const labelsSet = new Set<string>();
    const metodosPagoSet = new Set<string>();

    Object.keys(agrupadas).forEach(key => {
      const [tiempo, metodo] = key.split('|');
      labelsSet.add(tiempo);
      metodosPagoSet.add(metodo);
    });

    // Ordenar labels según el periodo para que el gráfico tenga orden lógico
    let labels: string[] = Array.from(labelsSet);
    if (periodo === 'dia') {
  labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    } else if (periodo === 'mes') {
      labels.sort((a, b) => {
        const numA = parseInt(a.replace('Semana ', ''), 10);
        const numB = parseInt(b.replace('Semana ', ''), 10);
        return numA - numB;
      });
    } else if (periodo === 'anio') {
      const mesesOrden = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      labels = mesesOrden.filter(m => labels.includes(m));
    }

    const metodosPago = Array.from(metodosPagoSet);

    // Colores profesionales modernos
    const coloresProfesionales = [
      '#2563EB', // Azul profesional
      '#059669', // Verde esmeralda  
      '#DC2626', // Rojo corporativo
      '#7C3AED', // Púrpura elegante
      '#EA580C', // Naranja vibrante
      '#0891B2', // Cian profesional
      '#BE185D', // Rosa corporativo
      '#65A30D', // Verde lima
      '#9333EA', // Violeta moderno
      '#0F766E'  // Verde azulado
    ];

    const datasets = metodosPago.map((metodo, idx) => {
      const data = labels.map(label => agrupadas[`${label}|${metodo}`] || 0);
      return {
        label: metodo,
        data,
        backgroundColor: coloresProfesionales[idx % coloresProfesionales.length],
        borderRadius: 8,
        borderWidth: 0
      };
    });

    if (this.ventasChart) {
      this.ventasChart.destroy();
    }

    const ctx = this.ventasMetodoPagoChart?.nativeElement?.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener el contexto del canvas');
      return;
    }

    this.ventasChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                size: 14,
                weight: 'bold'
              },
              color: '#374151',
              padding: 20
            }
          },
          title: {
            display: true,
            text: `Ventas por método de pago - ${this.getPeriodoText(periodo)}`,
            font: {
              size: 20,
              weight: 'bold'
            },
            color: '#111827',
            padding: 20
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#111827',
            bodyColor: '#374151',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            callbacks: {
              label: context => {
                const value = context.parsed.y ?? 0;
                return `${context.dataset.label}: $${value.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#6B7280',
              font: {
                size: 12,
                weight: 'bold'
              },
              callback: value => `$${value.toLocaleString()}`
            },
            grid: {
              color: '#F3F4F6'
            }
          },
          x: {
            ticks: {
              color: '#6B7280',
              font: {
                size: 12,
                weight: 'bold'
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error al mostrar gráfico de ventas:', error);
  }
}

private getPeriodoText(periodo: 'dia' | 'mes' | 'anio'): string {
  const ahora = new Date();

  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const mesesAno = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  switch(periodo) {
    case 'dia':
      return diasSemana[ahora.getDay()]; // getDay() devuelve 0 (domingo) a 6 (sábado)
    case 'mes':
      return mesesAno[ahora.getMonth()]; // getMonth() 0-11
    case 'anio':
      return ahora.getFullYear().toString();
    default:
      return periodo;
  }
}

periodoSeleccionado: 'dia' | 'mes' | 'anio' = 'dia'; // valor inicial

  

  cambiarPeriodo(periodo: 'dia' | 'mes' | 'anio') {
    this.periodoSeleccionado = periodo;
    this.mostrarGraficoVentas(periodo);
  }

getTituloPeriodo(): string {
  switch(this.periodoSeleccionado) {
    case 'dia':
      return 'Ventas Diarias';
    case 'mes':
      return 'Ventas Mensuales';
    case 'anio':
      return 'Ventas Anuales';
    default:
      return 'Ventas';
  }
}

 


private async loadLowStockProducts(): Promise<void> {
  try {
    const productos = await this.supabase.obtenerProductos();

    if (Array.isArray(productos)) {
      this.lowStockProducts = productos
        .filter(p => Number(p.stock_actual) <= Number(p.stock_minimo))
        .map(p => ({
          ...p,
          nivel: Number(p.stock_actual) < 5 ? 'crítico' : 'bajo'
        }))
        .sort((a, b) => Number(a.stock_actual) - Number(b.stock_actual));

      if (this.lowStockProducts.length > 0) {
        const lastAlert = localStorage.getItem('lastLowStockAlert');
        const now = Date.now();

        if (!lastAlert || now - Number(lastAlert) > 5000) {
          // Construir texto con detalle de productos
          const detalleProductos = this.lowStockProducts
            .map(p => `- ${p.nombre} (${p.nivel}, stock: ${p.stock_actual})`)
            .join('\n');

         Swal.fire({
  title: '<i class="fas fa-exclamation-triangle" style="color: #dc2626;"></i> Stock Bajo Detectado',
  html: `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; text-align: left; padding: 0 10px;">
      <p style="color: #374151; font-size: 16px; margin-bottom: 20px; font-weight: 500; text-align: center;">
        Los siguientes productos requieren reposición inmediata:
      </p>
      <div style="background: #f9fafb; border-radius: 12px; padding: 16px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
        <pre style="
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; 
          font-size: 14px; 
          line-height: 1.6; 
          color: #111827; 
          margin: 0; 
          white-space: pre-wrap; 
          background: transparent;
          border: none;
          padding: 0;
        ">${detalleProductos}</pre>
      </div>
      <div style="
        background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); 
        border: 1px solid #f59e0b; 
        border-radius: 8px; 
        padding: 12px; 
        text-align: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      ">
        <small style="color: #92400e; font-weight: 600; font-size: 13px;">
          💡 Recomendamos reabastecer estos productos lo antes posible
        </small>
      </div>
    </div>
  `,
  icon: 'warning',
  confirmButtonText: '✓ Entendido',
  background: '#ffffff',
  confirmButtonColor: '#059669',
  buttonsStyling: true,
  customClass: {
    popup: 'swal2-restaurant-alert',
    title: 'swal2-restaurant-title',
    htmlContainer: 'swal2-restaurant-content',
    confirmButton: 'swal2-restaurant-button'
  },
  didOpen: () => {
    // Inyectar estilos CSS personalizados
    const style = document.createElement('style');
    style.textContent = `
      .swal2-restaurant-alert {
        border-radius: 16px !important;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
      }
      
      .swal2-restaurant-title {
        color: #dc2626 !important;
        font-size: 24px !important;
        font-weight: 600 !important;
        margin-bottom: 16px !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
      }
      
      .swal2-restaurant-content {
        margin: 0 !important;
        padding: 0 !important;
      }
      
      .swal2-restaurant-button {
        border-radius: 8px !important;
        font-weight: 600 !important;
        padding: 12px 24px !important;
        font-size: 16px !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        transition: all 0.2s ease !important;
      }
      
      .swal2-restaurant-button:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.15) !important;
      }
      
      .swal2-icon.swal2-warning {
        border-color: #f59e0b !important;
        color: #f59e0b !important;
      }
    `;
    document.head.appendChild(style);
  }
}).then(() => {
            localStorage.setItem('lastLowStockAlert', now.toString());
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading low stock products:', error);
  }
}

  private async loadRecentOrders(): Promise<void> {
    this.isLoadingOrders = true;
    try {
      // Usar el método existente getFacturasDelDia()
      const pedidos = await this.supabase.getFacturasDelDia();
      if (Array.isArray(pedidos)) {
        this.recentOrders = pedidos
          .slice(0, 4)
          .map(p => ({
            id: p.id,
            numero: p.numero_factura,
            cliente: p.mesero_nombre || 'Sin cliente',
            fecha: new Date(p.fecha).toLocaleString(),
            estado: p.estado || 'pendiente',
            total: p.total
          }));
      }
    } catch (error) {
      console.error('Error loading recent orders:', error);
    } finally {
      this.isLoadingOrders = false;
    }
  }

  private async loadTodaysReservations(): Promise<void> {
    this.isLoadingReservations = true;
    try {
      // Datos simulados ya que no hay método para reservas
      this.todaysReservations = [
        { mesa: 'Mesa 5 - 4 personas', cliente: 'Familia Rodríguez', hora: '13:30', motivo: 'Celebración de cumpleaños' },
        { mesa: 'Mesa 8 - 2 personas', cliente: 'Sr. y Sra. Gómez', hora: '14:00', motivo: 'Aniversario' },
        { mesa: 'Mesa 12 - 6 personas', cliente: 'Grupo Empresarial', hora: '20:30', motivo: 'Cena de negocios' }
      ];
    } catch (error) {
      console.error('Error loading today\'s reservations:', error);
    } finally {
      this.isLoadingReservations = false;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en preparación':
        return 'bg-blue-100 text-blue-800';
      case 'completado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pendiente':
        return 'Pendiente';
      case 'en preparación':
        return 'En preparación';
      case 'completado':
        return 'Completado';
      default:
        return status;
    }
  }

  getAlertClass(nivel: string): string {
    return nivel === 'crítico' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500';
  }

  getAlertIcon(nivel: string): string {
    return nivel === 'crítico' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle';
  }
 

async cargarTopProductos() {
  this.isLoadingProducts = true;
  const facturas = await this.supabase.obtenerTodasFacturas();

  const hoy = new Date();
  let filtrarPor: (fecha: string) => boolean;


  if (this.filtroPeriodo === 'diario') {
    filtrarPor = (fecha) => new Date(fecha).toDateString() === hoy.toDateString();
  } else if (this.filtroPeriodo === 'semanal') {
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo
    inicioSemana.setHours(0, 0, 0, 0);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);


    filtrarPor = (fecha) => {
      const f = new Date(fecha);
      return f >= inicioSemana && f <= finSemana;
    };
  } else if (this.filtroPeriodo === 'mensual') {
    filtrarPor = (fecha) => {
      const f = new Date(fecha);
      return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
    };
  } else if (this.filtroPeriodo === 'anual') {
    filtrarPor = (fecha) => new Date(fecha).getFullYear() === hoy.getFullYear();
  } else {
    console.warn('Periodo no reconocido:', this.filtroPeriodo);
    filtrarPor = () => false;
  }

  const facturasFiltradas = facturas.filter(
    f => filtrarPor(f.fecha) && Array.isArray(f.productos) && f.productos.length > 0
  );


  this.topProducts = this.procesarProductosMasVendidos(facturasFiltradas);
  this.isLoadingProducts = false;


}
procesarProductosMasVendidos(facturas: any[]) {
  const contador: Record<string, { nombre: string; cantidad: number; total: number }> = {};
  const excluir = ['solo sopa', 'solo segundo', 'media sopa + segundo', 'almuerzo completo'];

  for (const factura of facturas) {
    for (const producto of factura.productos) {
      const nombreOriginal = producto.nombre.trim();
      const nombreKey = nombreOriginal.toLowerCase();

      if (excluir.some(k => nombreKey.includes(k))) continue;

      if (!contador[nombreKey]) {
        contador[nombreKey] = {
          nombre: nombreOriginal,
          cantidad: 0,
          total: 0
        };
      }

      contador[nombreKey].cantidad += producto.cantidad;
      contador[nombreKey].total += producto.total ?? producto.precio * producto.cantidad;
    }
  }

  const productos = Object.values(contador)
    // Cambia el criterio de orden si quieres priorizar "total" en lugar de "cantidad"
    .sort((a, b) => b.cantidad - a.cantidad);

  const maxCantidad = productos[0]?.cantidad || 1;

  return productos.slice(0, 5).map(p => ({
    nombre: p.nombre,
    vendidos: p.cantidad,
    total: p.total,
    porcentaje: (p.cantidad / maxCantidad) * 100
  }));
}
async loadDataAndPrepareChart(periodo: 'dia' | 'mes' | 'anio' = 'dia') {
  this.periodo = periodo;

  const facturas = await this.supabase.obtenerTodasFacturas();
  const gastosResponse = await this.supabase.obtenerGastos();
  const gastos = gastosResponse.data || [];

  const ahora = new Date();
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Agrupar por período según el filtro
  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    if (periodo === 'dia') return fecha.toISOString().slice(0, 10); // YYYY-MM-DD
    if (periodo === 'mes') return fecha.toISOString().slice(0, 10); // mismo formato, pero agrupamos dentro del mes
    if (periodo === 'anio') return `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`; // YYYY-MM
    return '';
  };

  const filtrarPorPeriodo = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    if (periodo === 'dia') return true; // ya filtramos abajo por los 7 días
    if (periodo === 'mes') return fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth();
    if (periodo === 'anio') return fecha.getFullYear() === ahora.getFullYear();
    return false;
  };

  const agruparMontos = (items: any[]) => {
    const mapa: Record<string, number> = {};
    for (const item of items) {
      const fechaStr = formatearFecha(item.fecha);
      if (filtrarPorPeriodo(item.fecha)) {
        mapa[fechaStr] = (mapa[fechaStr] || 0) + Number(item.monto);
      }
    }
    return mapa;
  };

  const ventas = agruparMontos(facturas);
  const gastosMap = agruparMontos(gastos);

  let etiquetas: string[] = [];
  let datosVentas: number[] = [];
  let datosGastos: number[] = [];

if (periodo === 'dia') {
  const lunes = new Date(ahora);
  const day = ahora.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  const diff = (day === 0 ? -6 : 1 - day); // retrocede hasta lunes
  lunes.setDate(ahora.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    const fechaStr = fecha.toISOString().slice(0, 10);
    etiquetas.push(diasSemana[fecha.getDay()]);
    datosVentas.push(ventas[fechaStr] || 0);
    datosGastos.push(gastosMap[fechaStr] || 0);
  }

  } else if (periodo === 'mes') {
    // Días del mes actual
    const diasDelMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= diasDelMes; i++) {
      const fechaStr = `${ahora.getFullYear()}-${(ahora.getMonth() + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      etiquetas.push(i.toString());
      datosVentas.push(ventas[fechaStr] || 0);
      datosGastos.push(gastosMap[fechaStr] || 0);
    }
  } else if (periodo === 'anio') {
    // Meses del año actual
    for (let i = 0; i < 12; i++) {
      const key = `${ahora.getFullYear()}-${(i + 1).toString().padStart(2, '0')}`;
      etiquetas.push(meses[i]);
      datosVentas.push(ventas[key] || 0);
      datosGastos.push(gastosMap[key] || 0);
    }
  }

  if (this.chart) {
    this.chart.destroy();
  }

  this.chart = new Chart(this.ventasGastosChart.nativeElement.getContext('2d')!, {
    type: 'line',
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: 'Ventas',
          data: datosVentas,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Gastos',
          data: datosGastos,
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    },
   options: {
  responsive: true,
  maintainAspectRatio: false, // Esto es CLAVE para que llene el contenedor
  interaction: {
    mode: 'index',
    intersect: false,
  },
  layout: {
    padding: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: periodo === 'dia' ? 'Días de la semana' : (periodo === 'mes' ? 'Días del mes' : 'Meses del año'),
        font: { size: 12 },
      },
      ticks: {
        maxRotation: 0,
        autoSkip: true,
      },
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Monto ($)',
        font: { size: 12 },
      },
      ticks: {
        stepSize: 100, // opcional
      },
    },
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        boxWidth: 12,
        font: { size: 13 },
      },
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function (context: any) {
          const label = context.dataset.label || '';
          const value = context.formattedValue;
          return `${label}: $${value}`;
        },
      },
    },
  },
}

  });
}


  // Función para formatear fecha según el periodo
    formatearFecha(fechaISO: string, periodo: 'dia' | 'mes' | 'anio'): string {
      const fecha = new Date(fechaISO);
      switch (periodo) {
        case 'dia':
          return fecha.toISOString().slice(0, 10); // YYYY-MM-DD
        case 'mes':
          return fecha.toISOString().slice(0, 7);  // YYYY-MM
        case 'anio':
          return fecha.getFullYear().toString();   // YYYY
        default:
          return fecha.toISOString().slice(0, 10);
      }
    }

reservacionesDelMes: any[] = [];

async cargarReservaciones() {
  this.isLoadingReservations = true;

  const resultado = await this.supabase.obtenerReservaciones();

  if (resultado.error) {
    this.isLoadingReservations = false;
    return;
  }

  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const añoActual = ahora.getFullYear();

  this.reservacionesDelMes = (resultado.data ?? []).filter(r => {
    if (r.estado !== 'confirmado') return false;
    const fecha = new Date(r.fecha);
    return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
  });

  this.isLoadingReservations = false;
}

irAReservaciones() {
  this.router.navigate(['/menu/reservaciones']);
}




}
