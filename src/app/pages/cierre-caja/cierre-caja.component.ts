import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { UserService } from '../../Services/user.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LOCALE_ID } from '@angular/core';
registerLocaleData(localeEs);
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';

interface Extra {
  nombre: string;
}

interface Producto {
  nombre: string;
  cantidad: number;
  extras?: Extra[];
}

interface Factura {
  numero_factura: string;
  fecha: Date;
  forma_pago: string;
  monto: number;
  productos: Producto[];
}
interface Gasto {
  descripcion: string;
  monto: number;
  fecha: Date;
  metodo_pago: string;
}


@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cierre-caja.component.html',
  styleUrls: ['./cierre-caja.component.css'],
    providers: [
    { provide: LOCALE_ID, useValue: 'es' }  
  ]
})
export default class CierreCajaComponent implements OnInit {

  facturas: Factura[] = [];
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 5;
  gastos: Gasto[] = [];
totalGastos: number = 0;
gastosDelDia: Gasto[] = [];
totalGastosEfectivo: number = 0;
totalGastosTransferencia: number = 0;
montoContado: number = 0;
observaciones: string = '';
 mostrar: boolean = false;
nombreUsuario: string = '';
  rolUsuario: string = '';
   totalVentasEfectivo: number = 0;
  totalVentasTransferencia: number = 0;
  totalVentasTarjeta: number = 0;
  totalVentasPedidosYa: number = 0;
  totalVentasPedidosBeez: number = 0;
  totalVentasCredito: number = 0;
   totalADepositar: number = 0;
montoContadoMostrado: number = 0
 products: any[] = [];
   mensajeError: string = '';
  mensajeExito: string = '';
  estadoCierre: 'pendiente' | 'cerrada' | 'abierta' = 'pendiente';  // Estado por defecto
ultimosCierres: any[] = [];
listaCierres: any[]=[];

  constructor(private supabaseService: SupabaseService, private userService: UserService) {}

  
ngOnInit() {
  this.cargarFacturas();
  this.cargarGastos();
  this.loadProducts();
  this.cargarCierres();

  this.userService.nombreUsuario$.subscribe(async nombre => {
    this.nombreUsuario = nombre;

    const caja = await this.supabaseService.obtenerCajaAbierta(this.nombreUsuario);

    if (!caja) {
      this.estadoCierre = 'cerrada';
    } else if (caja.estado === 'abierta') {
      this.estadoCierre = 'abierta';
    } else {
      this.estadoCierre = 'pendiente';
    }

    const cierres = await this.supabaseService.obtenerUltimosCierresCombinado();

    this.ultimosCierres = cierres; // para mostrar en HTML
  });

  this.userService.rolUsuario$.subscribe(rol => {
    this.rolUsuario = rol;
  });
}


  async cargarFacturas() {
    
const resultado = await this.supabaseService.obtenerFacturasHoy();
    if (resultado.data) {
      this.facturas = resultado.data;
      console.log('factra',this.facturas)
    } else {
      console.error('Error cargando facturas:', resultado.error);
    }
  }

  get filteredFacturas(): Factura[] {
    const term = this.searchTerm.toLowerCase().trim();

    return this.facturas.filter(factura =>
      factura.numero_factura.toLowerCase().includes(term) ||
      factura.forma_pago.toLowerCase().includes(term) ||
      factura.productos.some((p: Producto) =>
        p.nombre.toLowerCase().includes(term) ||
        p.extras?.some((e: Extra) =>
          e.nombre.toLowerCase().includes(term)
        )
      )
    );
  }

  get paginatedFacturas(): Factura[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredFacturas.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredFacturas.length / this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  getTotalByPago(tipoPago: string): number {
    return this.facturas
      .filter(f => f.forma_pago.toLowerCase() === tipoPago.toLowerCase())
      .reduce((sum, f) => sum + f.monto, 0);
  }
  
  getCountByPago(tipoPago: string): number {
    return this.facturas.filter(f => f.forma_pago.toLowerCase() === tipoPago.toLowerCase()).length;
  }
  
  get totalVentas(): number {
    return this.facturas.reduce((sum, f) => sum + f.monto, 0);
  }
  
  get countTotal(): number {
    return this.facturas.length;
  }
 async cargarGastos() { 
  const resultado = await this.supabaseService.obtenerGastosHoy();
    if (resultado.error) {
    console.error('❌ Error cargando gastos:', resultado.error);
    this.gastos = [];
    this.gastosDelDia = [];
    this.totalGastos = 0;
    this.totalGastosEfectivo = 0;
    this.totalGastosTransferencia = 0;
    return;
  }
  // Los gastos ya vienen filtrados desde fecha_operativa
  this.gastos = resultado.data || [];
  this.gastosDelDia = [...this.gastos]; // Copia de los gastos filtrados
  // Sumar montos (convertir de string a number)
  this.totalGastos = this.gastosDelDia.reduce((sum, g) => sum + Number(g.monto), 0);
   // Gastos en efectivo
  this.totalGastosEfectivo = this.gastosDelDia
    .filter(g => g.metodo_pago === 'efectivo')
    .reduce((sum, g) => sum + Number(g.monto), 0);
  // Gastos por transferencia
  this.totalGastosTransferencia = this.gastosDelDia
    .filter(g => g.metodo_pago === 'transferencia')
    .reduce((sum, g) => sum + Number(g.monto), 0);
}
  
  
  get countGastos() {
    return this.gastos.length;
  }

// Métodos para los cálculos
calcularTotalEsperado(): number {
  const ventasEfectivo = this.getTotalByPago('efectivo') || 0;
  const cajaChica = 30; // o donde tengas guardado ese valor
  const gastos = Math.abs(this.totalGastosEfectivo) || 0; // asegurar positivo
  
  return ventasEfectivo + cajaChica - gastos;
}

calcularDiferencia(): number {
  const diferencia = (this.montoContadoMostrado || 0) - this.calcularTotalEsperado();
  return Number(diferencia.toFixed(2));
}



calcularTotalADepositar(): number {
  const fondoCajaChica = 30;
  const montoContado = this.montoContadoMostrado || 0;

  const resultado = montoContado - fondoCajaChica;

  // Si resultado es negativo, devuelve 0
  return resultado > 0 ? resultado : 0;
}



calcularPorcentajeEfectivo(): number {
  const totalVentas = this.totalVentas;
  if (totalVentas === 0) return 0;
  
  const ventasEfectivo = this.getTotalByPago('efectivo');
  return (ventasEfectivo / totalVentas) * 100;
}
 async loadProducts() {
    try {
      // Llamamos al método que obtiene los productos con las categorías
      const products = await this.supabaseService.obtenerProductos();
      // Asignamos los productos a la propiedad products
      this.products = products || [];
  console.log('prdictos',products)
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

getProductosVendidos() {
  const contadorVentas: Record<string, number> = {};

  this.facturas.forEach(factura => {
    factura.productos.forEach(prod => {
      const nombre = this.agruparNombreProducto(prod.nombre); // Normaliza nombre receta/plato
      contadorVentas[nombre] = (contadorVentas[nombre] || 0) + prod.cantidad;
    });
  });

  return Object.entries(contadorVentas)
    .map(([nombre, vendidos]) => ({ nombre, vendidos }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

getProductosInventario() {
  return this.products
    .filter(p => p.activo && !p.eliminado)
    .map(p => ({
      nombre: p.nombre,
      stock_actual: p.stock_actual,
      stock_minimo: p.stock_minimo,
      unidad: p.unidad,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
agruparNombreProducto(nombre: string): string {
  const limpio = nombre.replace(/\(.*?\)/g, '').trim().toLowerCase();
  const esParaLlevar = /- *para *llevar/i.test(limpio);

  let base = limpio.replace(/- *para *llevar/i, '').trim();

  // Agrupación personalizada
  if (base.includes('solo sopa')) return esParaLlevar ? 'Solo Sopa Para Llevar' : 'Solo Sopa';
  if (base.includes('solo segundo')) return esParaLlevar ? 'Solo Segundo Para Llevar' : 'Solo Segundo';
  if (base.includes('media sopa + segundo')) return 'Almuerzo Completo';
  if (base.includes('almuerzo completo')) return 'Almuerzo Completo';
  if (esParaLlevar) return 'Almuerzo Para Llevar';

  // Capitalizar otros productos
  return base[0].toUpperCase() + base.slice(1);
}

async realizarCierre(): Promise<void> {
  // Validación monto contado
  if (this.montoContado === null || this.montoContado === undefined || this.montoContado <= 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Monto inválido',
      text: 'El monto contado debe ser un número positivo mayor que cero.',
    });
    return;
  }

  // Validación observaciones
  if (!this.observaciones || this.observaciones.trim() === '') {
    await Swal.fire({
      icon: 'warning',
      title: 'Observaciones requeridas',
      text: 'Por favor, ingresa las observaciones antes de realizar el cierre.',
    });
    return;
  }

  const usuario_nombre = this.nombreUsuario;
  const fecha_cierre = getLocalDateTimeString();
  this.montoContadoMostrado = this.montoContado;

  try {
    // Obtener el máximo número de cierre global
    const maxNumero = await this.supabaseService.obtenerMaxNumeroCierrecaja();
    const nuevoNumeroCierre = maxNumero !== null ? maxNumero + 1 : 1;

    const cierreData = {
      numero_cierre: nuevoNumeroCierre, // Nuevo número agregado aquí
      fecha_cierre: fecha_cierre,
      total_ventas_efectivo: this.getTotalByPago('efectivo'),
      total_ventas_transferencia: this.getTotalByPago('transferencia'),
      total_ventas_tarjeta: this.getTotalByPago('tarjeta'),
      total_ventas_pedidos_ya: this.getTotalByPago('pedidosya'),
      total_ventas_pedidos_beez: this.getTotalByPago('beez'),
      total_ventas_credito: this.getTotalByPago('credito'),
      total_ventas: this.totalVentas,

      total_gastos: this.totalGastos || 0,
      total_gastos_efectivo: this.totalGastosEfectivo || 0,
      total_gastos_transferencia: this.totalGastosTransferencia || 0,

      total_esperado: this.calcularTotalEsperado(),
      monto_contado: this.montoContado || 0,
      diferencia: this.calcularDiferencia(),

      total_a_depositar: this.calcularTotalADepositar(),

      observaciones: this.observaciones || '',
      creado_por: usuario_nombre,
    };

    const montoContadoGuardado = this.montoContado;
    await this.supabaseService.registrarCierreCaja(cierreData);
    this.montoContadoMostrado = montoContadoGuardado;

    this.mostrarModal(); // Mostrar modal si todo fue exitoso

    // Resetear campos
    this.montoContado = 0;
    this.observaciones = '';
  } catch (err) {
    console.error('Error al registrar el cierre:', err);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Hubo un problema al registrar el cierre',
    });
  }
}

async cerrarCaja() {
  const cajaAbierta = await this.supabaseService.obtenerCajaAbierta(this.nombreUsuario);
  
  if (!cajaAbierta) {
    await Swal.fire({
      icon: 'warning',
      title: 'Caja no encontrada',
      text: 'No hay una caja abierta para cerrar.',
      confirmButtonText: 'OK',
    });
   this.cerrarModal();
  }

  const cierre = {
    usuario_nombre: cajaAbierta.usuario_nombre,
    fecha_operativa: cajaAbierta.fecha_operativa,
    hora_cierre: getLocalDateTimeString(),
  };
  const resultado = await this.supabaseService.CierreCaja(cierre);
  if (resultado.error) {
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: resultado.error,
    });
  } else {
    await Swal.fire({
      icon: 'success',
      title: '¡Éxito!',
      text: 'Caja cerrada con éxito.',
      confirmButtonText: 'OK',
    });

    this.cerrarModal();  // Cierra el modal cuando el usuario presiona OK
    this.cargarCierres();
     // 🔽 NUEVO: cargar estado y cierres
const caja = await this.supabaseService.obtenerCajaAbierta(this.nombreUsuario);

if (!caja) {
  this.estadoCierre = 'cerrada';
} else if (caja.estado === 'abierta') {
  this.estadoCierre = 'abierta';
} else {
  this.estadoCierre = 'pendiente';
}

const cierres = await this.supabaseService.obtenerUltimosCierresCombinado();
 this.ultimosCierres = cierres;
  }
}
// Añade estos métodos a tu componente
calcularPorcentaje(parcial: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((parcial / total) * 100);
}
mostrarModal() {
    this.mostrar = true;
  }
cerrarModal() {
    this.mostrar = false;
  }
  calcularPorcentajeGastos(): number {
  const totalVentas = this.getTotalByPago('efectivo') + this.getTotalByPago('transferencia');
  const total = totalVentas + this.totalGastos;
  if (total === 0) return 0;
  return (this.totalGastos / total) * 100;
}
get gastosEfectivoCount(): number {
  return this.gastosDelDia.filter(g => g.metodo_pago === 'efectivo').length;
}

get gastosTransferenciaCount(): number {
  return this.gastosDelDia.filter(g => g.metodo_pago === 'transferencia').length;
}
async ejecutarCierreYMostrarModal(): Promise<void> {
  try {
    await this.realizarCierre();  // Solo ejecuta el cierre
    // NO abrir modal aquí
  } catch (error) {
    console.error('Error al realizar el cierre:', error);
  }
}


async abrirCaja() {
  const usuario_nombre = this.nombreUsuario;
  const fecha_operativa = getLocalDateString();
  const hora_apertura = getLocalDateTimeString();

  try {
    // ✅ Obtener el máximo número de cierre de forma global
    const maxNumero = await this.supabaseService.obtenerMaxNumeroCierreGlobal();
    const nuevoNumeroCierre = maxNumero !== null ? maxNumero + 1 : 1;

    // 👉 Insertar nueva sesión de caja
    const resultado = await this.supabaseService.registrarAperturaCaja({
      usuario_nombre,
      fecha_operativa,
      hora_apertura,
      numero_cierre: nuevoNumeroCierre,
      observaciones: getObservacionPorTurno(),
    });

    // Validaciones
    if (resultado.error) {
      if (resultado.error.includes('sesión de caja abierta')) {
        Swal.fire({
          icon: 'warning',
          title: 'Caja ya abierta',
          text: resultado.error,
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo abrir la caja. Intenta de nuevo.',
        });
      }
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Caja abierta',
        text: 'Caja abierta con éxito.',
        timer: 2000,
        showConfirmButton: false
      });
      // 🔽 NUEVO: cargar estado y cierres
const caja = await this.supabaseService.obtenerCajaAbierta(this.nombreUsuario);

if (!caja) {
  this.estadoCierre = 'cerrada';
} else if (caja.estado === 'abierta') {
  this.estadoCierre = 'abierta';
} else {
  this.estadoCierre = 'pendiente';
}

const cierres = await this.supabaseService.obtenerUltimosCierresCombinado();
 this.ultimosCierres = cierres;
}
   
  } catch (error) {
    console.error('Error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error de sistema. Intenta más tarde.',
    });
  }
}

  getFechaLegible(): string {
    const ahora = new Date();
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    const diaSemana = dias[ahora.getDay()];
    const diaMes = ahora.getDate();
    const mes = meses[ahora.getMonth()];
    const anio = ahora.getFullYear();

    return `${this.capitalize(diaSemana)}, ${diaMes} de ${mes} de ${anio}`;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

async cargarCierres() {
  try {
    this.listaCierres = await this.supabaseService.obtenerCierresDeCaja();
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudieron cargar los cierres de caja.',
    });
  }
}

async generarReporteCierres(cierres: any[]) {
  const logoBase64 = await this.getBase64ImageFromURL('assets/splash/logosinfondo.png');
  const doc = new jsPDF();
  const margenIzq = 14;
  const anchoPagina = 210;

  cierres.forEach((cierre, index) => {
    if (index !== 0) doc.addPage();

  // Encabezado
doc.setFillColor(22, 72, 99);
doc.rect(0, 0, anchoPagina, 45, 'F');

const anchoImagen = 35;
const posX = (anchoPagina / 2) - (anchoImagen / 2);
const posY = 5;

doc.addImage(logoBase64, 'PNG', posX, posY, anchoImagen, 20);

doc.setFontSize(20);
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');

// Subo el texto para que no quede encima de la imagen
doc.text('REPORTE DE CIERRE DE CAJA', anchoPagina / 2, 30, { align: 'center' });

doc.setFontSize(14);
doc.text(`N° ${cierre.numero_cierre}`, anchoPagina / 2, 40, { align: 'center' });

    // Info
    doc.setFillColor(248, 249, 250);
    doc.rect(margenIzq, 55, anchoPagina - 2 * margenIzq, 20, 'F');
    doc.setFontSize(10);
    doc.setTextColor(73, 80, 87);
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha de Cierre:', margenIzq + 4, 63);
    doc.text('Responsable:', margenIzq + (anchoPagina - 2 * margenIzq) / 2 + 4, 63);
    doc.setFont('helvetica', 'normal');
    doc.text(cierre.fecha_cierre, margenIzq + 4, 70);
    doc.text(cierre.creado_por, margenIzq + (anchoPagina - 2 * margenIzq) / 2 + 4, 70);

    // Título ventas
    doc.setTextColor(22, 72, 99);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('INGRESOS POR VENTAS', margenIzq, 85);

    // Tabla ventas
    autoTable(doc, {
      startY: 90,
      margin: { left: margenIzq, right: margenIzq },
      head: [['Método de Pago', 'Monto']],
      body: [
        ['Efectivo', `$${Number(cierre.total_ventas_efectivo).toFixed(2)}`],
        ['Transferencia', `$${Number(cierre.total_ventas_transferencia).toFixed(2)}`],
        ['Tarjeta de Crédito', `$${Number(cierre.total_ventas_tarjeta).toFixed(2)}`],
        ['PedidosYa', `$${Number(cierre.total_ventas_pedidos_ya).toFixed(2)}`],
        ['Beez', `$${Number(cierre.total_ventas_pedidos_beez).toFixed(2)}`],
        ['Crédito', `$${Number(cierre.total_ventas_credito).toFixed(2)}`],
      ],
      foot: [['TOTAL VENTAS', `$${Number(cierre.total_ventas).toFixed(2)}`]],
      styles: {
        fontSize: 9,
        textColor: [73, 80, 87],
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [22, 72, 99],
        textColor: 255,
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      columnStyles: {
        0: { halign: 'left', valign: 'middle' },
        1: { halign: 'right', valign: 'middle' },
      },
      didParseCell(data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.halign = 'left';
          if (data.column.index === 1) data.cell.styles.halign = 'right';
        }
      },
    });

    // Tabla gastos
    const posGastosY = (doc as any).lastAutoTable.finalY + 15;
    doc.setTextColor(22, 72, 99);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('EGRESOS Y GASTOS', margenIzq, posGastosY);

    autoTable(doc, {
      startY: posGastosY + 9,
      margin: { left: margenIzq, right: margenIzq },
      head: [['Método de Pago', 'Monto']],
      body: [
        ['Efectivo', `$${Number(cierre.total_gastos_efectivo).toFixed(2)}`],
        ['Transferencia', `$${Number(cierre.total_gastos_transferencia).toFixed(2)}`],
      ],
      foot: [['TOTAL GASTOS', `$${Number(cierre.total_gastos).toFixed(2)}`]],
      styles: {
        fontSize: 9,
        textColor: [73, 80, 87],
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [22, 72, 99],
        textColor: 255,
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      columnStyles: {
        0: { halign: 'left', valign: 'middle' },
        1: { halign: 'right', valign: 'middle' },
      },
      didParseCell(data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.halign = 'left';
          if (data.column.index === 1) data.cell.styles.halign = 'right';
        }
      },
    });

 // Calcular espacio requerido para el resumen (aprox 40 de alto + un margen extra)
const altoResumen = 50; 

// Posición actual para poner el resumen
let posResumenY = (doc as any).lastAutoTable.finalY + 5;

// Verificar espacio disponible en la página (suponiendo altura útil 280)
if (posResumenY + altoResumen > 280) {
  doc.addPage();
  posResumenY = 40;  // empezar más arriba en nueva página
}

// Dibujar resumen financiero
doc.setDrawColor(22, 72, 99);
doc.setFillColor(248, 249, 250);
doc.roundedRect(margenIzq, posResumenY, anchoPagina - 2 * margenIzq, 40, 3, 3, 'FD');

doc.setTextColor(22, 72, 99);
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.text('RESUMEN DE CUADRE DE CAJA', margenIzq + 4, posResumenY + 10);

doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.setTextColor(0, 0, 0);
doc.text(`Total Registrado por el Sistema: $${Number(cierre.total_esperado).toFixed(2)}`, margenIzq + 10, posResumenY + 22);
doc.text(`Fondo Real en Caja: $${Number(cierre.monto_contado).toFixed(2)}`, margenIzq + 10, posResumenY + 30);

doc.setTextColor(
  cierre.diferencia >= 0 ? 40 : 220,
  cierre.diferencia >= 0 ? 167 : 53,
  cierre.diferencia >= 0 ? 69 : 69
);
doc.text(
  `Descuadre de Caja: $${Number(cierre.diferencia).toFixed(2)}`,
  margenIzq + (anchoPagina - 2 * margenIzq) / 2 + 10,
  posResumenY + 22
);

doc.setTextColor(0, 0, 0);
doc.text(
  `Efectivo Neto a Depositar: $${Number(cierre.total_a_depositar).toFixed(2)}`,
  margenIzq + (anchoPagina - 2 * margenIzq) / 2 + 10,
  posResumenY + 30
);

// --- Ahora para las observaciones ---

const textoObs = doc.splitTextToSize(cierre.observaciones || 'No hay observaciones.', anchoPagina - 2 * margenIzq - 12);
const altoObs = textoObs.length * 7 + 20;

// Posición para observaciones, justo debajo del resumen
let posObsY = posResumenY + altoResumen + 15;  // +15 margen extra

// Verificar espacio para observaciones
if (posObsY + altoObs > 280) {
  doc.addPage();
  posObsY = 40;  // nuevo inicio arriba
}

// Fondo gris claro
doc.setFillColor(248, 249, 250);
doc.rect(margenIzq, posObsY, anchoPagina - 2 * margenIzq, altoObs, 'F');

// Línea azul lateral
doc.setDrawColor(52, 152, 219);
doc.setLineWidth(3);
doc.line(margenIzq + 2, posObsY, margenIzq + 2, posObsY + altoObs);

// Título observaciones
doc.setTextColor(22, 72, 99);
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.text('OBSERVACIONES', margenIzq + 10, posObsY + 10);

// Texto observaciones
doc.setTextColor(73, 80, 87);
doc.setFont('helvetica', 'italic');
doc.setFontSize(10);
doc.text(textoObs, margenIzq + 10, posObsY + 20);

  

    // Pie de página
  // Pie de página en todas las páginas
const nombreRestaurante = 'Restaurante A Fuego Lento'; // 🔥 Tu nombre aquí
const fechaGeneracion = new Date().toLocaleDateString();

const totalPaginas = doc.getNumberOfPages();

for (let i = 1; i <= totalPaginas; i++) {
  doc.setPage(i);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`${nombreRestaurante} — Generado el ${fechaGeneracion}`, anchoPagina / 2, 295, { align: 'center' });
}});

 const fechaInicio = cierres[0]?.fecha_cierre.replace(/[/\\?%*:|"<> ]/g, '-');

  const nombreArchivo = `reporte_cierres_caja_con_fecha_${fechaInicio}.pdf`;

  // Guardar con nombre dinámico
  doc.save(nombreArchivo);
}
async imprimirReporte() {
  try {
    const cierres = await this.supabaseService.obtenerCierresDeCaja();
    this.generarReporteCierres(cierres);
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo generar el reporte.',
    });
  }
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
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = error => reject(error);
      img.src = url;
    });
  }
async exportarReporteExcel() {
  try {
    const cierres = await this.supabaseService.obtenerCierresDeCaja();
    await this.exportarReporteCierresExcel(cierres); // Aquí llamas tu función Excel y le pasas los datos
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo exportar el reporte Excel.',
    });
  }
}



async exportarReporteCierresExcel(cierres: any[]) {
  const workbook = new ExcelJS.Workbook();

  cierres.forEach(cierre => {
    const sheet = workbook.addWorksheet(`Cierre ${cierre.numero_cierre}`);

    // Encabezado grande centrado
    sheet.mergeCells('A1', 'E1');
    const header = sheet.getCell('A1');
    header.value = 'REPORTE DE CIERRE DE CAJA';
    header.font = { size: 16, bold: true };
    header.alignment = { horizontal: 'center', vertical: 'middle' };

    // Número cierre
    sheet.mergeCells('A2', 'E2');
    const numCierre = sheet.getCell('A2');
    numCierre.value = `N° ${cierre.numero_cierre}`;
    numCierre.font = { size: 14, bold: true };
    numCierre.alignment = { horizontal: 'center' };

    sheet.addRow([]);

    // Info general
    sheet.addRow(['Fecha de Cierre:', cierre.fecha_cierre, '', 'Responsable:', cierre.creado_por]);

    sheet.addRow([]);

    // Ingresos por ventas (Título)
    const ingresosTitle = sheet.addRow(['INGRESOS POR VENTAS']);
    ingresosTitle.font = { bold: true, size: 12 };
    sheet.mergeCells(`A${ingresosTitle.number}:E${ingresosTitle.number}`);

    // Tabla de ingresos
    const ingresosHeader = sheet.addRow(['Método de Pago', 'Monto']);
    ingresosHeader.font = { bold: true };
    ingresosHeader.alignment = { horizontal: 'center' };
    ingresosHeader.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF164863' }, // azul oscuro
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });

    // Datos de ingresos
    const ingresosData = [
      ['Efectivo', cierre.total_ventas_efectivo],
      ['Transferencia', cierre.total_ventas_transferencia],
      ['Tarjeta de Crédito', cierre.total_ventas_tarjeta],
      ['PedidosYa', cierre.total_ventas_pedidos_ya],
      ['Beez', cierre.total_ventas_pedidos_beez],
      ['Crédito', cierre.total_ventas_credito],
    ];

    ingresosData.forEach(row => {
      const r = sheet.addRow(row);
      r.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      r.getCell(2).numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';
    });

    // Total ventas
    const totalVentasRow = sheet.addRow(['TOTAL VENTAS', cierre.total_ventas]);
    totalVentasRow.font = { bold: true };
    totalVentasRow.eachCell(cell => {
      cell.border = {
        top: { style: 'double' },
        bottom: { style: 'double' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    totalVentasRow.getCell(2).numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';

    sheet.addRow([]);

    // Egresos y gastos (mismo formato que ingresos)
    const gastosTitle = sheet.addRow(['EGRESOS Y GASTOS']);
    gastosTitle.font = { bold: true, size: 12 };
    sheet.mergeCells(`A${gastosTitle.number}:E${gastosTitle.number}`);

    const gastosHeader = sheet.addRow(['Método de Pago', 'Monto']);
    gastosHeader.font = { bold: true };
    gastosHeader.alignment = { horizontal: 'center' };
    gastosHeader.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF164863' },
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });

    const gastosData = [
      ['Efectivo', cierre.total_gastos_efectivo],
      ['Transferencia', cierre.total_gastos_transferencia],
    ];

    gastosData.forEach(row => {
      const r = sheet.addRow(row);
      r.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      r.getCell(2).numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';
    });

    const totalGastosRow = sheet.addRow(['TOTAL GASTOS', cierre.total_gastos]);
    totalGastosRow.font = { bold: true };
    totalGastosRow.eachCell(cell => {
      cell.border = {
        top: { style: 'double' },
        bottom: { style: 'double' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    totalGastosRow.getCell(2).numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';

    sheet.addRow([]);

    // Resumen
    const resumenTitle = sheet.addRow(['RESUMEN DE CUADRE DE CAJA']);
    resumenTitle.font = { bold: true, size: 12 };
    sheet.mergeCells(`A${resumenTitle.number}:E${resumenTitle.number}`);

    const resumenData = [
      ['Total Registrado por el Sistema', cierre.total_esperado],
      ['Fondo Real en Caja', cierre.monto_contado],
      ['Descuadre de Caja', cierre.diferencia],
      ['Efectivo Neto a Depositar', cierre.total_a_depositar],
    ];

    resumenData.forEach(row => {
      const r = sheet.addRow(row);
      r.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      r.getCell(2).numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';
    });

    sheet.addRow([]);

    // Observaciones
    const obsTitle = sheet.addRow(['OBSERVACIONES']);
    obsTitle.font = { bold: true, size: 12 };
    sheet.mergeCells(`A${obsTitle.number}:E${obsTitle.number}`);

    const obsRow = sheet.addRow([cierre.observaciones || 'No hay observaciones.']);
    obsRow.alignment = { wrapText: true };

    // Ajustar ancho columnas
    sheet.columns = [
      { key: 'a', width: 30 },
      { key: 'b', width: 20 },
      { key: 'c', width: 10 },
      { key: 'd', width: 30 },
      { key: 'e', width: 20 },
    ];
  });

  // Generar archivo Excel y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
   // Si quieres poner la fecha en el nombre del archivo, toma una fecha de cierres fuera del forEach
  const fechaInicio = cierres[0]?.fecha_cierre.replace(/[/\\?%*:|"<> ]/g, '-');

  const nombreArchivo = `reporte_cierre_de_${fechaInicio}.xlsx`;

  // Guardar archivo con file-saver
  saveAs(blob, nombreArchivo);
}



}
function getLocalDateTimeString() {
  const ahora = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;
}
function getLocalDateString() {
  const ahora = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
}
function getObservacionPorTurno() {
  const ahora = new Date();
  const hora = ahora.getHours();

  if (hora >= 6 && hora < 18) {
    return 'Apertura turno día';
  } else {
    return 'Apertura turno noche';
  }
}
