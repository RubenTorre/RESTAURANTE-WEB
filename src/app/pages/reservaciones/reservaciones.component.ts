import { Component, ViewChild } from '@angular/core';
import { FormsModule  } from '@angular/forms';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import Swal from 'sweetalert2';
import { FullCalendarModule,FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction'; // para clicks y drag
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

@Component({
  selector: 'app-reservaciones',
  imports: [CommonModule,FormsModule,NgSelectModule, FullCalendarModule  ],
  templateUrl: './reservaciones.component.html',
  styleUrl: './reservaciones.component.css',
  providers: [
  { provide: LOCALE_ID, useValue: 'es' }
]
})
export default class ReservacionesComponent {
 
  loading = false;
  mensajeError = '';
  mensajeExito = '';
  modalAbierto = false;
  reserva = {
    nombre_cliente: '',
    motivo: '',
    motivo_otro:'',
    mesa_id: '',
    personas: 1,
    fecha: '',
    hora: '',
    comentarios: ''
  };
  motivos = [
  { value: 'cumpleaños', label: 'Cumpleaños', icon: 'fas fa-birthday-cake' },
  { value: 'aniversario', label: 'Aniversario', icon: 'fas fa-heart' },
  { value: 'boda', label: 'Boda', icon: 'fas fa-ring' },
  { value: 'graduación', label: 'Graduación', icon: 'fas fa-graduation-cap' },
  { value: 'reunión', label: 'Reunión', icon: 'fas fa-handshake' },
  { value: 'otro', label: 'Otro', icon: 'fas fa-pen' },
];
listaReservaciones: any[] = [];
modalEdicionAbierto = false;
reservacionSeleccionada: any = null;
paginaActual = 1;
reservacionesPorPagina = 5;
fechaFiltro: string = ''; // guardará la fecha en formato YYYY-MM-DD
listaReservacionesFiltradas: any[] = [];

  calendarEvents: any[] = [];

 

   // Plugins que usará FullCalendar
  calendarPlugins = [dayGridPlugin, interactionPlugin,timeGridPlugin];

  // Opciones básicas del calendario
calendarOptions: any = {
  plugins: this.calendarPlugins,
  initialView: 'dayGridMonth',
  events: this.calendarEvents,
  eventClick: this.handleEventClick.bind(this),
  dateClick: this.handleDateClick.bind(this),
  locale: 'es',
  height: 'auto',
  headerToolbar: {
    left: 'prev',
    center: 'title',
    right: 'next'
  },
  dayHeaderFormat: { weekday: 'short' },
  dayMaxEvents: 2,
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  },
  eventDisplay: 'block',
  eventBorderColor: 'transparent',
  eventTextColor: '#fff',
  eventClassNames: (arg: { event: { extendedProps: { reservacion: { estado: string } } } }) => {
    return arg.event.extendedProps.reservacion.estado; // 'confirmado', 'pendiente', 'cancelado'
  },
  dayCellContent: (e: { dayNumberText: string }) => {
    return { html: `<div class="fc-daygrid-day-number">${e.dayNumberText}</div>` };
  },
  // Asegurar que todos los elementos sean interactivos
  dayCellDidMount: (info: { el: HTMLElement }) => {
    info.el.style.cursor = 'pointer';
  },
  eventDidMount: (info: { el: HTMLElement }) => {
    info.el.style.cursor = 'pointer';
  }
};


  fechaSeleccionada: Date = new Date();
horariosDisponibles: {
  hora: string;
  horaCompleta: string;
  disponible?: boolean;
  pendiente?: boolean;
  confirmado?: boolean;
  noDisponible?: boolean;
  reservacion?: any;
}[] = [];

horarioApertura = 11; // 11 AM
horarioCierre = 22;   // 10 PM
intervalo = 30;       // Intervalo de 30 minutos
 fechaHoy: string = '';
  constructor(private reservacionesService: SupabaseService) {}
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  ngOnInit() {
    const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');

  this.fechaFiltro = `${yyyy}-${mm}-${dd}`;
  this.filtrarPorFecha();
  this.cargarReservaciones();
    this.generarOpcionesHoras();
     this.actualizarFechaHoy();

}


async guardarReservacion() {
  // Validación básica
  if (
    !this.reserva.nombre_cliente ||
    !this.reserva.fecha ||
    !this.reserva.hora ||
    !this.reserva.mesa_id ||
    this.reserva.mesa_id.trim() === ''
  ) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      text: 'Por favor completa todos los campos obligatorios.'
    });
    return;
  }

  if (!this.reserva.motivo) {
    Swal.fire({
      icon: 'warning',
      title: 'Motivo requerido',
      text: 'Por favor selecciona un motivo para la reserva.'
    });
    return;
  }

  if (
    this.reserva.motivo === 'otro' &&
    (!this.reserva.motivo_otro || this.reserva.motivo_otro.trim() === '')
  ) {
    Swal.fire({
      icon: 'warning',
      title: 'Motivo adicional requerido',
      text: 'Por favor especifica el motivo de la reserva.'
    });
    return;
  }

  // (Opcional) Validar que solo tenga números, comas y espacios
  const regexMesas = /^[0-9,\s]+$/;
  if (!regexMesas.test(this.reserva.mesa_id.trim())) {
    Swal.fire({
      icon: 'warning',
      title: 'Formato incorrecto',
      text: 'Por favor escribe las mesas usando solo números separados por comas.'
    });
    return;
  }

  // Motivo final
  const motivoFinal =
    this.reserva.motivo === 'otro'
      ? this.reserva.motivo_otro.trim()
      : this.reserva.motivo;

  // Objeto a enviar
  const { motivo_otro, ...resto } = this.reserva;
  const reservacionEnviar = {
    ...resto,
    motivo: motivoFinal,
    mesa_id: this.reserva.mesa_id.trim()
  };


  this.loading = true;

  try {
    const respuesta = await this.reservacionesService.crearReservacion(
      reservacionEnviar
    );

    if (respuesta.error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `No se pudo guardar la reservación: ${respuesta.error}`
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: '¡Reservación guardada!',
        text: 'Tu reservación se ha guardado correctamente.'
      });
this.cargarReservaciones();
      // Resetear campos
      this.reserva = {
        nombre_cliente: '',
        motivo: '',
        motivo_otro: '',
        mesa_id: '',
        personas: 1,
        fecha: '',
        hora: '',
        comentarios: ''
      };
      this.cerrarModal();
    }
  } catch (e) {
    Swal.fire({
      icon: 'error',
      title: 'Error inesperado',
      text: 'Hubo un error al guardar la reservación.'
    });
  } finally {
    this.loading = false;
  }
}

  abrirModal() {
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.mensajeError = '';
    this.mensajeExito = '';
  }
async cargarReservaciones() {
  const resultado = await this.reservacionesService.obtenerReservaciones();

  if (resultado.error) {
    console.error('❌ [cargarReservaciones] Error al cargar reservaciones:', resultado.error);
    return;
  }

  let reservaciones = resultado.data ?? [];

  reservaciones.sort((a, b) => {
    if (a.estado === 'cancelado' && b.estado !== 'cancelado') return 1;
    if (b.estado === 'cancelado' && a.estado !== 'cancelado') return -1;
    const fechaA = new Date(a.updated_at || a.created_at || 0).getTime();
    const fechaB = new Date(b.updated_at || b.created_at || 0).getTime();
    return fechaB - fechaA;
  });

  this.listaReservaciones = reservaciones;
  this.listaReservacionesFiltradas = [...this.listaReservaciones];

  this.calendarEvents = this.listaReservaciones.map(r => ({
    title: r.estado === 'confirmado' ? 'Confirmada' :
           r.estado === 'pendiente' ? 'Pendiente' : 'Cancelada',
    date: r.fecha,
    color: r.estado === 'confirmado' ? 'green' :
           r.estado === 'pendiente' ? 'orange' : 'gray',
    extendedProps: { reservacion: r }
  }));


  this.calendarOptions = {
    ...this.calendarOptions,
    events: this.calendarEvents
  };

  this.actualizarHorariosDisponibles();
}
handleDateClick(dateInfo: any) {
  const fecha = dateInfo.dateStr;

  const reservasDelDia = this.listaReservaciones.filter(r => r.fecha === fecha);

  if (reservasDelDia.length === 0) {
    Swal.fire('No hay reservaciones para este día', '', 'info');
    return;
  }

  const getEstadoHtml = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'confirmado':
        return `<span style="color: #28a745; font-weight: 700;">✔ Confirmado</span>`;
      case 'pendiente':
        return `<span style="color: #ffc107; font-weight: 700;">⏳ Pendiente</span>`;
      case 'cancelado':
        return `<span style="color: #dc3545; font-weight: 700;">✖ Cancelado</span>`;
      default:
        return `<span>${estado}</span>`;
    }
  };

  const html = reservasDelDia.map(r =>
    `
    <div style="
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      text-align: left;
      transition: transform 0.2s ease;
    " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="font-size: 18px; font-weight: 700; color: #222;">🕒 ${r.hora}</div>
        <div style="font-size: 16px;">${getEstadoHtml(r.estado)}</div>
      </div>
      <p><strong>👤 Cliente:</strong> ${r.nombre_cliente || 'N/A'}</p>
      <p><strong>🎯 Motivo:</strong> ${r.motivo || 'N/A'}</p>
      <p><strong>📝 Comentarios:</strong> ${r.comentarios || 'Sin comentarios'}</p>
      <p><strong>👥 Personas:</strong> ${r.personas || 0}</p>
      <p><strong>🍽️ Mesas:</strong> ${r.mesa_id || 'N/A'}</p>
    </div>
    `
  ).join('');

  Swal.fire({
    title: `Reservaciones para ${fecha}`,
    html,
    icon: 'info',
    width: '600px',
    scrollbarPadding: false,
    confirmButtonColor: '#3085d6',
    confirmButtonText: 'Cerrar',
    background: '#f4f6f8'
  });
}

handleEventClick(clickInfo: any) {
  const reservacion = clickInfo.event.extendedProps.reservacion;

  const getEstadoHtml = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'confirmado':
        return `<span style="color: #28a745; font-weight: 700;">✔ Confirmado</span>`;
      case 'pendiente':
        return `<span style="color: #ffc107; font-weight: 700;">⏳ Pendiente</span>`;
      case 'cancelado':
        return `<span style="color: #dc3545; font-weight: 700;">✖ Cancelado</span>`;
      default:
        return `<span>${estado}</span>`;
    }
  };

  Swal.fire({
    title: `Reserva ${reservacion.estado}`,
    html: `
      <div style="
        max-width: 400px;
        background: #fff;
        border-radius: 12px;
        padding: 25px 30px;
        margin: 0 auto;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #333;
        text-align: left;
        box-shadow: 0 6px 15px rgba(0,0,0,0.15);
      ">
        <p style="font-size: 18px; font-weight: 700; margin-bottom: 10px;">📅 Fecha: <span style="font-weight: 400;">${reservacion.fecha}</span></p>
        <p style="font-size: 18px; font-weight: 700; margin-bottom: 10px;">🕒 Hora: <span style="font-weight: 400;">${reservacion.hora}</span></p>
        <p style="font-size: 18px; font-weight: 700; margin-bottom: 15px;">Estado: ${getEstadoHtml(reservacion.estado)}</p>
        <p><strong>👤 Cliente:</strong> ${reservacion.nombre_cliente || 'N/A'}</p>
        <p><strong>🎯 Motivo:</strong> ${reservacion.motivo || 'N/A'}</p>
        <p><strong>👥 Personas:</strong> ${reservacion.personas || 'N/A'}</p>
        <p><strong>🍽️ Mesas:</strong> ${reservacion.mesa_id || 'N/A'}</p>
        <p><strong>📝 Comentarios:</strong> ${reservacion.comentarios || 'Sin comentarios'}</p>
      </div>
    `,
    icon: 'info',
    confirmButtonColor: '#3085d6',
    confirmButtonText: 'Cerrar'
  });
}




mostrarDetalleReservacion(horario: any) {
  const reservacion = horario.reservacion;

  if (!reservacion) {
    Swal.fire({
      icon: 'success',
      title: `Horario disponible`,
      html: `
        <div style="
          max-width: 400px;
          background: #fff;
          border-radius: 12px;
          padding: 25px 30px;
          margin: 0 auto;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          text-align: center;
          box-shadow: 0 6px 15px rgba(0,0,0,0.15);
        ">
          <div style="font-size: 48px; color: #28a745; margin-bottom: 10px;">✔</div>
          <p style="font-size: 18px; font-weight: 700;">La hora <strong>${horario.horaCompleta}</strong> está disponible.</p>
        </div>
      `
    });
    return;
  }

  const getEstadoHtml = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'confirmado':
        return `<span style="color: #28a745; font-weight: 700;">✔ Confirmado</span>`;
      case 'pendiente':
        return `<span style="color: #ffc107; font-weight: 700;">⏳ Pendiente</span>`;
      case 'cancelado':
        return `<span style="color: #dc3545; font-weight: 700;">✖ Cancelado</span>`;
      default:
        return `<span>${estado}</span>`;
    }
  };

  Swal.fire({
    title: `Reservación - ${horario.horaCompleta}`,
    html: `
      <div style="
        max-width: 400px;
        background: #fff;
        border-radius: 12px;
        padding: 25px 30px;
        margin: 0 auto;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #333;
        text-align: left;
        box-shadow: 0 6px 15px rgba(0,0,0,0.15);
      ">
        <p style="font-size: 18px; font-weight: 700; margin-bottom: 10px;">📅 Fecha: <span style="font-weight: 400;">${reservacion.fecha}</span></p>
        <p style="font-size: 18px; font-weight: 700; margin-bottom: 10px;">🕒 Hora: <span style="font-weight: 400;">${reservacion.hora}</span></p>
        <p style="font-size: 18px; font-weight: 700; margin-bottom: 15px;">Estado: ${getEstadoHtml(reservacion.estado)}</p>
        <p><strong>👤 Cliente:</strong> ${reservacion.nombre_cliente || 'N/A'}</p>
        <p><strong>🎯 Motivo:</strong> ${reservacion.motivo || 'N/A'}</p>
        <p><strong>👥 Personas:</strong> ${reservacion.personas || 'N/A'}</p>
        <p><strong>🍽️ Mesas:</strong> ${reservacion.mesa_id || 'N/A'}</p>
        <p><strong>📝 Comentarios:</strong> ${reservacion.comentarios || 'Sin comentarios'}</p>
      </div>
    `,
    icon: 'info',
    confirmButtonColor: '#3085d6',
    confirmButtonText: 'Cerrar'
  });
}



actualizarHorariosDisponibles(): void {
  const fechaStr = this.formatDate(this.fechaSeleccionada);

  // Filtrar reservaciones para esta fecha (excluyendo canceladas)
  const reservacionesDia = this.listaReservaciones.filter(r =>
    r.fecha === fechaStr && r.estado !== 'cancelado'
  );

 
  // Generar todos los horarios posibles
  const todosHorarios = this.generarHorariosDisponibles();

  // Mapear a estructura para el template
  this.horariosDisponibles = todosHorarios.map(hora => {
    const horaStr = hora + ':00';

    // Buscar reservación exacta para este horario
    const reservacion = reservacionesDia.find(r => r.hora?.slice(0, 5) === hora);

    return {
      hora: hora,
      horaCompleta: horaStr,
      disponible: !reservacion, // Verde si no hay reservación
      pendiente: reservacion?.estado === 'pendiente', // Amarillo
      confirmado: reservacion?.estado === 'confirmado', // Rojo
      reservacion: reservacion
    };
  });

 
}


// Método para generar los horarios (igual que antes)
generarHorariosDisponibles(): string[] {
  const horarios: string[] = [];
  
  for (let hora = this.horarioApertura; hora <= this.horarioCierre; hora++) {
    for (let minuto = 0; minuto < 60; minuto += this.intervalo) {
      if (hora === this.horarioCierre && minuto > 0) break;
      
      const horaStr = hora.toString().padStart(2, '0');
      const minutoStr = minuto.toString().padStart(2, '0');
      horarios.push(`${horaStr}:${minutoStr}`);
    }
  }
  
  return horarios;
}
// Formatear fecha a YYYY-MM-DD
formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}



abrirModalEdicion(reservacion: any) {
  this.reservacionSeleccionada = { ...reservacion }; // clonar para evitar editar directamente
  this.modalEdicionAbierto = true;
}
cerrarModalEdicion() {
  this.modalEdicionAbierto = false;
  this.reservacionSeleccionada = null;
}

async guardarEdicion() {
  const id = this.reservacionSeleccionada.id;
  const datos = { ...this.reservacionSeleccionada };
  delete datos.id;

  // Confirmación antes de guardar (opcional)
  const { isConfirmed } = await Swal.fire({
    title: '¿Confirmar cambios?',
    text: "Se actualizará la reservación.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, guardar',
    cancelButtonText: 'Cancelar'
  });

  if (!isConfirmed) return; // Si cancela, no hace nada

  const resultado = await this.reservacionesService.editarReservacion(id, datos);

  if (resultado.error) {
    console.error('Error al guardar cambios:', resultado.error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudieron guardar los cambios.',
    });
  } else {
    this.cargarReservaciones(); // refrescar la lista
    this.cerrarModalEdicion();
    Swal.fire({
      icon: 'success',
      title: '¡Guardado!',
      text: 'La reservación fue actualizada correctamente.',
      timer: 2000,
      showConfirmButton: false,
    });
  }
}

async confirmarReservacion(id: string) {
  const resultado = await this.reservacionesService.confirmarReservacion(id);
  if (resultado.error) {
    console.error('Error al confirmar reservación:', resultado.error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo confirmar la reservación.',
    });
  } else {
    this.cargarReservaciones();
    Swal.fire({
      icon: 'success',
      title: 'Confirmado',
      text: 'La reservación ha sido confirmada exitosamente.',
      timer: 2000,
      showConfirmButton: false,
    });
  }
}

async cancelarReservacion(id: string) {
  const resultado = await this.reservacionesService.cancelarReservacion(id);
  if (resultado.error) {
    console.error('Error al cancelar reservación:', resultado.error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo cancelar la reservación.',
    });
  } else {
    this.cargarReservaciones();
    Swal.fire({
      icon: 'success',
      title: 'Cancelado',
      text: 'La reservación ha sido cancelada exitosamente.',
      timer: 2000,
      showConfirmButton: false,
    });
  }
}
get totalPaginas() {
  return Math.ceil(this.listaReservacionesFiltradas.length / this.reservacionesPorPagina);
}

get reservacionesPaginadas() {
  const inicio = (this.paginaActual - 1) * this.reservacionesPorPagina;
  return this.listaReservacionesFiltradas.slice(inicio, inicio + this.reservacionesPorPagina);
}


cambiarPagina(pagina: number) {
  if (pagina >= 1 && pagina <= this.totalPaginas) {
    this.paginaActual = pagina;
  }
}
filtrarPorFecha() {
  if (!this.fechaFiltro) {
    this.listaReservacionesFiltradas = [...this.listaReservaciones];
  } else {
    this.listaReservacionesFiltradas = this.listaReservaciones.filter(r => r.fecha === this.fechaFiltro);
  }
  this.paginaActual = 1; // resetear la página al cambiar filtro
}
// Opciones de horas de 7:00 a 20:00 en intervalos de 30 minutos
opcionesHoras: string[] = [];


generarOpcionesHoras() {
  this.opcionesHoras = [];
  for (let hora = 11; hora <= 22; hora++) {
    this.opcionesHoras.push(`${hora.toString().padStart(2, '0')}:00`);
    if (hora !== 22) { // No agregamos 22:30 porque es más allá del cierre
      this.opcionesHoras.push(`${hora.toString().padStart(2, '0')}:30`);
    }
  }
}
actualizarFechaHoy() {
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                 "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const hoy = new Date();
  this.fechaHoy = `${hoy.getDate()} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
}

}
