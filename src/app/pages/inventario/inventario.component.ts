import { Component } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inventario',
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css'
})
export default class InventarioRegistroComponent {
  // inventory-dashboard.component.ts

  products: any[] = [];
  filteredProducts: any[] = [];
  searchTerm: string = '';
  selectedCategory: string = '';
  categories: string[] = [];
  nombre = '';
  descripcion = '';
  error = '';
  isLoading = false;
  mostrarModalCategorias = false;
  mostrarModalAgregarCategoria = false;

  nuevaCategoria = { nombre: '', descripcion: '' };
  errorCategoria = '';
  categorias: any[] = [];
  categoria_id: string = '';
  mostrarModalEditar = false;
  productoEditando: any = {};

  stockAAgregar: number = 0;
  columns = [
    { key: 'nombre', label: 'Producto' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'stock', label: 'Stock' },
    { key: 'precio', label: 'Precio' },
    { key: 'estado', label: 'Estado' }
  ];

  // Paginación
  currentPage = 1;
  itemsPerPage = 5;
  unidad = '';
  categoria = '';
  stock_actual = 0;
  stock_minimo = 5; // valor predeterminado
  costo_unitario = 0;
  activo = true;
  mostrarModalRegistroProducto: boolean = false;
  mostrarModalEditarCategoria: boolean = false;
  categoriaEditando: any = {};
  pesoTotal: number = 0;          // libras o kilogramos
  gramosPorUnidad: number = 0;
  costoTotal: number = 0;
  costo_total: number = 0;
  stockTotal = 0;
  sobranteGramos: number = 0;  // <-- Ahora es modificable

  litrosTotales: number = 0;
  mililitrosPorUnidad: number = 0;
  nuevoStock = 0;
  constructor(private supabaseService: SupabaseService) { }

  async ngOnInit() {
    await this.loadProducts();
    try {
      const categorias = await this.supabaseService.obtenerCategorias();
      this.categorias = categorias;

    } catch (e) {
      console.error(e);
    }
  }
  cerrarModalCategorias() {
    this.mostrarModalCategorias = false;
  }

  abrirModalAgregarCategoria() {
    this.mostrarModalAgregarCategoria = true;
  }

  cerrarModalAgregarCategoria() {
    this.mostrarModalAgregarCategoria = false;
    this.nuevaCategoria = { nombre: '', descripcion: '' };
    this.errorCategoria = '';
  }
  async loadCategorias() {
    try {
      const categorias = await this.supabaseService.obtenerCategorias();
      this.categorias = categorias; // Asignar las categorías obtenidas al array de categorías en tu componente
    } catch (error) {
      console.error('Error al cargar las categorías:', error);
    }
  }


  async guardarCategoria() {
    if (!this.nuevaCategoria.nombre.trim()) {
      this.errorCategoria = 'El nombre es obligatorio.';
      return;
    }

    try {
      await this.supabaseService.agregarCategoria(this.nuevaCategoria);
      this.categorias = await this.supabaseService.obtenerCategorias();
      this.cerrarModalAgregarCategoria();

      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: '¡Categoría agregada!',
        text: `La categoría se agregó correctamente.`,
        confirmButtonColor: '#000', // Negro para coincidir con tu paleta
      });
    } catch (error: any) {
      this.errorCategoria = error.message;
    }
  }
  get categoriasPaginadas() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.categorias.slice(start, end);
  }
  paginatedProducts() {
    const sortedProducts = [...this.filteredProducts].sort((a, b) => {
      return (a.activo === b.activo) ? 0 : a.activo ? 1 : -1;
    });

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return sortedProducts.slice(start, end);
  }


  totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }


  cambiarPagina(delta: number) {
    const nueva = this.currentPage + delta;
    if (nueva >= 1 && nueva <= this.totalPages()) {
      this.currentPage = nueva;
    }
  }
  async loadProducts() {
    try {
      const products = await this.supabaseService.obtenerProductos();

      // Filtrar productos que NO estén eliminados (eliminado !== true)
      const productosNoEliminados = (products || []).filter(p => !p.eliminado);

      this.products = productosNoEliminados;
      console.log(this.products);

      // Copia para filtros o búsquedas
      this.filteredProducts = [...this.products];

      // Categorías únicas de productos no eliminados
      this.categories = [...new Set(this.products.map(p => p.categorias?.nombre))];

    } catch (error) {
      console.error('Error loading products:', error);
    }
  }



  applyFilter() {
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch =
        product.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        product.categorias?.nombre.toLowerCase().includes(this.searchTerm.toLowerCase());  // <- aquí

      const matchesCategory = !this.selectedCategory ||
        product.categorias?.nombre === this.selectedCategory;  // <- y aquí

      return matchesSearch && matchesCategory;
    });
  }


  abrirModalEditar(producto: any) {
    this.productoEditando = { ...producto };
    this.productoEditando.stock_base = producto.stock_actual; // Stock original
    this.stockAAgregar = 0;
    this.mostrarModalEditar = true;
  }

  cerrarModalEditar() {
    this.mostrarModalEditar = false;
  }
  //editar productos
  async guardarCambiosProducto() {
    try {
      await this.supabaseService.editarProducto(this.productoEditando.id, {
        nombre: this.productoEditando.nombre,
        stock_actual: this.productoEditando.stock_actual,
      });

      await Swal.fire({
        icon: 'success',
        title: '¡Producto actualizado!',
        confirmButtonColor: '#facc15',
      });

      this.cerrarModalEditar();
      this.loadProducts(); // Vuelve a cargar la lista
    } catch (error) {
      console.error('Error actualizando producto:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el producto.',
        confirmButtonColor: '#facc15',
      });
    }
  }
  //metodo elimar porductos
  async confirmarEliminar(id: number) {
    // Muestra una alerta de confirmación
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¡Esta acción no se puede deshacer!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f87171',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    // Si el usuario confirma la eliminación
    if (result.isConfirmed) {
      // Llama al servicio para actualizar el campo 'eliminado' a true
      await this.supabaseService.eliminarProducto(id);

      // Muestra una alerta de éxito
      await Swal.fire({
        icon: 'success',
        title: '¡Producto Eliminado!',
        confirmButtonColor: '#facc15',
      });

      // Recarga la lista de productos
      this.loadProducts(); // Actualiza lista
    }
  }


  // Métodos para paginación
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage * this.itemsPerPage < this.products.length) {
      this.currentPage++;
    }
  }
  async registrarCategoria() {
    if (!this.nombre) {
      this.error = 'El nombre es obligatorio';
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      await this.supabaseService.agregarCategoria({
        nombre: this.nombre,
        descripcion: this.descripcion
      });
      alert('Categoría registrada');
      this.nombre = '';
      this.descripcion = '';
    } catch (error: any) {
      this.error = error.message;
    } finally {
      this.isLoading = false;
    }
  }

  // Función para abrir el modal de edición
  abrirModalEditarCategoria(categoria: any) {
    this.categoriaEditando = { ...categoria };  // Copia la categoría para editarla
    this.mostrarModalEditarCategoria = true;  // Abre el modal
  }

  // Función para cerrar el modal de edición
  cerrarModalEditarCategoria() {
    this.mostrarModalEditarCategoria = false;  // Cierra el modal
  }

  // Función para guardar la categoría editada

  async guardarEdicionCategoria() {
    try {
      // Llamamos al servicio para editar la categoría
      await this.supabaseService.editarCategoria(this.categoriaEditando.id, {
        nombre: this.categoriaEditando.nombre,
        descripcion: this.categoriaEditando.descripcion
      });

      // Mostrar mensaje de éxito
      await Swal.fire({
        icon: 'success',
        title: '¡Categoría actualizada!',
        confirmButtonColor: '#facc15',
      });

      // Cerrar el modal de edición
      this.cerrarModalEditarCategoria();

      // Recargar las categorías para reflejar los cambios
      this.loadCategorias(); // Suponiendo que tienes una función loadCategorias para recargar las categorías

    } catch (error) {
      // Si ocurre un error, mostrar mensaje de error
      console.error('Error actualizando categoría:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar la categoría.',
        confirmButtonColor: '#facc15',
      });
    }
  }
  // Método para abrir el modal
  abrirModalRegistroProducto() {
    this.mostrarModalRegistroProducto = true;
  }

  // Método para cerrar el modal
  cerrarModalRegistroProducto() {
    this.mostrarModalRegistroProducto = false;
    this.limpiarFormulario();
  }
  // Método para registrar un producto
  async registrarProducto() {
    if (!this.nombre || !this.unidad || !this.categoria_id || this.stock_actual <= 0 || this.costo_unitario <= 0) {
      this.error = 'Por favor, completa todos los campos correctamente.';
      return;
    }

    this.isLoading = true;
    this.error = ''; // Limpiar errores anteriores

    const producto = {
      nombre: this.nombre,
      unidad: this.unidad,
      categoria_id: this.categoria_id,
      stock_actual: this.stock_actual,
      stock_minimo: this.stock_minimo,
      costo_unitario: this.costo_unitario,
      activo: this.activo
    };

    // Mostrar en consola lo que se va a enviar

    try {
      await this.supabaseService.agregarProducto(producto);

      // Usar SweetAlert2 para el mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: '¡Producto registrado con éxito!',
        text: 'El producto se ha registrado correctamente.',
        confirmButtonText: 'Aceptar'
      }).then(() => {
        // Cerrar el modal y cargar los productos después de que el usuario haga clic en "Aceptar"
        this.cerrarModalRegistroProducto();
        this.loadProducts();  // Llamar a loadProducts para traer los productos
      });

      this.limpiarFormulario();
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.error = error.message;
      } else {
        this.error = 'Ocurrió un error inesperado';
      }
    } finally {
      this.isLoading = false;
    }
  }

  // Limpiar formulario después de registrar el producto
  limpiarFormulario() {
    this.nombre = '';
    this.unidad = '';
    this.categoria = '';
    this.stock_actual = 0;
    this.stock_minimo = 5;
    this.costo_unitario = 0;
    this.activo = true;
    this.costo_total = 0;
  }

  calcularCostoUnitario() {
    // Reiniciamos valores comunes
    this.costo_unitario = 0;
    this.sobranteGramos = 0;

    if (this.unidad === 'kg' || this.unidad === 'lb') {
      // Reiniciar stock solo si es por peso
      this.stock_actual = 0;

      // Conversión a gramos
      const gramosPorKg = 1000;
      const gramosPorLb = 453.592;
      const pesoEnGramos = this.unidad === 'kg'
        ? this.pesoTotal * gramosPorKg
        : this.pesoTotal * gramosPorLb;

      // Calcular cortes
      if (this.gramosPorUnidad > 0) {
        this.stock_actual = Math.floor(pesoEnGramos / this.gramosPorUnidad);
        this.sobranteGramos = pesoEnGramos % this.gramosPorUnidad;
      }

      // Calcular costo unitario
      if (this.stock_actual > 0 && this.costo_total > 0) {
        this.costo_unitario = Number((this.costo_total / this.stock_actual).toFixed(2));
      }

    } else if (this.unidad === 'cantidad') {
      // Solo calcula si ya hay un stock ingresado manualmente
      if (this.stock_actual > 0 && this.costo_total > 0) {
        this.costo_unitario = Number((this.costo_total / this.stock_actual).toFixed(2));
      }

    } else if (this.unidad === 'l') {
      // Conversión litros a mililitros
      const totalMililitros = this.litrosTotales * 1000;

      // Validar ml por unidad
      if (this.mililitrosPorUnidad > 0) {
        this.stock_actual = Math.floor(totalMililitros / this.mililitrosPorUnidad);
      }

      // Calcular costo unitario
      if (this.stock_actual > 0 && this.costo_total > 0) {
        this.costo_unitario = Number((this.costo_total / this.stock_actual).toFixed(2));
      }
    }
  }
  calcularCostoUnitarioEditar() {
    const unidad = this.productoEditando.unidad;

    const costo_total = +this.productoEditando.costo_total || 0;
    const stockBase = +this.productoEditando.stock_base || 0;
    const gramosPorUnidad = +this.productoEditando.gramosPorUnidad || 0;
    const pesoTotal = +this.productoEditando.pesoTotal || 0;
    const litrosTotales = +this.productoEditando.litrosTotales || 0;
    const mililitrosPorUnidad = +this.productoEditando.mililitrosPorUnidad || 0;

    let sobranteGramos = 0;
    let nuevoStock = 0;

    if (unidad === 'kg' || unidad === 'lb') {
      const gramosPorKg = 1000;
      const gramosPorLb = 453.592;
      const pesoEnGramos = unidad === 'kg'
        ? pesoTotal * gramosPorKg
        : pesoTotal * gramosPorLb;

      if (gramosPorUnidad > 0) {
        nuevoStock = Math.floor(pesoEnGramos / gramosPorUnidad);
        sobranteGramos = pesoEnGramos % gramosPorUnidad;
      }

      this.productoEditando.sobranteGramos = sobranteGramos;

    } else if (unidad === 'cantidad') {
      nuevoStock = 0; // o el cálculo automático que tengas para cantidad
    } else if (unidad === 'l') {
      const totalMililitros = litrosTotales * 1000;

      if (mililitrosPorUnidad > 0) {
        nuevoStock = Math.floor(totalMililitros / mililitrosPorUnidad);
      }
    }

    // Guardar nuevo stock calculado automático
    this.nuevoStock = nuevoStock;

    // Sumar el viejo + nuevo stock para mostrar el total (separado)
    this.stockTotal = stockBase + nuevoStock;

    // Guardar stock total para mostrar
    this.productoEditando.stock_actual = this.stockTotal;

    // Calcular costo unitario SOLO con el stock nuevo calculado (NO sumes el viejo)
    if (nuevoStock > 0 && costo_total > 0) {
      this.productoEditando.costo_unitario = +(costo_total / nuevoStock).toFixed(2);
    } else {
      this.productoEditando.costo_unitario = 0;
    }
  }






}