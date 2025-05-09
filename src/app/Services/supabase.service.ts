import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
interface Ingrediente {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  unidad_medida?: string;
}

export interface Receta {
  id?: string;
  nombre: string;
  ingredientes: Ingrediente[];
  precio_preparacion: number;
  created_at?: string;
  updated_at?: string;
}
export interface Pedido {
  numero_factura: string;
  fecha?: string; // Opcional, Supabase usa now() si no envías
  productos: any[]; // Mejor si defines también la estructura
  total: number;
  forma_pago?: string;
  mesa_id: number;
  mesero_nombre: string;
  estado?: string;
}
interface ProductoPedido {
  producto_id: string; // Este campo es necesario para enlazar con la receta
  nombre: string;
  precio: number;
  cantidad: number;
  notas?: string;
  
}
interface Notificacion {
  id: number;
  mensaje: string;
  fecha: string;
  // Agrega otros campos que tenga tu tabla notificaciones
}



const SUPABASE_URL = 'https://wxbtlgxzsxswwdulbukt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YnRsZ3h6c3hzd3dkdWxidWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MzM4NTQsImV4cCI6MjA2MTEwOTg1NH0.LaODzvfkY3q0KktHjTc_iqJ3kXAgazbsHBz4Grz3Fp4';


@Injectable({
  providedIn: 'root'
})

export class SupabaseService {
  
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'sb-auth-token-' + Math.random().toString(36).substring(2, 11),
      }
    });
  }

  // Función de login con reintentos
  async login(email: string, password: string, maxRetries = 3) {
    let attempts = 0;
  
    while (attempts < maxRetries) {
      try {
        const { data: authData, error } = await this.supabase.auth.signInWithPassword({
          email,
          password
        });
  
        if (error) {
          if (error.message.includes('NavigatorLockAcquireTimeout') && attempts < maxRetries - 1) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500 * attempts));
            continue;
          }
          throw error;
        }
  
        const user = authData.user;
  
        // ✅ Obtener el perfil del usuario (incluyendo el rol)
        const { data: profile, error: profileError } = await this.supabase
          .from('profiles')
          .select('nombre, rol')
          .eq('id', user.id)
          .single();
  
        if (profileError) {
          return { error: profileError.message };
        }
  
        return {
          data: {
            user,
            profile // Contiene nombre y rol
          }
        };
  
      } catch (error: any) {
        if (attempts >= maxRetries - 1 || !error.message.includes('NavigatorLockAcquireTimeout')) {
          return { error: error.message };
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500 * attempts));
      }
    }
  
    return { error: 'Maximum retry attempts reached' };
  }
  
  // Función de registro sin verificación de correo
  async register(email: string, password: string, name: string) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
  
      if (error) {
        if (error.message.includes('NavigatorLockAcquireTimeout')) {
          return { error: 'System busy. Please try again later.' };
        }
        throw error;
      }
  
      const user = data.user;
      if (user) {
        // ✅ Actualizar el user_metadata (opcional)
        const { error: updateError } = await this.supabase.auth.updateUser({
          data: {
            full_name: name,
          }
        });
        if (updateError) return { error: updateError.message };
  
        // ✅ Insertar en la tabla profiles con rol por defecto "mesero"
        const { error: profileError } = await this.supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              nombre: name,
              // rol: 'mesero' ← opcional porque ya tiene default
            }
          ]);
  
        if (profileError) {
          return { error: profileError.message };
        }
      }
  
      return { data };
    } catch (error: any) {
      return { error: error.message };
    }
  }
  
  // Obtener el usuario actual con manejo de sesión
  async getUser() {
    try {
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) return { error: 'No active session' };
  
      const { data: userData, error: userError } = await this.supabase.auth.getUser();
      if (userError) throw userError;
  
      const user = userData.user;
  
      // ✅ Traer perfil (nombre y rol)
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('nombre, rol')
        .eq('id', user.id)
        .single();
  
      if (profileError) {
        return { error: profileError.message };
      }
  
      return {
        data: {
          user,
          profile // { nombre, rol }
        }
      };
  
    } catch (error: any) {
      return { error: error.message };
    }
  }
  
  // Cerrar sesión con limpieza de almacenamiento
  async logout() {
    try {
      localStorage.removeItem('sb-auth-token');
      
      const { error } = await this.supabase.auth.signOut();
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }
 // Método para agregar un producto al inventario
  async agregarProducto(producto: any) {
  const { data, error } = await this.supabase
    .from('inventario')
    .insert(producto)
    .select();
  
  if (error) throw error;
  return data;
  }
  // Método para obtener todos los productos
  async obtenerProductos() {
    const { data, error } = await this.supabase
      .from('inventario')
      .select('*, categorias(id, nombre)')  // Trae todos los campos de 'inventario' y los campos 'id' y 'nombre' de la categoría relacionada
      .eq('eliminado', false);  // Filtra los productos donde 'eliminado' sea false
  
    if (error) {
      throw new Error(error.message);  // Lanza un error si no se puede obtener
    }
  
    return data;
  }
  //elemimar producots
  async eliminarProducto(id: number) {
    // Actualiza el campo 'eliminado' a 'true' para el producto con el ID dado
    const { error } = await this.supabase
      .from('inventario')
      .update({ eliminado: true })  // Establece 'eliminado' a true
      .eq('id', id);  // Aplica la actualización donde el ID coincida
  
    if (error) {
      throw new Error(error.message);  // Lanza un error si falla
    }
  
    return true;  // Retorna true si todo salió bien
  }
  //editar productos
  async editarProducto(id: number, nuevosDatos: any) {
  const { data, error } = await this.supabase
    .from('inventario')
    .update(nuevosDatos) // Datos que quieres actualizar
    .eq('id', id);       // Donde el ID coincida

  if (error) {
    throw new Error(error.message);  // Lanza error si falla
  }

  return data;  // Retorna los datos actualizados
  }
  //meatodo para agregar categorias  
  async agregarCategoria(categoria: any) {
    const { data, error } = await this.supabase
      .from('categorias')
      .insert([
        {
          nombre: categoria.nombre,
          descripcion: categoria.descripcion,
          activa: categoria.activa ?? true
        }
      ]);
  
    if (error) throw new Error(error.message);
    return data;
  }
  // Obtener categorías activas
  async obtenerCategorias() {
    const { data, error } = await this.supabase
      .from('categorias')
      .select('id, nombre, descripcion')
      .eq('activa', true)
      .order('nombre', { ascending: true });
  
    if (error) throw new Error(error.message);
    return data || [];
  }
  // Método para actualizar una categoría
  async editarCategoria(id: number, categoria: { nombre: string, descripcion: string }) {
  const { data, error } = await this.supabase
    .from('categorias')
    .update({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  return data;
  }
 // Agregar una receta
  async agregarReceta(receta: any, imagenFile?: File) {
  let imagenUrl = null;

  // Si hay una imagen, subirla al bucket
  if (imagenFile) {
    const nombreArchivo = `${Date.now()}-${imagenFile.name}`;
    const { data: uploadData, error: uploadError } = await this.supabase
      .storage
      .from('recetas-images')
      .upload(nombreArchivo, imagenFile);

    if (uploadError) {
      throw new Error('Error al subir la imagen: ' + uploadError.message);
    }

    // Obtener URL pública de la imagen
    const { data: urlData } = this.supabase
      .storage
      .from('recetas-images')
      .getPublicUrl(nombreArchivo);

    imagenUrl = urlData.publicUrl;
  }

  // Aquí añadimos precio_venta y ganancia a los datos de la receta.
  const recetaConPrecioYGanancia = {
    ...receta,
    imagen_url: imagenUrl,
    precio_venta: receta.precio_venta,  // Asegúrate de que precio_venta esté en el objeto receta
    ganancia: receta.ganancia,          // Asegúrate de que ganancia esté en el objeto receta
  };

  // Insertar la receta con la URL de la imagen, precio_venta y ganancia
  const { data, error } = await this.supabase
    .from('recetas')
    .insert([recetaConPrecioYGanancia]);

  if (error) {
    throw new Error(error.message);
  }

  return data;
  }
 // OBTENER TODAS LAS RECETAS
  async obtenerRecetas(): Promise<Receta[]> {
  const { data, error } = await this.supabase
    .from('recetas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error obteniendo recetas:', error);
    throw error;
  }

  // Parsear ingredientes si vienen como string JSON
  return data.map(receta => ({
    ...receta,
    ingredientes: typeof receta.ingredientes === 'string' ? 
                 JSON.parse(receta.ingredientes) : 
                 receta.ingredientes
  }));
  }
  //metodo actualizar receta
  async actualizarReceta(id: string, receta: any, imagenFile?: File): Promise<any> {
    let imagenUrl = receta.imagen_url;
  
    // Subir nueva imagen si se proporciona
    if (imagenFile) {
      if (imagenUrl) {
        await this.eliminarImagen(imagenUrl);
      }
  
      const { url, error } = await this.subirImagen(imagenFile);
      if (error) {
        console.error('Error al subir imagen:', error.message);
        throw new Error('Error subiendo imagen');
      }
      imagenUrl = url;
    }
  
    // Crear objeto con solo los campos actualizables
    const recetaActualizada = {
      nombre: receta.nombre,
      descripcion: receta.descripcion,
      ingredientes: receta.ingredientes, // Asegúrate que el tipo coincide con el de la DB (array o JSON)
      precio_preparacion: receta.precio_preparacion,
      precio_venta: receta.precio_venta,
      ganancia: receta.ganancia,
      imagen_url: imagenUrl,
      updated_at: new Date().toISOString()
    };
  
  
    const { data, error } = await this.supabase
      .from('recetas')
      .update(recetaActualizada)
      .eq('id', id)
      .select();
  
    if (error) {
      console.error('Error de Supabase al actualizar receta:', error.message);
      throw new Error('Error actualizando receta');
    }
  
    return {
      ...data[0],
      ingredientes: receta.ingredientes
    };
  }
  
  // Métodos auxiliares para manejo de imágenes
  private async subirImagen(file: File): Promise<{url: string | null, error: any}> {
    const fileName = `${Date.now()}-${file.name}`;
    
    // 1. Subir archivo
    const { error: uploadError } = await this.supabase
      .storage
      .from('recetas-images')
      .upload(fileName, file);

    if (uploadError) return { url: null, error: uploadError };

    // 2. Obtener URL pública
    const { data: { publicUrl } } = this.supabase
      .storage
      .from('recetas-images')
      .getPublicUrl(fileName);

    return { url: publicUrl, error: null };
  }
  // metodo elmimar imagen
  private async eliminarImagen(url: string): Promise<void> {
  const fileName = url.split('/').pop();
  if (!fileName) return;

  const { error } = await this.supabase
    .storage
    .from('recetas-images')
    .remove([fileName]);

  if (error) console.error('Error eliminando imagen:', error);
  }
  // ELIMINAR RECETA
  async eliminarReceta(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('recetas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error eliminando receta con ID ${id}:`, error);
      throw error;
    }
  }
   // Método para obtener todas las facturas
   async getFacturas() {
    const { data, error } = await this.supabase
      .from('pedidos')
      .select('*');
    
    if (error) {
      console.error('Error al obtener facturas:', error);
      return [];
    }
    return data;
  }
  async getFacturasDelDia() {
    const hoy = new Date(); 
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));  // Establece las 00:00:00
    const finDia = new Date(hoy.setHours(23, 59, 59, 999)); // Establece las 23:59:59

    const { data, error } = await this.supabase
      .from('pedidos')
      .select('*')
      .gte('fecha', inicioDia.toISOString())  // Mayor o igual a la medianoche
      .lte('fecha', finDia.toISOString());    // Menor o igual a las 23:59:59

    if (error || !data) {
      console.error('Error al obtener pedidos del día:', error);
      return [];
    }

    return data;
}

  
  // Método para crear una pedido
  async crearPedido(pedido: Pedido) {
    
    // Asegurar que productos sea un JSON válido
    const pedidoParaInsertar = {
      ...pedido,
      productos: pedido.productos // Esto ya debería ser un array serializable
    };
  
    const { data, error } = await this.supabase
      .from('pedidos')
      .insert([pedidoParaInsertar])
      .select(); // Añadir .select() para obtener el registro insertado
  
    if (error) {
      console.error('Error al crear factura:', error);
      throw error; // Lanzar el error para manejarlo en realizarPedido
    }
  
    return data?.[0]; // Devolver el primer elemento del array
  }

  // Método para crear una factura
  async crearFactura(factura: {
    pedido_id: string;
    numero_factura: string;
    forma_pago: string;
    monto: number;
    productos?: any[];
    es_extra?: boolean;
    codigo_transferencia?: string; // <-- Agregado aquí
  }) {
    const { data, error } = await this.supabase
      .from('facturas')
      .insert([{
        pedido_id: factura.pedido_id,
        numero_factura: factura.numero_factura,
        forma_pago: factura.forma_pago,
        monto: factura.monto,
        productos: factura.productos ?? null,
        fecha: new Date().toISOString(),
        es_extra: factura.es_extra ?? false,
        codigo_transferencia: factura.codigo_transferencia ?? null // <-- Se guarda solo si existe
      }])
      .select();
  
    if (error) {
      console.error('Error al crear factura:', error);
      throw error;
    }
  
    return data[0];
  }
  

  // Método para actualizar un pedido
  async actualizarPedido(id: string, numeroFactura: string, estado: string) {
    const { data, error } = await this.supabase
      .from('pedidos')
      .update({ 
        numero_factura: numeroFactura, 
        estado 
      })
      .eq('id', id);
  
    if (error) {
      console.error('Error al actualizar pedido:', error);
      throw error;
    }
  
    return data;
  }
  

 // Función para escuchar los cambios en la tabla `notificaciones`

 
 async fetchLastNotification() {
  // Consulta la última notificación insertada
  const { data, error } = await this.supabase
    .from('notificaciones')
    .select('mensaje')  // Seleccionamos el campo 'mensaje' de la notificación
    .order('id', { ascending: false }) // Ordenamos por ID (debe ser autoincremental o similar)
    .limit(1) // Traemos solo la última notificación
    .single();  // Como solo esperamos una notificación, usamos .single()

  if (error) {
    console.error('Error al obtener la última notificación:', error);
    return null;  // Si hay error, retornamos null
  }

  return data;  // Retornamos los datos de la última notificación
}
// Dentro de tu SupabaseService actual
private notificationChannel: any;

// Escucha notificaciones en tiempo real y envía a Telegram
// Luego modifica tu función así:
listenNotifications(callback: (notificacion: Notificacion) => void) {
  if (this.notificationChannel) {
    this.supabase.removeChannel(this.notificationChannel);
  }

  this.notificationChannel = this.supabase
    .channel('notificaciones-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
      },
      async (payload) => {
        const nuevaNotificacion = payload.new as Notificacion;
        
        // 1. Ejecuta el callback
        callback(nuevaNotificacion);
        
       // 2. Envía a múltiples usuarios de Telegram
if (nuevaNotificacion['mensaje']) {
  try {
    const mensaje = `🚨 ALERTA 🚨\n${nuevaNotificacion['mensaje']}\n\nFecha: ${new Date(nuevaNotificacion['fecha']).toLocaleString()}`;
    const mensajeCodificado = encodeURIComponent(mensaje);

    const chatIds = [
      '1977431625', // Ruben
      '5941338034', // Santiago
    ];

    for (const chatId of chatIds) {
      const telegramUrl = `https://api.telegram.org/bot7752238645:AAFbz7UPuDnkxFCTYvFyIRhMuVmsP2b17Lc/sendMessage?chat_id=${chatId}&text=${mensajeCodificado}`;
      const response = await fetch(telegramUrl);
      const result = await response.json();
    }
  } catch (error) {
    console.error('❌ Error al enviar a uno o más chats de Telegram:', error);
  }

        }
      }
    )
    .subscribe();
}

// Limpieza al destruir el servicio
ngOnDestroy() {
  if (this.notificationChannel) {
    this.supabase.removeChannel(this.notificationChannel);
  }
}



}