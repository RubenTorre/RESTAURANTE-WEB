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
private usuarioActual: any = null;
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'sb-auth-token-' + Math.random().toString(36).substring(2, 11),
      }
    });
    
  // Inicializa el usuario desde la sesión actual
  this.supabase.auth.getSession().then(({ data }) => {
    this.usuarioActual = data?.session?.user ?? null;
  });

  // Escucha futuros cambios de sesión
  this.supabase.auth.onAuthStateChange((_event, session) => {
    this.usuarioActual = session?.user ?? null;
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
  
        // ✅ Obtener el perfil incluyendo 'activo'
        const { data: profile, error: profileError } = await this.supabase
          .from('profiles')
          .select('nombre, rol, activo')
          .eq('id', user.id)
          .single();
  
        if (profileError) {
          return { error: profileError.message };
        }
  
        // ❌ Verificar si el perfil está inactivo
        if (!profile.activo) {
          // Cerrar sesión si el usuario está inactivo
          await this.supabase.auth.signOut();
          return { error: 'Tu cuenta aún no ha sido activada por un administrador.' };
        }
  
        // ✅ Todo bien
        return {
          data: {
            user,
            profile,
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
  
    return { error: 'Se alcanzó el número máximo de intentos.' };
  }
  
  
  // Función de registro sin verificación de correo
  async register(email: string, password: string, name: string, activo: boolean = false) {
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
        const { error: updateError } = await this.supabase.auth.updateUser({
          data: {
            full_name: name,
          }
        });
        if (updateError) return { error: updateError.message };
  
        const { error: profileError } = await this.supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              nombre: name,
              activo,  // 👈 aquí es dinámico
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
  
 async getUsuarioActualConPerfil() {
  try {
    // Obtener usuario actual con getUser()
    const { data: { user }, error: userError } = await this.supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) return { error: 'No hay usuario logueado' };

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('nombre, rol')
      .eq('id', user.id)
      .single();

    if (profileError) return { error: profileError.message };

    return { data: { user, profile } };

  } catch (error: any) {
    return { error: error.message };
  }
}


 async getUser() {
  try {
    // Obtiene la sesión actual (si existe)
    const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
    if (sessionError) throw sessionError;

    // Si no hay sesión, devuelve error
    if (!session) return { error: 'No active session' };

    const user = session.user;

    // Obtener perfil con nombre y rol
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
     fecha: string;
  }) {
    const { data, error } = await this.supabase
      .from('facturas')
      .insert([{
        pedido_id: factura.pedido_id,
        numero_factura: factura.numero_factura,
        forma_pago: factura.forma_pago,
        monto: factura.monto,
        productos: factura.productos ?? null,
        fecha: factura.fecha,
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
 // Método para obtener los usuarios de la tabla personalizada (que creaste)
 async obtenerUsuarios() {
  const { data, error } = await this.supabase
    .from('profiles')  // Aquí está el nombre de tu tabla personalizada
    .select('*');  // Selecciona todos los campos de la tabla

  if (error) {
    console.error('Error al obtener los usuarios:', error);
    return [];
  }
  return data;  // Devuelve los usuarios obtenidos
}
async obtenerUsuariosConEmail() {
  const { data, error } = await this.supabase.rpc('get_users_with_email');
  if (error) {
    console.error('Error al obtener usuarios:', error);
    return [];
  }
  return data;
}
async actualizarUsuario(id: string, datos: { nombre: string; rol: string }) {
  const { error } = await this.supabase
    .from('profiles')
    .update(datos)
    .eq('id', id);

  if (error) {
    console.error('Error al actualizar usuario:', error);
    throw error;
  }

  return true;
}
async desactivarUsuarioPorId(id: string) {
  const { error } = await this.supabase
    .from('profiles')  // Asegúrate de que 'profiles' es el nombre correcto de la tabla
    .update({ activo: false })  // Cambia el estado a false
    .eq('id', id);  // Filtra por el id del usuario

  if (error) throw new Error(error.message);  // Si hay error, lanza la excepción
}
async actualizarEstadoUsuario(id: string, activo: boolean) {
  return await this.supabase
    .from('profiles')
    .update({ activo })
    .eq('id', id);
}
async getUsuarioActual() {
  const { data, error } = await this.supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
// En SupabaseService
async waitForSessionRestoration(): Promise<boolean> {
  // Si ya hay usuario en memoria, no esperamos
  if (this.usuarioActual) return true;

  // Esperamos a que Supabase emita el evento INITIAL_SESSION
  return new Promise((resolve) => {
    const sub = this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        this.usuarioActual = session?.user ?? null;
        sub.data.subscription.unsubscribe(); // Limpiamos la suscripción
        resolve(!!session); // Resuelve `true` si hay sesión, `false` si no
      }
    });
  });
}
getUsuarioActualDesdeMemoria() {
  if (!this.usuarioActual) throw new Error('No hay sesión activa');
  return this.usuarioActual;
}
// Espera hasta que Supabase haya restaurado la sesión del usuario
async esperarSesionRestaurada(): Promise<void> {
  return new Promise((resolve) => {
    const sub = this.supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        this.usuarioActual = session.user;
        sub.data.subscription.unsubscribe(); // nos desuscribimos después de obtener la sesión
        resolve();
      }
    });

    // Por si ya estaba restaurada
    this.supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        this.usuarioActual = data.session.user;
        sub.data.subscription.unsubscribe();
        resolve();
      }
    });
  });
}

async obtenerPerfilDeUsuario(id: string) {
  const { data, error } = await this.supabase
    .from('profiles')
    .select('nombre, rol, activo')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error al obtener perfil:', error);
    return null;
  }
  return data;
}

async cambiarContraseña(nuevaContraseña: string) {
  const { data, error } = await this.supabase.auth.updateUser({
    password: nuevaContraseña
  });

  if (error) {
    console.error('Error al cambiar la contraseña:', error);
    return { error: error.message };
  }

  return { user: data };  // 'data' contiene el usuario actualizado
}
// Servicio para cambiar el correo electrónico
async cambiarCorreo(nuevoCorreo: string) {
  const { data, error } = await this.supabase.auth.updateUser({
    email: nuevoCorreo,
  });

  if (error) {
    return { message: error.message || 'Hubo un error al cambiar el correo.' };
  }

  // Este mensaje puede ser el que Supabase devuelve al cambiar el correo
  return { message: 'Correo electrónico actualizado correctamente. Verifica tu nuevo correo.' };
}
// Método para actualizar el nombre del perfil
async actualizarPerfil(id: string, datos: { nombre: string;}) {
  const { error } = await this.supabase
    .from('profiles')
    .update(datos)
    .eq('id', id);

  if (error) {
    console.error('Error al actualizar usuario:', error);
    throw error;
  }

  return true;
}
async registrarGasto(gasto: any) {
  try {
    const { categoria, descripcion, monto, fecha, proveedor, metodo_pago, factura, comentarios } = gasto;

    // Inserta el gasto en la tabla "gastos"
    const { data, error } = await this.supabase
      .from('gastos')
      .insert([
        {
          categoria,
          descripcion,
          monto,
          fecha,
          proveedor,
          metodo_pago,
          factura,
          comentarios
        }
      ]);

    if (error) {
      if (error.message.includes('timeout')) {
        return { error: 'Error de sistema. Intenta nuevamente más tarde.' };
      }
      throw error;
    }

    // Devuelve el resultado exitoso
    return { data };
  } catch (error: any) {
    console.error("Error al registrar el gasto:", error);
    return { error: error.message };
  }
}
  // Función para obtener todos los gastos
  async obtenerGastos() {
    try {
      // Consultamos todos los registros de la tabla "gastos"
      const { data, error } = await this.supabase
        .from('gastos')
        .select('*')
        .order('fecha', { ascending: false });  // Ordenar por fecha (más reciente primero)

      if (error) {
        throw error;
      }

      return { data };
    } catch (error: any) {
      console.error('Error al obtener los gastos:', error);
      return { error: error.message };
    }
  }
   // Actualizar un gasto
 async actualizarGasto(gasto: any) {
  try {
    const camposActualizados: any = {};

    // Verificar qué campos han sido modificados
    if (gasto.categoria) camposActualizados.categoria = gasto.categoria;
    if (gasto.descripcion) camposActualizados.descripcion = gasto.descripcion;
    if (gasto.monto) camposActualizados.monto = gasto.monto;
    if (gasto.fecha) camposActualizados.fecha = gasto.fecha;
    if (gasto.proveedor) camposActualizados.proveedor = gasto.proveedor;
    if (gasto.metodo_pago) camposActualizados.metodo_pago = gasto.metodo_pago;
    if (gasto.factura) camposActualizados.factura = gasto.factura;
    if (gasto.comentarios) camposActualizados.comentarios = gasto.comentarios;

    // Si no se modificaron campos, retornar un mensaje de error
    if (Object.keys(camposActualizados).length === 0) {
      throw new Error("No se han realizado cambios en el gasto.");
    }

    // Actualizar solo los campos modificados
    const { data, error } = await this.supabase
      .from('gastos')
      .update(camposActualizados)
      .eq('id', gasto.id); // Asegurarse de que se está actualizando el gasto correcto

    if (error) {
      throw new Error(error.message);
    }

    return data; // Retorna los datos si todo salió bien
  } catch (error: unknown) {
    // Aquí aseguramos que error es una instancia de Error
    if (error instanceof Error) {
      console.error('Error al actualizar gasto:', error.message);
      return { error: error.message }; // Retornar un objeto con el mensaje del error
    }
    
    console.error('Error desconocido:', error);
    return { error: 'Hubo un problema al actualizar el gasto, por favor intenta nuevamente.' }; // Mensaje genérico si error no es una instancia de Error
  }
}

async eliminarGasto(id: number): Promise<boolean> {
  try {

    const { error } = await this.supabase
      .from('gastos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return true; // ✅ Muy importante
  } catch (error: unknown) {
    console.error('Error al eliminar gasto:', (error as Error).message);
    return false;
  }
}
async crearCliente(nombre: string, telefono?: string, direccion?: string) {
  const { data, error } = await this.supabase
    .from('clientes')
    .insert([{ nombre, telefono, direccion }])
    .select()
    .single();

  if (error) throw error;
  return data;  // retorna el cliente creado como objeto
}

async obtenerClientes() {
  const { data, error } = await this.supabase
    .from('clientes')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) throw error;
  return data;
}
async crearClienteConPrecios(
  nombre: string,
  telefono: string | undefined,
  direccion: string | undefined,
  precios: { almuerzo_id: string; precio: number }[]
) {
  // 1. Crear el cliente
  const { data: clienteData, error: clienteError } = await this.supabase
    .from('clientes')
    .insert([{ nombre, telefono, direccion }])
    .select()
    .single(); // para obtener un solo registro directamente

  if (clienteError) throw clienteError;

  const cliente_id = clienteData.id;

  // 2. Insertar los precios para ese cliente
  const preciosInsert = precios.map(({ almuerzo_id, precio }) => ({
    cliente_id,
    almuerzo_id,
    precio,
  }));

  const { data: preciosData, error: preciosError } = await this.supabase
    .from('precios_cliente')
    .insert(preciosInsert);

  if (preciosError) throw preciosError;

  return {
    cliente: clienteData,
    precios: preciosData,
  };
}

//crearpedido almuerzo
async crearPedidoAlmuerzos(pedido: {
  cliente_id?: string | null;
  fecha: string;
  estado_pago?: 'pagado' | 'pendiente';
  total?: number;
  observaciones?: string | null;
  almuerzos: { almuerzo_id: string; cantidad: number }[];
}) {
  if (!pedido.fecha) throw new Error('La fecha es requerida');
  if (!pedido.almuerzos || pedido.almuerzos.length === 0)
    throw new Error('Debe seleccionar al menos un almuerzo');

  // Paso 1: Insertar en 'pedidosalmuerzos'
  const pedidoCompleto = {
    cliente_id: pedido.cliente_id || null,
    fecha: pedido.fecha,
    estado_pago: pedido.estado_pago || 'pendiente',
    total: pedido.total || 0,
    observaciones: pedido.observaciones || null
  };

  const { data: pedidoInsertado, error: errorPedido } = await this.supabase
    .from('pedidosalmuerzos') // Esta es tu tabla real
    .insert([pedidoCompleto])
    .select()
    .single(); // 👈 Esto es importante para obtener el ID

  if (errorPedido) {
    console.error('Error creando pedido:', errorPedido);
    throw new Error(errorPedido.message || 'Error al crear pedido');
  }

  // Asegúrate de que el ID esté presente
  if (!pedidoInsertado?.id) {
    throw new Error('No se pudo obtener el ID del pedido creado');
  }

  // Paso 2: Insertar en 'pedidos_almuerzo' usando el ID real
  const detalles = pedido.almuerzos.map(a => ({
    pedido_id: pedidoInsertado.id,
    almuerzo_id: a.almuerzo_id,
    cantidad: a.cantidad
  }));

  const { error: errorDetalle } = await this.supabase
    .from('pedidos_almuerzo')
    .insert(detalles);

  if (errorDetalle) {
    console.error('Error en detalles:', errorDetalle);
    throw new Error('Error al registrar almuerzos en el pedido');
  }

  return pedidoInsertado;
}


async obtenerTiposDeAlmuerzo() {
  const { data, error } = await this.supabase
    .from('almuerzos')
    .select('id, nombre, descripcion');

  if (error) {
    console.error('Error al obtener almuerzos:', error);
    throw new Error('No se pudieron obtener los tipos de almuerzo');
  }

  return data;
}
async obtenerClienteConPrecios(cliente_id: string) {
  const { data, error } = await this.supabase
    .from('precios_cliente')
    .select(`
      precio,
      almuerzos (
        id,
        nombre
      ),
      clientes (
        id,
        nombre,
        telefono,
        direccion
      )
    `)
    .eq('cliente_id', cliente_id);

  if (error) throw error;

  return data;
}
async obtenerClientesConPrecios(): Promise<any[]> {
  const { data, error } = await this.supabase
    .from('precios_cliente')
    .select(`
      precio,
      almuerzos (
        id,
        nombre
      ),
      clientes (
        id,
        nombre,
        telefono,
        direccion,
        activo,
        creado_en
      )
    `);

  if (error) {
    throw error;
  }

  return data;
}
async obtenerPedidosConDetalle(): Promise<any[]> {
  const { data, error } = await this.supabase
    .from('pedidosalmuerzos')
    .select(`
      id,
      cliente_id,
      fecha,
      estado_pago,
      total,
      observaciones,
      clientes (
        nombre
      ),
      pedidos_almuerzo (
        almuerzo_id,
        cantidad,
        almuerzos (
          nombre
        )
      )
    `);

  if (error) {
    throw error;
  }

  return data;
}

async obtenerPedidosConDetalleFiltrado(desde: string, hasta: string): Promise<any[]> {
  const { data, error } = await this.supabase
    .from('pedidosalmuerzos')
    .select(`
      id,
      cliente_id,
      fecha,
      estado_pago,
      total,
      observaciones,
      clientes (
        nombre
      ),
      pedidos_almuerzo (
        almuerzo_id,
        cantidad,
        almuerzos (
          nombre
        )
      )
    `)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data;
}
async cambiarEstadoCliente(clienteId: string, activo: boolean) {
  const { error } = await this.supabase
    .from('clientes')
    .update({ activo })
    .eq('id', clienteId);

  if (error) throw error;
}

async actualizarClienteConPrecios(
  clienteId: string,
  nombre: string,
  telefono: string | undefined,
  direccion: string | undefined,
  precios: { almuerzo_id: string; precio: number }[]
) {
  // 1. Actualizar datos básicos del cliente
  const { data: clienteData, error: clienteError } = await this.supabase
    .from('clientes')
    .update({ nombre, telefono, direccion })
    .eq('id', clienteId)
    .select()
    .single();

  if (clienteError) throw clienteError;

  // 2. Actualizar precios: para simplificar, eliminar todos y volver a insertar
  const { error: deleteError } = await this.supabase
    .from('precios_cliente')
    .delete()
    .eq('cliente_id', clienteId);

  if (deleteError) throw deleteError;

  const preciosInsert = precios.map(({ almuerzo_id, precio }) => ({
    cliente_id: clienteId,
    almuerzo_id,
    precio,
  }));

  const { data: preciosData, error: preciosError } = await this.supabase
    .from('precios_cliente')
    .insert(preciosInsert);

  if (preciosError) throw preciosError;

  return {
    cliente: clienteData,
    precios: preciosData,
  };
}
async actualizarEstadoPagado(idsPedidos: number[]): Promise<void> {
  const { error } = await this.supabase
    .from('pedidosalmuerzos')
    .update({ estado_pago: 'pagado' })
    .in('id', idsPedidos);

  if (error) throw error;
}
// Función para obtener todas las facturas
async obtenerFacturasHoy() {
  try {
    // 1. Obtener la última sesión abierta
    const { data: sesiones, error: errorSesion } = await this.supabase
      .from('caja_sesiones')
      .select('*')
      .eq('estado', 'abierta')
      .order('hora_apertura', { ascending: false })
      .limit(1);

    if (errorSesion) throw errorSesion;

    if (!sesiones || sesiones.length === 0) {
      return { error: 'No hay sesión de caja abierta' };
    }

    const horaApertura = sesiones[0].hora_apertura;

    // 2. Obtener facturas desde la hora de apertura (incluyendo las con fecha null si quieres)
    const { data: facturas, error: errorFacturas } = await this.supabase
      .from('facturas')
      .select('*')
      .or(`fecha.gte.${horaApertura},fecha.is.null`) // incluye facturas sin fecha también
      .order('fecha', { ascending: false });

    if (errorFacturas) throw errorFacturas;

    return { data: facturas };
  } catch (error: any) {
    console.error('Error al obtener facturas por sesión:', error);
    return { error: error.message };
  }
}



async obtenerGastosHoy() {
  try {
    // 1. Verificar si hay caja abierta
    const { data: sesiones, error: errorSesion } = await this.supabase
      .from('caja_sesiones')
      .select('fecha_operativa')
      .eq('estado', 'abierta')
      .order('hora_apertura', { ascending: false })
      .limit(1);

    if (errorSesion) throw errorSesion;
    if (!sesiones || sesiones.length === 0) {
      return { data: null, error: 'No hay caja abierta' };
    }

    const fechaOperativa = sesiones[0].fecha_operativa;

    // 2. Obtener todos los gastos desde esa fecha (inclusive)
    const { data: gastos, error: errorGastos } = await this.supabase
      .from('gastos')
      .select('*')
      .gte('fecha', fechaOperativa) // ">=" fecha_operativa
      .order('fecha', { ascending: false });

    if (errorGastos) throw errorGastos;

    return { data: gastos, error: null };

  } catch (error) {
    // Manejo seguro de errores en TypeScript
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en obtenerGastosHoy:', errorMessage);
    return { data: null, error: errorMessage };
  }
}


async registrarAperturaCaja(apertura: {
  usuario_nombre: string,
  fecha_operativa: string,
  hora_apertura: string,
  numero_cierre?: number,
  observaciones?: string
}) {
  try {
    const { usuario_nombre, fecha_operativa, hora_apertura, numero_cierre, observaciones } = apertura;

    // Verificar si hay alguna sesión abierta, sin importar la fecha
    const { data: sesionesAbiertas, error: errorSesiones } = await this.supabase
      .from('caja_sesiones')
      .select('*')
      .eq('usuario_nombre', usuario_nombre)
      .eq('estado', 'abierta');

    if (errorSesiones) throw errorSesiones;

    if (sesionesAbiertas && sesionesAbiertas.length > 0) {
      return { error: 'Ya existe una sesión de caja abierta. Debes cerrarla antes de abrir una nueva.' };
    }

    // Insertar nueva apertura
    const { data, error } = await this.supabase
      .from('caja_sesiones')
      .insert([
        {
          usuario_nombre,
          fecha_operativa,
          hora_apertura,
          numero_cierre,
          estado: 'abierta',
          observaciones: observaciones || null
        }
      ]);

    if (error) {
      if (error.message.includes('timeout')) {
        return { error: 'Error de sistema. Intenta nuevamente más tarde.' };
      }
      throw error;
    }

    return { data };
  } catch (error: any) {
    console.error("Error al registrar apertura de caja:", error);
    return { error: error.message };
  }
}

 // Método público para verificar sesiones abiertas
  async obtenerSesionesAbiertas(usuario_nombre: string, fecha_operativa: string) {
    const { data, error } = await this.supabase
      .from('caja_sesiones')
      .select('*')
      .eq('usuario_nombre', usuario_nombre)
      .eq('fecha_operativa', fecha_operativa)
      .eq('estado', 'abierta');

    if (error) throw error;
    return data;
  }
async obtenerMaxNumeroCierreGlobal() {
  const { data, error } = await this.supabase
    .from('caja_sesiones')
    .select('numero_cierre')
    .order('numero_cierre', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener max numero_cierre global:', error);
    throw error;
  }

  return data?.numero_cierre ?? null;
}
async obtenerMaxNumeroCierrecaja() {
  const { data, error } = await this.supabase
    .from('cierres_caja')
    .select('numero_cierre')
    .order('numero_cierre', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener max numero_cierre global:', error);
    throw error;
  }

  return data?.numero_cierre ?? null;
}

async registrarCierreCaja(cierre: {
  fecha_cierre: string, 
  total_ventas_efectivo?: number,
  total_ventas_transferencia?: number,
  total_ventas_tarjeta?: number,
  total_ventas_pedidos_ya?: number,
  total_ventas_pedidos_beez?: number,
  total_ventas_credito?: number,
  total_ventas?: number,
  total_gastos?: number,
  total_gastos_efectivo?: number,
  total_gastos_transferencia?: number,
  total_esperado?: number,
  monto_contado?: number,
  diferencia?: number,
  total_a_depositar?: number,
  observaciones?: string,
  creado_por: string
}) {
  try {
    const { data, error } = await this.supabase
      .from('cierres_caja')
      .insert([cierre]);

    if (error) {
      console.error('Error al registrar cierre:', error);
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    console.error('Excepción al registrar cierre de caja:', error);
    return { error: error.message };
  }
}
async obtenerCajaAbierta(usuario_nombre: string) {
  const { data, error } = await this.supabase
    .from('caja_sesiones')
    .select('*')
    .eq('usuario_nombre', usuario_nombre)
    .eq('estado', 'abierta')
    .order('id', { ascending: false }) // más reciente
    .limit(1);

  if (error) {
    console.error('Error al obtener caja abierta:', error);
    return null;
  }

  return data?.[0] || null;
}
async obtenerCajaAbiertas(): Promise<any> {
  const { data, error } = await this.supabase
    .from('caja_sesiones')
    .select('*')
    .eq('estado', 'abierta')
    .order('id', { ascending: false }) // obtener la más reciente
    .limit(1);

  if (error) {
    console.error('Error al obtener caja abierta:', error);
    return null;
  }

  return data?.[0] || null;
}


async CierreCaja(cierre: {
  usuario_nombre: string,
  fecha_operativa: string,
  hora_cierre: string
}) {
  try {
    const { usuario_nombre, fecha_operativa, hora_cierre } = cierre;

    // Buscar la sesión abierta para ese usuario y fecha
    const { data: sesionesAbiertas, error: errorSesiones } = await this.supabase
      .from('caja_sesiones')
      .select('id')
      .eq('usuario_nombre', usuario_nombre)
      .eq('fecha_operativa', fecha_operativa)
      .eq('estado', 'abierta');

    if (errorSesiones) throw errorSesiones;

    if (!sesionesAbiertas || sesionesAbiertas.length === 0) {
      return { error: 'No existe sesión abierta para cerrar.' };
    }

    const idSesion = sesionesAbiertas[0].id;

    // Actualizar: solo cambiar estado y hora_cierre
    const { data, error } = await this.supabase
      .from('caja_sesiones')
      .update({
        estado: 'cerrada',
        hora_cierre
      })
      .eq('id', idSesion);

    if (error) {
      if (error.message.includes('timeout')) {
        return { error: 'Error de sistema. Intenta nuevamente más tarde.' };
      }
      throw error;
    }

    return { data };
  } catch (error: any) {
    console.error("Error al cerrar la caja:", error);
    return { error: error.message };
  }
}

async obtenerUltimosCierresCombinado(limite = 3) {
  // Obtener las sesiones cerradas
  const { data: sesiones, error: errorSesiones } = await this.supabase
    .from('caja_sesiones')
    .select('*')
    .eq('estado', 'cerrada')
    .order('hora_cierre', { ascending: false })
    .limit(limite);

  if (errorSesiones) {
    console.error('Error al obtener sesiones:', errorSesiones);
    return [];
  }

  // Obtener los cierres de caja
  const { data: cierres, error: errorCierres } = await this.supabase
    .from('cierres_caja')
    .select('*');

  if (errorCierres) {
    console.error('Error al obtener cierres:', errorCierres);
    return [];
  }

  // Emparejar por numero_cierre
  const resultado = sesiones.map(sesion => {
    const cierreRelacionado = cierres.find(cierre =>
      cierre.numero_cierre === sesion.numero_cierre
    );

    return {
      fecha: sesion.hora_cierre,
      numero: sesion.numero_cierre,
      total_ventas: parseFloat(cierreRelacionado?.total_ventas || '0.00'),
      monto_contado: parseFloat(cierreRelacionado?.monto_contado || '0.00'),
      diferencia: parseFloat(cierreRelacionado?.diferencia || '0.00'),
      observaciones: cierreRelacionado?.observaciones || '',
    };
  });

  return resultado;
}

async obtenerCierresDeCaja(): Promise<any[]> {
  const { data, error } = await this.supabase
    .from('cierres_caja')
    .select('*')
    .order('fecha_cierre', { ascending: false }) // orden descendente, el más reciente primero
    .limit(1); // traer solo un registro

  if (error) {
    console.error('Error al obtener el último cierre de caja:', error);
    throw error;
  }

  return data || [];
}








}