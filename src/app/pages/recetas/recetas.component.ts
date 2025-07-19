import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

interface Producto {
  id: string;
  nombre: string;
  costo_unitario: number;
  stock_actual: number;
}

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
  precio_venta?: number;
  ganancia?: number;
  porcentajeGanancia?: number;
}

@Component({
  selector: 'app-recetas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recetas.component.html',
  styleUrls: ['./recetas.component.css']
})
export default class RecetasComponent implements OnInit {
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  buscador = '';
  ingredienteSeleccionado: Producto | null = null;
  cantidadSeleccionada: number = 1;
  recetaSeleccionada: Receta | null = null;
  productosDisponibles: any[] = [];
  receta: Receta = {
    nombre: '',
    ingredientes: [],
    precio_preparacion: 0,
    precio_venta: 0,
    ganancia: 0,
  };
  recetas: Receta[] = [];
  recetaAEliminar: Receta | null = null;
  mostrarConfirmacionEliminar = false;

  mostrarModalEditarReceta = false;
  mostrarModalReceta = false;
  cargando = false;
  terminoBusquedaIngrediente: string = '';
  productosFiltradosBusqueda: any[] = [];
  terminoBusquedaReceta: string = '';
  recetasFiltradas: any[] = [];
  nuevaImagenFile?: File;
  previewImagenUrl: string | null = null;


  constructor(private supabaseService: SupabaseService) { }

  async ngOnInit() {
    await this.cargarProductos();
    await this.cargarRecetas();
  }

  async cargarProductos() {
    try {
      this.cargando = true;
      const productos = await this.supabaseService.obtenerProductos();

      // Filtrar productos que NO estén eliminados
      this.productos = productos.filter(p => !p.eliminado);

      this.productosFiltrados = [...this.productos];
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      this.cargando = false;
    }
  }



  abrirModalReceta(receta?: Receta) {
    if (receta) {
      this.receta = { ...receta };
      this.previewImagenUrl = this.receta.imagen_url ?? null;
      this.nuevaImagenFile = undefined;
    } else {
      this.resetearReceta();
    }
    this.mostrarModalReceta = true;
  }



  cerrarModalReceta() {
    this.mostrarModalReceta = false;
    this.resetearReceta();
  }

  resetearReceta() {
    this.receta = {
      nombre: '',
      ingredientes: [],
      precio_preparacion: 0,
      precio_venta: 0,
      ganancia: 0,
    };
    this.ingredienteSeleccionado = null;
    this.buscador = '';
    this.productosFiltrados = [...this.productos];
  }

  filtrarIngredientes() {
    if (!this.buscador) {
      this.productosFiltrados = [...this.productos];
      return;
    }

    const busqueda = this.buscador.toLowerCase();
    this.productosFiltrados = this.productos.filter(p =>
      p.nombre.toLowerCase().includes(busqueda)
    );
  }

  mostrarInputCantidad(producto: Producto) {
    this.ingredienteSeleccionado = producto;
    this.cantidadSeleccionada = 1;
  }

  agregarIngrediente() {
    if (!this.ingredienteSeleccionado || this.cantidadSeleccionada <= 0) return;

    // Verificar si el ingrediente ya existe en la receta
    const index = this.receta.ingredientes.findIndex(
      i => i.producto_id === this.ingredienteSeleccionado?.id
    );

    if (index >= 0) {
      // Actualizar cantidad si ya existe
      this.receta.ingredientes[index].cantidad += this.cantidadSeleccionada;
    } else {
      // Agregar nuevo ingrediente
      this.receta.ingredientes.push({
        producto_id: this.ingredienteSeleccionado.id,
        nombre: this.ingredienteSeleccionado.nombre,
        cantidad: this.cantidadSeleccionada,
        precio_unitario: this.ingredienteSeleccionado.costo_unitario
      });
    }

    this.calcularPrecioPreparacion();
    this.calcularGanancia();
    this.ingredienteSeleccionado = null;
  }
  // Método cuando se selecciona un ingrediente
  onIngredienteSeleccionado() {
    // Puedes resetear la cantidad o hacer otras acciones aquí
    this.cantidadSeleccionada = 1;
  }
  calcularPrecioPreparacion() {
    if (!this.receta.ingredientes || this.receta.ingredientes.length === 0) {
      this.receta.precio_preparacion = 0;
      return;
    }

    this.receta.precio_preparacion = this.receta.ingredientes.reduce((total, ingrediente) => {
      return total + (ingrediente.precio_unitario * ingrediente.cantidad);
    }, 0);

    // Opcional: si quieres recalcular precio sugerido también:
    // this.receta.precio_sugerido = this.calcularPrecioSugerido(this.receta.precio_preparacion);
  }

  async guardarReceta() {
    if (this.receta.ingredientes.length === 0 || !this.receta.nombre) return;

    try {
      this.cargando = true;
      this.calcularPrecioPreparacion();

      // Crear el objeto recetaData con los nuevos campos de precio_venta y ganancia
      const recetaData = {
        nombre: this.receta.nombre,
        ingredientes: this.receta.ingredientes,
        precio_preparacion: this.receta.precio_preparacion,
        imagen_url: this.receta.imagen_url,  // Mantener la imagen actual si existe
        precio_venta: this.receta.precio_venta, // Asegúrate de que este campo esté en receta
        ganancia: this.receta.ganancia // Asegúrate de que este campo esté en receta
      };

      if (this.receta.id) {
        // Si la receta tiene un id, actualizarla
        await this.supabaseService.actualizarReceta(
          this.receta.id,
          recetaData,
          this.nuevaImagenFile // Puede ser undefined
        );
      } else {
        // Si no tiene id, es una receta nueva, crearla
        await this.supabaseService.agregarReceta(recetaData, this.nuevaImagenFile);
      }

      // Cerrar modal y mostrar éxito
      this.cerrarModalReceta();
      this.mostrarMensajeExito();
      await this.cargarRecetas(); // Actualizar lista

      // Resetear imagen temporal
      this.nuevaImagenFile = undefined;
    } catch (error) {
      console.error('Error guardando receta:', error);
      this.mostrarMensajeError();
    } finally {
      this.cargando = false;
    }
  }

  // Métodos auxiliares en el componente
  mostrarMensajeExito() {
    Swal.fire({
      title: '¡Éxito!',
      text: 'La receta se ha guardado correctamente.',
      icon: 'success',
      confirmButtonText: 'Aceptar',
      timer: 2000
    });
  }

  mostrarMensajeError() {
    Swal.fire({
      title: 'Error',
      text: 'Hubo un problema al guardar la receta. Intenta nuevamente.',
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
  }
  // Método para manejar cambio de imagen
  onImagenChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      this.nuevaImagenFile = input.files[0];

      // Vista previa de la imagen
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.previewImagenUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.nuevaImagenFile);
    }
  }
  eliminarImagen(): void {
    this.previewImagenUrl = null;
    this.nuevaImagenFile = undefined;

    // Si estás editando y quieres eliminar la imagen existente
    if (this.receta.imagen_url) {
      this.receta.imagen_url = null;
    }
  }
  async cargarRecetas() {
    try {
      this.cargando = true;
      this.recetas = await this.supabaseService.obtenerRecetas();

      // Convertir ingredientes de JSON string a array si es necesario
      this.recetas = this.recetas.map(receta => ({
        ...receta,
        ingredientes: typeof receta.ingredientes === 'string' ?
          JSON.parse(receta.ingredientes) :
          receta.ingredientes
      }));

      // Calcular el porcentaje de ganancia de cada receta
      this.recetas.forEach(receta => {
        if (receta.precio_preparacion && receta.precio_venta) {
          receta.porcentajeGanancia = ((receta.precio_venta - receta.precio_preparacion) / receta.precio_venta) * 100;
        } else {
          receta.porcentajeGanancia = 0; // Si no se tiene el precio de preparación o de venta
        }
      });

      this.filtrarRecetas(); // Aplicar filtro inicial
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

  confirmarEliminarReceta(receta: Receta) {
    this.recetaAEliminar = receta;
    this.mostrarConfirmacionEliminar = true;
  }

  async eliminarReceta() {
    if (!this.recetaAEliminar) return;

    try {
      this.cargando = true;

      await this.cargarRecetas(); // Recargar la lista
    } catch (error) {
      console.error('Error eliminando receta:', error);
    } finally {
      this.cargando = false;
      this.mostrarConfirmacionEliminar = false;
      this.recetaAEliminar = null;
    }
  }

  seleccionarReceta(receta: Receta) {
    this.recetaSeleccionada = { ...receta };
  }

  abrirModalEditarReceta(receta: Receta) {
    this.receta = {
      ...receta,
      ingredientes: receta.ingredientes.map(ing => ({
        ...ing
      }))
    };
    this.mostrarModalEditarReceta = true;

    // Recalcular el precio automáticamente
    this.calcularPrecioPreparacion();
    this.calcularGanancia();
  }

  eliminarIngrediente(index: number) {
    this.receta.ingredientes.splice(index, 1); // Elimina el ingrediente del array
    this.calcularPrecioPreparacion();          // Vuelve a calcular el precio
  }


  cerrarModalEditarReceta() {
    this.mostrarModalEditarReceta = false;
    this.limpiarCamposIngredientes();
  }
  async actualizarReceta() {
    if (!this.receta.nombre || this.receta.ingredientes.length === 0 || !this.receta.id) return;

    try {
      this.cargando = true;

      this.calcularPrecioPreparacion();

      // Llamas tu servicio y le pasas la receta, y la nueva imagen si hay
      await this.supabaseService.actualizarReceta(this.receta.id, this.receta, this.nuevaImagenFile);

      Swal.fire({
        icon: 'success',
        title: '¡Receta actualizada!',
        showConfirmButton: false,
        timer: 1500
      });

      await this.cargarRecetas();
      this.calcularGanancia();
      // Limpiar campos
      this.limpiarCamposIngredientes();
      this.terminoBusquedaReceta = '';
      this.cerrarModalEditarReceta();
      this.nuevaImagenFile = undefined; // Limpiar imagen seleccionada
    } catch (error) {
      console.error('Error actualizando receta:', error);
    } finally {
      this.cargando = false;
    }
  }


  // Nuevo método para limpiar campos de ingredientes
  limpiarCamposIngredientes() {
    this.buscador = ''; // Limpia el campo de búsqueda
    this.ingredienteSeleccionado = null; // Limpia la selección
    this.cantidadSeleccionada = 1; // Resetea la cantidad a 1
    this.filtrarIngredientes(); // Actualiza la lista filtrada
  }


  // Método para calcular la ganancia basada en el precio de venta
  calcularGanancia() {
    // Primero, calculamos el precio de preparación
    this.calcularPrecioPreparacion();

    // Si el precio de venta es mayor a 0, calculamos la ganancia
    if (this.receta.precio_venta && this.receta.precio_venta > 0) {
      this.receta.ganancia = this.receta.precio_venta - this.receta.precio_preparacion;

      // Calculamos el porcentaje de ganancia basado en el precio de preparación
      this.receta.porcentajeGanancia = (this.receta.ganancia / this.receta.precio_preparacion) * 100;
    } else {
      this.receta.ganancia = 0;
      this.receta.porcentajeGanancia = 0; // Si no hay precio de venta, el porcentaje de ganancia es 0
    }
  }




}