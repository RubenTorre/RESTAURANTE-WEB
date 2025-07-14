import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../Services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LOCALE_ID } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LoaderComponent } from '../../loader/loader.component';
import Swal from 'sweetalert2';
interface FiltroStock {
  categoria?: string;
  nivel?: EstadoStock;
}
type EstadoStock = 'critico' | 'agotado' | 'suficiente' | 'todos';

registerLocaleData(localeEs)

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: any; // O define el tipo correcto si quieres ser más estricto
  }
}
@Component({
  selector: 'app-reportes',
  imports: [CommonModule, FormsModule, LoaderComponent],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css',
  providers: [
    { provide: LOCALE_ID, useValue: 'es' }
  ],
})
export default class ReportesComponent {
  mostrarModalFechas: boolean = false;

  // Filtros
  anioSeleccionado: number = new Date().getFullYear();
  mesSeleccionado: number | null = new Date().getMonth() + 1;
  fechaInicio: string = '';
  fechaFin: string = '';

  // Arrays para selects
  mesesDelAnio: string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Años disponibles (ejemplo, 5 años atrás hasta año actual)
  aniosDisponibles: number[] = [];
  filtroStock = {
    categoria: '',
    nivel: '',
  };

  periodosRapidos = [
    { label: 'Este mes', value: 'esteMes' },
    { label: 'Mes pasado', value: 'mesPasado' },
    { label: 'Este año', value: 'esteAnio' },
    { label: 'Año pasado', value: 'anioPasado' },
  ];
  filtros = this.obtenerFiltrosVacios();
  filtro = this.obteneFiltrosVacios();
  meses = [
    { value: 1, nombre: 'Enero' },
    { value: 2, nombre: 'Febrero' },
    { value: 3, nombre: 'Marzo' },
    { value: 4, nombre: 'Abril' },
    { value: 5, nombre: 'Mayo' },
    { value: 6, nombre: 'Junio' },
    { value: 7, nombre: 'Julio' },
    { value: 8, nombre: 'Agosto' },
    { value: 9, nombre: 'Septiembre' },
    { value: 10, nombre: 'Octubre' },
    { value: 11, nombre: 'Noviembre' },
    { value: 12, nombre: 'Diciembre' },
  ];
  facturasFiltradas: any[] = [];
  anios: number[] = [];
  semanasDelMes: { valor: string; nombre: string }[] = [];

  periodoSeleccionado: string | null = null;
  mostrarTabla: boolean = false;
  // Resultado del reporte
  resultadoReservas: any[] = [];
  modalAbierto: boolean = false;             // Para mostrar u ocultar el modal de filtros
  reporteActivo: string = '';                // Para saber qué reporte se está generando (ventas, reservas, etc.)

  mostrarModalResultados = false;
  cargandoVentas: boolean = false;
  cargandoReservas: boolean = false;
  cargandoProductos: boolean = false;
  cargandoClientes: boolean = false;
  cargandoPersonal: boolean = false;
  cargandoCaja: boolean = false;
  cargandoPersonalizado: boolean = false;
  mostrarModalProductosMasVendidos: boolean = false;
  productosMasVendidos: any[] = [];
  mostrarModalSeleccionProductos: boolean = false;
  mostrarModalStock: boolean = false;
  tipoReporteProductos: string = ''; // 'mas-vendidos' | 'stock'
  productosStock: any[] = [];
  productosFiltrados: any[] = [];
  categorias: any[] = [];
  busquedaRealizada: boolean = false;
  busquedaElemento: string = '';
  mostrarListaElementos: boolean = false;
  elementosFiltrados: any[] = [];
  elementosDropdown: any[] = []; // ← Proveedores y usuarios
  elementoSeleccionado: any = null;
  usuarios: any[] = [];
  proveedores: any[] = [];
  mostrarModalGastos = false;
  gastosFiltrados: any[] = [];  // Aquí cargas tus gastos
  fechaActual: Date = new Date();
  rangoPeriodo: string = '';
  resumenFormasPago: { [forma: string]: number } = {};
  titulosReportes: { [key: string]: string } = {
    ventas: 'Reporte de Ventas',
    reservas: 'Reporte de Reservas',
    productos: 'Reporte de Productos',
    clientes: 'Reporte de Clientes',
    personal: 'Reporte de Personal',
    movimientosCaja: 'Reporte de Movimientos de Caja',
    personalizado: 'Reporte Personalizado',
  };
  pedidosFiltrados: any[] = [];
  resumenCaja: {
    totalPedidosPagados: number;
    totalPedidosPendientes: number;
    totalFacturas: number;
    totalGastos: number;
    saldoFinal: number;
  } = {
      totalPedidosPagados: 0,
      totalPedidosPendientes: 0,
      totalFacturas: 0,
      totalGastos: 0,
      saldoFinal: 0
    };


  modalReporteCajaAbierto = false;
  constructor(private reportesService: SupabaseService) { }

  ngOnInit(): void {
    this.generarAniosDisponibles();
    this.calcularRangoMesActual();
    this.cargarCategorias();
    this.cargarDatosDropdown();
    const yearActual = new Date().getFullYear();
    for (let y = yearActual - 10; y <= yearActual + 10; y++) {
      this.anios.push(y);
    }
  }
  generarAniosDisponibles(): void {
    const añoActual = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.aniosDisponibles.push(añoActual - i);
    }
  }
  abrirModalFechas(): void {
    this.mostrarModalFechas = true;
    this.calcularRangoMesActual();
    this.periodoSeleccionado = null; // reset periodo rápido
  }
  calcularRangoMesActual(): void {
    if (!this.anioSeleccionado) return;
    if (!this.mesSeleccionado) {
      // Si no hay mes seleccionado, usa todo el año
      this.fechaInicio = `${this.anioSeleccionado}-01-01`;
      this.fechaFin = `${this.anioSeleccionado}-12-31`;
    } else {
      const primerDia = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, 1);
      const ultimoDia = new Date(this.anioSeleccionado, this.mesSeleccionado, 0);
      this.fechaInicio = primerDia.toISOString().split('T')[0];
      this.fechaFin = ultimoDia.toISOString().split('T')[0];
    }
  }
  actualizarRango(): void {
    this.periodoSeleccionado = null; // cancelar selección rápida si cambian año/mes
    this.calcularRangoMesActual();
  }
  resetearFiltros(): void {
    this.anioSeleccionado = new Date().getFullYear();
    this.mesSeleccionado = new Date().getMonth() + 1;
    this.periodoSeleccionado = null;
    this.calcularRangoMesActual();
    this.fechaInicio = '';
    this.fechaFin = '';
  }
  abrirModal(reporte: string) {
    this.reporteActivo = reporte;

    if (reporte === 'productos') {
      // Mostrar primero el modal de selección para productos
      this.mostrarModalSeleccionProductos = true;
    } else {
      // Para otros reportes, abrir directamente el modal de filtros
      this.modalAbierto = true;
    }
  }
  cerrarModal() {
    this.modalAbierto = false;
    this.reporteActivo = '';
    this.limpiarFiltros();
  }
  calcularSemanasDelMes() {
    this.semanasDelMes = [];

    if (!this.filtros.mes || !this.filtros.anio) return;

    const mes = Number(this.filtros.mes);
    const anio = Number(this.filtros.anio);

    // Obtener primer y último día del mes
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);
    const diasEnMes = ultimoDia.getDate();

    // Calcular cantidad de semanas (4 o 5)
    const semanas = Math.ceil((diasEnMes + primerDia.getDay()) / 7);

    // Dividir el mes en semanas exactas
    for (let i = 0; i < semanas; i++) {
      const inicioSemana = new Date(anio, mes - 1, (i * 7) + 1);
      let finSemana = new Date(anio, mes - 1, (i + 1) * 7);

      // Ajustar fin de semana si sobrepasa el último día del mes
      if (finSemana > ultimoDia) {
        finSemana = new Date(ultimoDia);
      }

      // Formatear para Supabase (YYYY-MM-DD)
      const formatoFecha = (date: Date) => date.toISOString().split('T')[0];

      this.semanasDelMes.push({
        valor: `${formatoFecha(inicioSemana)}_${formatoFecha(finSemana)}`,
        nombre: `Semana ${i + 1} (${formatoFecha(inicioSemana)} - ${formatoFecha(finSemana)})`
      });
    }
  }
  obtenerFiltrosVacios() {
    return {
      tipoPeriodo: '',
      fecha: '',
      mes: '',
      anio: new Date().getFullYear(),
      semanaSeleccionada: '',
      fechaInicioSemana: '',
      mesAnio: '',
      proveedor: '' as string | undefined,
    };
  }
  limpiarFiltros() {
    this.filtros = this.obtenerFiltrosVacios();
    this.semanasDelMes = [];
    this.busquedaElemento = '';

  }
  generarReporte() {
    switch (this.reporteActivo) {
      case 'ventas':
        this.generarReporteVentas();
        break;
      case 'reservas':
        this.generarReporteReservas();
        break;
      case 'productos':
        if (this.tipoReporteProductos === 'mas-vendidos') {
          this.generarReporteProductosMasVendidos();
        } else if (this.tipoReporteProductos === 'stock') {
          this.generarReporteStock();
          this.mostrarModalStock = true;
        }
        break;
      case 'clientes':
        this.generarReporteClientes();
        break;
      case 'personal':
        this.generarReportePersonal();
        break;
      case 'movimientosCaja':
        this.generarReporteMovimientosCaja();
        break;
      case 'personalizado':
        this.generarReportePersonalizado();
        break;
      default:
        console.warn('Tipo de reporte no reconocido');
        break;
    }
  }
  seleccionarTipoReporteProductos(tipo: string) {
    this.mostrarModalSeleccionProductos = false;

    if (tipo === 'mas-vendidos') {
      // Para productos más vendidos, abrimos el modal de filtros
      this.tipoReporteProductos = 'mas-vendidos';
      this.modalAbierto = true;
    } else if (tipo === 'stock') {
      // Para stock, abrimos el modal específico de stock
      this.tipoReporteProductos = 'stock';
      this.mostrarModalStock = true;
    }
  }
  cerrarModalStock() {
    this.mostrarModalStock = false;
  }
  async generarReporteVentas() {
    // Validación primera: si falta filtro, muestra alerta y sale sin hacer nada más
    if (!this.filtros.tipoPeriodo) {
      Swal.fire({
        icon: 'warning',
        title: 'Filtro incompleto',
        text: 'Por favor selecciona un tipo de período antes de generar el reporte.',
        confirmButtonText: 'Aceptar'
      });
      return;  // <== aquí se detiene la ejecución si no hay filtro
    }

    // Si pasa la validación, continua con la lógica normal
    this.cargandoVentas = true;

    try {
      const fechaFormateada = this.filtros.fecha
        ? new Date(this.filtros.fecha).toISOString().split('T')[0]
        : undefined;

      const filtrosParaServicio = {
        tipoPeriodo: this.filtros.tipoPeriodo,
        fecha: fechaFormateada,
        mes: this.filtros.mes ? Number(this.filtros.mes) : undefined,
        anio: this.filtros.anio ? Number(this.filtros.anio) : undefined,
        semanaSeleccionada: this.filtros.semanaSeleccionada || undefined
      };

      this.facturasFiltradas = await this.reportesService.obtenerFacturasConFiltros(filtrosParaServicio);

      if (this.facturasFiltradas.length === 0 && this.filtros.tipoPeriodo === 'dia' && fechaFormateada) {
        const resultados = await this.reportesService.verificarFacturasDirectamente(fechaFormateada);
        this.facturasFiltradas = resultados || [];
      }

      this.modalAbierto = false;
      this.mostrarModalResultados = true;
      this.calcularResumenPorFormaPago();

    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al generar reporte',
        text: 'Ocurrió un problema al obtener las facturas. Inténtalo de nuevo.',
        confirmButtonText: 'Cerrar'
      });
    } finally {
      this.cargandoVentas = false;
    }
  }

  obtenerTotalFacturado(): number {
    return this.facturasFiltradas.reduce((total, f) => total + (f.monto || 0), 0);
  }
  mostrarRangoPeriodo(): boolean {
    return ['semana', 'mes', 'anio'].includes(this.filtros.tipoPeriodo);
  }
  obtenerDescripcionPeriodo(): string {
    switch (this.filtros.tipoPeriodo) {
      case 'dia':
        if (!this.filtros.fecha) return 'Ventas del día';

        const fecha = new Date(this.filtros.fecha);
        const fechaLocal = new Date(fecha.getTime() + fecha.getTimezoneOffset() * 60000);

        const formatoLargo = new Intl.DateTimeFormat('es-ES', {
          weekday: 'long',     // jueves
          day: 'numeric',      // 4
          month: 'long',       // julio
          year: 'numeric'      // 2025
        });

        const fechaFormateada = formatoLargo.format(fechaLocal);
        return `Ventas del día ${fechaFormateada}`;

      case 'semana':
        if (!this.filtros.semanaSeleccionada) return 'Ventas de la semana';

        const [inicio, fin] = this.filtros.semanaSeleccionada.split('_');

        // Buscar la semana correspondiente para obtener el número (ej: Semana 1)
        const semana = this.semanasDelMes.find(
          (s) => s.valor === this.filtros.semanaSeleccionada
        );

        const numeroSemana = semana ? semana.nombre.match(/Semana (\d+)/)?.[1] : '?';

        return `Semana ${numeroSemana} del ${inicio} hasta ${fin}`;
      case 'mes':
        return `Ventas del mes de ${this.getNombreMes(this.filtros.mes)} ${this.filtros.anio}`;
      case 'anio':
        return `Ventas del año ${this.filtros.anio}`;
      default:
        return '';
    }
  }
  getNombreMes(mes: string | number): string {
    const numeroMes = typeof mes === 'string' ? parseInt(mes, 10) : mes;
    const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return nombres[numeroMes - 1] || '';
  }

  private calcularResumenPorFormaPago() {
    this.resumenFormasPago = {};

    for (const factura of this.facturasFiltradas) {
      const forma = factura.forma_pago?.toLowerCase() || 'otro';
      if (!this.resumenFormasPago[forma]) {
        this.resumenFormasPago[forma] = 0;
      }
      this.resumenFormasPago[forma] += factura.monto;
    }
  }
  // En tu componente.ts
  cerrarModalResultados(): void {
    this.mostrarModalResultados = false;
    this.modalAbierto = false; // Cierra también el otro modal si está abierto
    this.limpiarFiltros();
  }

  async generarReporteProductosMasVendidos() {
    if (!this.filtros.tipoPeriodo) {
      await Swal.fire({
        icon: 'warning',
        title: 'Filtro incompleto',
        text: 'Por favor selecciona un tipo de período antes de generar el reporte.',
        confirmButtonText: 'Aceptar'
      });
      this.cargandoProductos = false; // asegúrate que cargando se apaga
      return; // <== Aquí se detiene si no hay filtro
    }

    this.cargandoProductos = true;

    try {
      const fechaFormateada = this.filtros.fecha
        ? new Date(this.filtros.fecha).toISOString().split('T')[0]
        : undefined;

      const filtrosParaServicio = {
        tipoPeriodo: this.filtros.tipoPeriodo,
        fecha: fechaFormateada,
        mes: this.filtros.mes ? Number(this.filtros.mes) : undefined,
        anio: this.filtros.anio ? Number(this.filtros.anio) : undefined,
        semanaSeleccionada: this.filtros.semanaSeleccionada || undefined
      };

      this.facturasFiltradas = await this.reportesService.obtenerFacturasConFiltros(filtrosParaServicio);

      if (this.facturasFiltradas.length === 0 && this.filtros.tipoPeriodo === 'dia' && fechaFormateada) {
        const resultados = await this.reportesService.verificarFacturasDirectamente(fechaFormateada);
        this.facturasFiltradas = resultados || [];
      }

      this.productosMasVendidos = this.procesarProductosMasVendidos(this.facturasFiltradas);

      this.modalAbierto = false;
      this.mostrarModalProductosMasVendidos = true;

    } catch (error) {
      console.error('Error al generar reporte de productos:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al obtener el reporte. Inténtalo de nuevo.',
        confirmButtonText: 'Cerrar'
      });
    } finally {
      this.cargandoProductos = false;
    }
  }
  // Función auxiliar para procesar los productos más vendidos
  procesarProductosMasVendidos(facturas: any[]) {
    const productosAcumulados: Record<string, {
      nombre: string,
      cantidad: number
    }> = {};

    facturas.forEach(factura => {
      factura.productos.forEach((producto: any) => {
        const nombreNormalizado = normalizarNombre(producto.nombre);

        if (!productosAcumulados[nombreNormalizado]) {
          productosAcumulados[nombreNormalizado] = {
            nombre: nombreNormalizado,
            cantidad: 0
          };
        }

        productosAcumulados[nombreNormalizado].cantidad += producto.cantidad;
      });
    });

    return Object.values(productosAcumulados)
      .sort((a, b) => b.cantidad - a.cantidad);
  }
  obteneFiltrosVacios() {
    return {
      categoriaSeleccionada: '',
      estadoStock: '',
    };
  }
  async generarReporteReservas() { }
  // Método para validar y convertir el estado
  private validarEstadoStock(nivel: string | undefined): EstadoStock {
    const estadosValidos: EstadoStock[] = ['critico', 'agotado', 'suficiente', 'todos'];
    return estadosValidos.includes(nivel as EstadoStock) ? nivel as EstadoStock : 'todos';
  }
  limpiarFiltrosproducto() {
    this.filtroStock = {
      categoria: '',
      nivel: ''
    };

    this.productosFiltrados = [];
    this.mostrarTabla = false;
    this.busquedaRealizada = false;  // si usas esto para controlar mensajes como "No se encontraron"
  }
  getEstadoStockText(producto: any): string {
    const stock = Number(producto.stock_actual);
    const minimo = Number(producto.stock_minimo);

    if (stock === 0) return 'Agotado';
    if (stock < minimo) return 'Crítico';
    return 'Suficiente';
  }
  // Métodos auxiliares para la vista
  getEstadoStock(producto: any): string {
    const stockActual = Number(producto.stock_actual);
    const stockMinimo = Number(producto.stock_minimo);

    if (stockActual === 0) return 'agotado';
    if (stockActual < stockMinimo) return 'critico';
    return 'suficiente';
  }
  getEstadoStockClass(producto: any): string {
    const stock = Number(producto.stock_actual);
    const minimo = Number(producto.stock_minimo);

    if (stock === 0) return 'text-red-600 font-semibold';
    if (stock < minimo) return 'text-yellow-600 font-semibold';
    return 'text-green-600 font-semibold';
  }
  filtrarProductosStock() {
    // Este método es opcional si el backend ya filtra correctamente
    // Solo úsalo si necesitas filtros adicionales en el frontend
    if (!this.productosFiltrados) return;

    this.productosFiltrados = this.productosFiltrados.filter(prod => {
      const cumpleCategoria =
        !this.filtroStock.categoria ||
        prod.categorias?.id === this.filtroStock.categoria;

      const stock = Number(prod.stock_actual) || 0;
      const stockMinimo = Number(prod.stock_minimo) || 0;

      let cumpleNivel = true;

      if (this.filtroStock.nivel === 'critico') {
        cumpleNivel = stock > 0 && stock < stockMinimo;
      } else if (this.filtroStock.nivel === 'agotado') {
        cumpleNivel = stock === 0;
      } else if (this.filtroStock.nivel === 'suficiente') {
        cumpleNivel = stock >= stockMinimo;
      }

      return cumpleCategoria && cumpleNivel;
    });
  }
  async cargarCategorias() {
    try {
      this.categorias = await this.reportesService.obtenerCategorias();
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  }
  async generarReporteStock() {
    this.busquedaRealizada = true;
    this.mostrarTabla = false;     // Oculta la tabla por si estaba visible
    this.cargandoVentas = true;    // Muestra el loader

    try {
      const estadoStock = this.validarEstadoStock(this.filtroStock.nivel);

      // Llamada al backend con filtros
      this.productosFiltrados = await this.reportesService.obtenerProductosFiltrados({
        categoriaId: this.filtroStock.categoria || undefined,
        estadoStock,
      });

      // Una vez terminada la carga, mostramos la tabla
      this.mostrarTabla = true;

    } catch (error) {
      console.error('Error al obtener productos filtrados:', error);
      // Aquí puedes mostrar un mensaje de error al usuario si quieres
    } finally {
      // El loader siempre se oculta al finalizar, exitoso o con error
      this.cargandoVentas = false;
    }
  }
  exportarPDFsctok() {
    const doc = new jsPDF('landscape', 'pt');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Función para limpiar texto para el nombre del archivo
    const limpiarNombreArchivo = (texto: string) => {
      return texto
        .toLowerCase()
        .replace(/\s+/g, '_')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
        .replace(/[^a-z0-9_]/g, '');
    };

    // Mapear texto de filtro de stock
    const estadoMap: Record<string, string> = {
      critico: 'Productos con Stock Crítico',
      agotado: 'Productos Agotados',
      suficiente: 'Productos con Stock Suficiente',
      todos: 'Todos los Productos',
      '': 'Todos los Productos'
    };
    const filtro = this.filtroStock.nivel || '';
    const tituloEstado = estadoMap[filtro] || 'Todos los Productos';

    // Título
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Verde Tailwind
    doc.setFont('helvetica', 'bold');
    const titulo = 'Reporte de Stock';
    const tituloX = pageWidth / 2 - doc.getTextWidth(titulo) / 2;
    doc.text(titulo, tituloX, 50);

    // Subtítulo - Estado
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'normal');
    const subtitulo = tituloEstado;
    const subtituloX = pageWidth / 2 - doc.getTextWidth(subtitulo) / 2;
    doc.text(subtitulo, subtituloX, 70);

    // Fecha de generación
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' });
    const fechaTexto = `Fecha de generación: ${fechaGeneracion}`;
    const fechaX = pageWidth / 2 - doc.getTextWidth(fechaTexto) / 2;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(fechaTexto, fechaX, 90);

    // --- Tabla de productos ---
    const body = this.productosFiltrados.map(prod => [
      prod.nombre,
      prod.categorias?.nombre || 'Sin categoría',
      prod.stock_actual || 0,
      prod.unidad || 'N/D',
      this.getEstadoStockText(prod)
    ]);

    autoTable(doc, {
      startY: 110,
      head: [['Producto', 'Categoría', 'Stock', 'Unidad', 'Estado']],
      body,
      styles: { fontSize: 10, halign: 'center' },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 }
    });

    // Nombre del archivo con filtro y fecha
    const hoy = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    const nombreArchivo = `Reporte_Stock_${limpiarNombreArchivo(tituloEstado)}_${hoy}.pdf`;

    doc.save(nombreArchivo);
  }
  async generarReporteClientes() { }
  async generarReportePersonalizado() { }
  async generarReportePersonal() {
    this.cargandoClientes = true;  // Activa el loader al comenzar

    if (this.reporteActivo === 'salarios' || this.reporteActivo === 'clientes') {
      this.filtros.proveedor = this.busquedaElemento || undefined;
    } else {
      this.filtros.proveedor = undefined;
    }

    const filtrosParaEnviar = {
      ...this.filtros,
      mes: this.filtros.mes ? Number(this.filtros.mes) : undefined,
    };

    try {
      const gastos = await this.reportesService.obtenerGastosConFiltros(filtrosParaEnviar);
      this.gastosFiltrados = gastos;  // Guardar datos para mostrar
      this.mostrarModalGastos = true; // Mostrar modal
    } catch (error) {
      console.error('Error generando reporte:', error);
    } finally {
      this.cargandoClientes = false;  // Desactiva el loader siempre
    }
  }
  cerrarModalGastos() {
    this.mostrarModalGastos = false;
    this.gastosFiltrados = []; // Opcional: limpiar datos
    this.cerrarModal();
  }
  obtenerTotalGastos() {
    return this.gastosFiltrados.reduce((acc, gasto) => acc + Number(gasto.monto), 0);
  }
  obtenerDescripcionPeriodoEmpleados(): string {
    const nombreEmpleado = this.filtros.proveedor || 'Empleado';

    switch (this.filtros.tipoPeriodo) {
      case 'dia':
        if (!this.filtros.fecha) return `Pagos realizados a ${nombreEmpleado} el día seleccionado`;

        const fecha = new Date(this.filtros.fecha);
        const fechaLocal = new Date(fecha.getTime() + fecha.getTimezoneOffset() * 60000);

        const formatoLargo = new Intl.DateTimeFormat('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        const fechaFormateada = formatoLargo.format(fechaLocal);
        return `Pagos realizados a ${nombreEmpleado} el ${fechaFormateada}`;

      case 'semana':
        if (!this.filtros.semanaSeleccionada) return `Pagos realizados a ${nombreEmpleado} durante la semana`;

        const [inicio, fin] = this.filtros.semanaSeleccionada.split('_');

        const semana = this.semanasDelMes.find(
          (s) => s.valor === this.filtros.semanaSeleccionada
        );

        const numeroSemana = semana ? semana.nombre.match(/Semana (\d+)/)?.[1] : '?';

        return `Pagos realizados a ${nombreEmpleado} durante la Semana ${numeroSemana} del ${inicio} hasta ${fin}`;

      case 'mes':
        return `Pagos realizados a ${nombreEmpleado} en ${this.getNombreMes(this.filtros.mes)} ${this.filtros.anio}`;

      case 'anio':
        return `Pagos realizados a ${nombreEmpleado} en el año ${this.filtros.anio}`;

      default:
        return `Pagos realizados a ${nombreEmpleado}`;
    }
  }
  // Ejemplo de resumen por categorías, agrupa montos por categoría
  get resumenCategorias(): { [categoria: string]: number } {
    return this.gastosFiltrados.reduce((acc, gasto) => {
      acc[gasto.categoria] = (acc[gasto.categoria] || 0) + gasto.monto;
      return acc;
    }, {} as { [key: string]: number });
  }
  filtrarElementos() {
    if (!this.busquedaElemento) {
      this.elementosFiltrados = [];
      this.mostrarListaElementos = false;
      this.elementoSeleccionado = null;
      this.filtros.proveedor = '';
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
        this.filtros.proveedor = '';
      }
    }, 200);
  }
  seleccionarElemento(elemento: any) {
    this.elementoSeleccionado = elemento;
    this.busquedaElemento = elemento.nombre;
    this.filtros.proveedor = elemento.nombre; // Aquí se pasa el valor al filtro principal
    this.mostrarListaElementos = false;
  }
  async cargarDatosDropdown() {
    try {
      this.proveedores = await this.reportesService.obtenerProveedores();
    } catch (error) {
      console.error('Error al obtener proveedores:', error);
      Swal.fire('Error', 'No se pudieron cargar los proveedores', 'error');
    }

    try {
      this.usuarios = await this.reportesService.obtenerUsuarios();
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    }

    this.elementosDropdown = [
      ...this.proveedores.map(p => ({ ...p, tipo: 'proveedor' })),
      ...this.usuarios.map(u => ({ ...u, tipo: 'usuario' }))
    ];
  }
  generarPDFPagosYAdelantos() {
    const doc = new jsPDF('p', 'pt');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Función para limpiar el nombre del archivo
    const limpiarNombreArchivo = (texto: string) => {
      return texto
        .toLowerCase()
        .replace(/\s+/g, '_')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '');
    };

    // Cabecera
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.setFont('helvetica', 'bold');
    const titulo = 'Reporte de Pagos y Adelantos';
    doc.text(titulo, pageWidth / 2 - doc.getTextWidth(titulo) / 2, 50);

    // Subtítulo
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'normal');
    const subtitulo = this.obtenerDescripcionPeriodoEmpleados(); // <-- Usa el método correcto
    doc.text(subtitulo, pageWidth / 2 - doc.getTextWidth(subtitulo) / 2, 70);

    // Fecha de generación
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' });
    const fechaGenTexto = `Fecha de generación: ${fechaGeneracion}`;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(fechaGenTexto, pageWidth / 2 - doc.getTextWidth(fechaGenTexto) / 2, 90);

    // Tipo de período
    const tipoPeriodoMap: Record<string, string> = {
      dia: 'DÍA',
      semana: 'SEMANA',
      mes: 'MES',
      anio: 'AÑO'
    };
    const tipoPeriodoTexto = tipoPeriodoMap[this.filtros.tipoPeriodo] || this.filtros.tipoPeriodo.toUpperCase();
    const tipoPeriodoStr = `Tipo de período: ${tipoPeriodoTexto}`;
    doc.text(tipoPeriodoStr, pageWidth / 2 - doc.getTextWidth(tipoPeriodoStr) / 2, 105);

    // Empleado
    const empleado = `Empleado: ${this.filtros.proveedor || 'Todos'}`;
    doc.text(empleado, pageWidth / 2 - doc.getTextWidth(empleado) / 2, 120);

    // --- Tabla de movimientos ---
    let y = 150;

    if (this.gastosFiltrados.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalle de Movimientos', 40, y);
      y += 20;

      const body = this.gastosFiltrados.map(g => [
        new Date(g.fecha).toLocaleDateString('es-ES'),
        g.categoria || '-',
        g.descripcion || '-',
        g.metodo_pago || '-',
        `$${Number(g.monto).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Fecha', 'Categoría', 'Descripción', 'Método de Pago', 'Monto']],
        body,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        columnStyles: { 4: { halign: 'right' } }
      });

      y = (doc as any).lastAutoTable.finalY + 20;

      // Total general
      doc.setFontSize(12);
      doc.setTextColor(0, 100, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Pagado: ${this.obtenerTotalGastos().toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      })}`, 40, y);

    } else {
      doc.setFontSize(12);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'normal');
      doc.text('No hay movimientos registrados en este período.', 40, y);
    }

    // Guardar archivo
    const nombreArchivo = `Reporte_Pagos_Adelantos_${limpiarNombreArchivo(subtitulo)}.pdf`;
    doc.save(nombreArchivo);
  }
  async generarReporteMovimientosCaja() {

    if (!this.filtros?.tipoPeriodo) {
      Swal.fire({
        icon: 'warning',
        title: 'Filtro incompleto',
        text: 'Por favor selecciona un tipo de período antes de generar el reporte.',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const tiposValidos = ['dia', 'semana', 'mes', 'anio'];

    if (!tiposValidos.includes(this.filtros.tipoPeriodo)) {
      console.error('Tipo de periodo no reconocido:', this.filtros.tipoPeriodo);
      Swal.fire({
        icon: 'error',
        title: 'Tipo de reporte no reconocido',
        text: `El tipo de período '${this.filtros.tipoPeriodo}' no es válido.`,
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.cargandoCaja = true;

    try {
      const fechaFormateada = this.filtros.fecha
        ? new Date(this.filtros.fecha).toISOString().split('T')[0]
        : undefined;

      const filtrosParaServicio = {
        tipoPeriodo: this.filtros.tipoPeriodo,
        fecha: fechaFormateada,
        mes: this.filtros.mes ? Number(this.filtros.mes) : undefined,
        anio: this.filtros.anio ? Number(this.filtros.anio) : undefined,
        semanaSeleccionada: this.filtros.semanaSeleccionada || undefined
      };


      const [pedidos, gastos, facturas] = await Promise.all([
        this.reportesService.obtenerPedidosConDetalleConFiltros(filtrosParaServicio),
        this.reportesService.obtenerGastosConFiltrostotal(filtrosParaServicio),
        this.reportesService.obtenerFacturasConFiltros(filtrosParaServicio)
      ]);

      this.pedidosFiltrados = pedidos;
      this.gastosFiltrados = gastos;
      this.facturasFiltradas = facturas;

      // Aquí abres el modal
      this.modalReporteCajaAbierto = true;

      this.calcularResumenCaja();

    } catch (error) {
      console.error('Error al generar reporte de caja:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al generar reporte',
        text: 'Ocurrió un problema al obtener los datos. Inténtalo de nuevo.',
        confirmButtonText: 'Cerrar'
      });
    } finally {
      this.cargandoCaja = false;
    }
  }

  calcularResumenCaja() {
    // Pedidos pagados → ingresos
    const totalPedidosPagados = this.pedidosFiltrados.reduce((acc, pedido) => {
      if (pedido.estado_pago === 'pagado') {
        const total = Number(pedido.total);
        return acc + (isNaN(total) ? 0 : total);
      }
      return acc;
    }, 0);

    // Pedidos pendientes → pedidos por cobrar (no ingreso ni gasto)
    const totalPedidosPendientes = this.pedidosFiltrados.reduce((acc, pedido) => {
      if (pedido.estado_pago === 'pendiente') {
        const total = Number(pedido.total);
        return acc + (isNaN(total) ? 0 : total);
      }
      return acc;
    }, 0);

    // Facturas → ingresos
    const totalFacturas = this.facturasFiltradas.reduce((acc, factura) => {
      const monto = Number(factura.monto);
      return acc + (isNaN(monto) ? 0 : monto);
    }, 0);

    // Gastos → egresos
    const totalGastos = this.gastosFiltrados.reduce((acc, gasto) => {
      const monto = Number(gasto.monto);
      return acc + (isNaN(monto) ? 0 : monto);
    }, 0);

    // Ingresos reales = facturas + pedidos pagados
    const ingresos = totalFacturas + totalPedidosPagados;

    // Saldo final = ingresos - egresos
    const saldoFinal = ingresos - totalGastos;

    this.resumenCaja = {
      totalPedidosPagados: Number(totalPedidosPagados.toFixed(2)),
      totalPedidosPendientes: Number(totalPedidosPendientes.toFixed(2)), // pedidos por cobrar
      totalFacturas: Number(totalFacturas.toFixed(2)),
      totalGastos: Number(totalGastos.toFixed(2)),
      saldoFinal: Number(saldoFinal.toFixed(2))
    };
  }

  get pedidosPagados() {
    return this.pedidosFiltrados.filter(p => p.estado_pago === 'pagado');
  }

  get pedidosPendientes() {
    return this.pedidosFiltrados.filter(p => p.estado_pago === 'pendiente');
  }
  cerrarModalReporteCaja() {
    this.modalReporteCajaAbierto = false;
  }
  obtenerDescripcion(): string {
    switch (this.filtros.tipoPeriodo) {
      case 'dia':
        if (!this.filtros.fecha) return `Créditos, facturas y gastos para el día seleccionado`;

        const fecha = new Date(this.filtros.fecha);
        const fechaLocal = new Date(fecha.getTime() + fecha.getTimezoneOffset() * 60000);

        const formatoLargo = new Intl.DateTimeFormat('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        const fechaFormateada = formatoLargo.format(fechaLocal);
        return `Reporte de créditos pagados, facturas y gastos para el día ${fechaFormateada}`;

      case 'semana':
        if (!this.filtros.semanaSeleccionada) return `Créditos, facturas y gastos para la semana seleccionada`;

        const [inicio, fin] = this.filtros.semanaSeleccionada.split('_');
        const semana = this.semanasDelMes.find(s => s.valor === this.filtros.semanaSeleccionada);
        const numeroSemana = semana ? semana.nombre.match(/Semana (\d+)/)?.[1] : '?';

        return `Reporte de créditos pagados, facturas y gastos de la Semana ${numeroSemana} (${inicio} - ${fin})`;

      case 'mes':
        return `Reporte de créditos pagados, facturas y gastos de ${this.getNombreMes(this.filtros.mes)} ${this.filtros.anio}`;

      case 'anio':
        return `Reporte de créditos pagados, facturas y gastos del año ${this.filtros.anio}`;

      default:
        return `Reporte de créditos pagados, facturas y gastos para el periodo seleccionado`;
    }
  }
  generarPDFReporteCaja() {
    const doc = new jsPDF('p', 'pt');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Función para limpiar el nombre del archivo
    const limpiarNombreArchivo = (texto: string) => {
      return texto
        .toLowerCase()
        .replace(/\s+/g, '_')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '');
    };

    // Encabezado
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.setFont('helvetica', 'bold');
    const titulo = 'Reporte Movimientos de Caja';
    doc.text(titulo, pageWidth / 2 - doc.getTextWidth(titulo) / 2, 50);

    // Subtítulo dinámico
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'normal');
    const subtitulo = this.obtenerDescripcion(); // tu método dinámico
    doc.text(subtitulo, pageWidth / 2 - doc.getTextWidth(subtitulo) / 2, 70);

    // Fecha de generación
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' });
    const fechaGenTexto = `Fecha de generación: ${fechaGeneracion}`;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(fechaGenTexto, pageWidth / 2 - doc.getTextWidth(fechaGenTexto) / 2, 90);

    let y = 110;

    // Resumen de Totales
    const resumen = [
      ['Creditos Ingesos', this.resumenCaja.totalPedidosPagados],
      ['Ingresos por Facturas (ventas realizadas)', this.resumenCaja.totalFacturas],
      ['Gastos o Egresos', this.resumenCaja.totalGastos],
      ['Creditos por Cobrar', this.resumenCaja.totalPedidosPendientes],
      ['Saldo Final', this.resumenCaja.saldoFinal]
    ];

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Resumen de General', 40, y);
    y += 20;

    const resumenBody = resumen.map(([label, value]) => [
      label,
      value?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00'
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Monto']],
      body: resumenBody,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 'auto' },         // La primera columna usa todo el ancho posible
        1: { halign: 'right', cellWidth: 100 }  // Segunda columna más estrecha y alineada a la derecha
      },
      margin: { left: 40, right: 40 },
      styles: { cellPadding: 6 }
    });

    y = (doc as any).lastAutoTable.finalY + 20;


    // Función auxiliar para crear tablas con autoTable
    const agregarTabla = (tituloTabla: string, columnas: string[], datos: any[][]) => {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(tituloTabla, 40, y);
      y += 20;

      if (datos.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [columnas],
          body: datos,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255 },
          columnStyles: {
            [columnas.length - 1]: { halign: 'right' }
          },
          margin: { left: 40, right: 40 }
        });
        y = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(12);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        doc.text('No hay registros para el periodo seleccionado.', 40, y);
        y += 30;
      }
    };

    // Creditos Pagados
    const pedidosPagadosData = this.pedidosPagados.map(p => [
      new Date(p.fecha).toLocaleDateString('es-ES'),
      p.clientes?.nombre || 'N/A',
      p.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    ]);
    agregarTabla('Créditos Pagados', ['Fecha', 'Cliente', 'Total'], pedidosPagadosData);

    // Facturas
    const facturasData = this.facturasFiltradas.map(f => [
      new Date(f.fecha).toLocaleDateString('es-ES'),
      f.numero_factura,
      f.monto.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    ]);
    agregarTabla('Facturas', ['Fecha', 'N° Factura', 'Total'], facturasData);

    // Créditos Pendientes
    const pedidosPendientesData = this.pedidosPendientes.map(p => [
      new Date(p.fecha).toLocaleDateString('es-ES'),
      p.clientes?.nombre || 'N/A',
      p.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    ]);
    agregarTabla('Créditos Pendientes', ['Fecha', 'Cliente', 'Total'], pedidosPendientesData);

    // Gastos
    const gastosData = this.gastosFiltrados.map(g => [
      new Date(g.fecha).toLocaleDateString('es-ES'),
      g.descripcion || g.categoria || 'N/A',
      g.monto.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    ]);
    agregarTabla(' Gastos (Egresos)', ['Fecha', 'Concepto', 'Monto'], gastosData);

    // Guardar archivo PDF
    const nombreArchivo = `Reporte_Movimientos_Caja_${limpiarNombreArchivo(subtitulo)}.pdf`;
    doc.save(nombreArchivo);
  }

  generarPDF() {
    const doc = new jsPDF('p', 'pt');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Función para limpiar texto y usarlo en el nombre del archivo
    const limpiarNombreArchivo = (texto: string) => {
      return texto
        .toLowerCase()
        .replace(/\s+/g, '_') // espacios por guiones bajos
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
        .replace(/[^a-z0-9_]/g, ''); // solo letras, números y guiones bajos
    };

    // --- Cabecera centrada ---

    // Título principal
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.setFont('helvetica', 'bold');
    const titulo = 'Reporte de Ventas';
    const tituloX = pageWidth / 2 - doc.getTextWidth(titulo) / 2;
    doc.text(titulo, tituloX, 50);

    // Subtítulo: periodo
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'normal');
    const subtitulo = this.obtenerDescripcionPeriodo();
    const subtituloX = pageWidth / 2 - doc.getTextWidth(subtitulo) / 2;
    doc.text(subtitulo, subtituloX, 70);

    // Fecha de generación
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' });
    const fechaGenTexto = `Fecha de generación: ${fechaGeneracion}`;
    const fechaGenX = pageWidth / 2 - doc.getTextWidth(fechaGenTexto) / 2;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(fechaGenTexto, fechaGenX, 90);

    // Tipo de periodo con mayúsculas y tilde si es 'anio'
    const tipoPeriodoMap: Record<string, string> = {
      dia: 'DÍA',
      semana: 'SEMANA',
      mes: 'MES',
      anio: 'AÑO'
    };
    const tipoPeriodoTexto = tipoPeriodoMap[this.filtros.tipoPeriodo] || this.filtros.tipoPeriodo.toUpperCase();
    const tipoPeriodoStr = `Tipo de período: ${tipoPeriodoTexto}`;
    const tipoPeriodoX = pageWidth / 2 - doc.getTextWidth(tipoPeriodoStr) / 2;
    doc.text(tipoPeriodoStr, tipoPeriodoX, 105);

    // --- Resumen por forma de pago ---
    let y = 130;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    const resumenTitulo = 'Resumen por Forma de Pago';
    doc.text(resumenTitulo, 40, y);
    y += 20;

    const resumenData = Object.entries(this.resumenFormasPago).map(([key, value]) => [
      key.charAt(0).toUpperCase() + key.slice(1),
      `$${Number(value).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Forma de Pago', 'Monto']],
      body: resumenData,
      styles: { fontSize: 10, halign: 'center' },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
      // Sin margin.left para que quede alineada a la izquierda
    });

    y = (doc as any).lastAutoTable.finalY + 30;

    // --- Detalle de facturas ---
    if (this.facturasFiltradas.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      const detalleTitulo = 'Detalle de Facturas';
      doc.text(detalleTitulo, 40, y);
      y += 20;

      const body = this.facturasFiltradas.map(factura => [
        new Date(factura.fecha).toLocaleDateString('es-ES'),
        factura.numero_factura,
        factura.forma_pago.charAt(0).toUpperCase() + factura.forma_pago.slice(1),
        `$${Number(factura.monto).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Fecha', 'N° Factura', 'Forma de Pago', 'Monto']],
        body,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        columnStyles: { 3: { halign: 'right' } }
        // Sin margin.left para que quede alineada a la izquierda
      });

      y = (doc as any).lastAutoTable.finalY + 20;

      // Total general
      doc.setFontSize(12);
      doc.setTextColor(0, 100, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total General: ${this.obtenerTotalFacturado().toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      })}`, 40, y);

    } else {
      doc.setFontSize(12);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'normal');
      doc.text('No hay facturas registradas en este período.', 40, y);
    }

    // Nombre del archivo usando descripción del período
    const nombreArchivo = `Reporte_Ventas_${limpiarNombreArchivo(subtitulo)}.pdf`;

    doc.save(nombreArchivo);
  }

  exportarProductosMasVendidosPDF() {
    const doc = new jsPDF('p', 'pt');
    const pageWidth = doc.internal.pageSize.getWidth();

    const limpiarNombreArchivo = (texto: string) => {
      return texto
        .toLowerCase()
        .replace(/\s+/g, '_')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '');
    };

    // --- Cabecera ---
    doc.setFontSize(20);
    doc.setTextColor(34, 153, 84); // Verde
    doc.setFont('helvetica', 'bold');
    const titulo = 'Productos Más Vendidos';
    const tituloX = pageWidth / 2 - doc.getTextWidth(titulo) / 2;
    doc.text(titulo, tituloX, 50);

    // Subtítulo
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'normal');
    const subtitulo = this.obtenerDescripcionPeriodo();
    const subtituloX = pageWidth / 2 - doc.getTextWidth(subtitulo) / 2;
    doc.text(subtitulo, subtituloX, 70);

    // Fecha de generación
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' });
    const fechaGenTexto = `Fecha de generación: ${fechaGeneracion}`;
    const fechaGenX = pageWidth / 2 - doc.getTextWidth(fechaGenTexto) / 2;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(fechaGenTexto, fechaGenX, 90);

    // Tipo de período (con tilde si es "anio")
    const tipoPeriodoMap: Record<string, string> = {
      dia: 'DÍA',
      semana: 'SEMANA',
      mes: 'MES',
      anio: 'AÑO'
    };
    const tipoPeriodoTexto = tipoPeriodoMap[this.filtros.tipoPeriodo] || this.filtros.tipoPeriodo.toUpperCase();
    const tipoPeriodoStr = `Tipo de período: ${tipoPeriodoTexto}`;
    const tipoPeriodoX = pageWidth / 2 - doc.getTextWidth(tipoPeriodoStr) / 2;
    doc.text(tipoPeriodoStr, tipoPeriodoX, 105);

    // --- Tabla de productos ---
    let y = 130;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Listado de Productos', 40, y);
    y += 20;

    const body = this.productosMasVendidos.map(prod => [
      prod.nombre,
      prod.cantidad,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Producto', 'Cantidad']],
      body,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [34, 153, 84], textColor: 255 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' }
      }
    });

    // Guardar el PDF
    const nombreArchivo = `Productos_Mas_Vendidos_${limpiarNombreArchivo(subtitulo)}.pdf`;
    doc.save(nombreArchivo);
  }




}
function normalizarNombre(nombre: string): string {
  const nombreLimpio = nombre
    .toLowerCase()
    .replace(/\(.*?\)/g, '')           // Elimina contenido entre paréntesis
    .replace(/-?\s*para llevar/gi, '') // Elimina "para llevar"
    .trim();

  // Agrupar todo lo relacionado a almuerzo bajo el mismo nombre
  if (
    nombreLimpio.includes('almuerzo') ||
    nombreLimpio.includes('solo segundo') ||
    nombreLimpio.includes('solo sopa') ||
    nombreLimpio.includes('media sopa') ||
    nombreLimpio.includes('segundo') ||
    nombreLimpio.includes('sopa')
  ) {
    return 'Almuerzo completo';
  }

  return nombreLimpio;
}

