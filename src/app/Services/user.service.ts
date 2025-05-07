import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private _nombreUsuarioSubject = new BehaviorSubject<string>(this.obtenerNombreGuardado());
  nombreUsuario$ = this._nombreUsuarioSubject.asObservable();

  private _rolUsuarioSubject = new BehaviorSubject<string>(this.obtenerRolGuardado());
  rolUsuario$ = this._rolUsuarioSubject.asObservable();

  constructor() {}

  // Establecer el nombre del usuario
  setNombreUsuario(nombre: string) {
    this._nombreUsuarioSubject.next(nombre);
    localStorage.setItem('nombreUsuario', nombre); // Guardamos el nombre en localStorage
  }

  // Obtener el nombre del usuario guardado
  private obtenerNombreGuardado(): string {
    return localStorage.getItem('nombreUsuario') || ''; // Leemos del localStorage
  }

  // Limpiar el nombre del usuario
  limpiarNombre() {
    this._nombreUsuarioSubject.next('');
    localStorage.removeItem('nombreUsuario');
  }

  // Establecer el rol del usuario
  setRolUsuario(rol: string) {
    this._rolUsuarioSubject.next(rol);
    localStorage.setItem('rolUsuario', rol); // Guardamos el rol en localStorage
    console.log(rol)
  }

  // Obtener el rol del usuario guardado
  private obtenerRolGuardado(): string {
    return localStorage.getItem('rolUsuario') || ''; // Leemos del localStorage
  }

  // Limpiar el rol del usuario
  limpiarRol() {
    this._rolUsuarioSubject.next('');
    localStorage.removeItem('rolUsuario');
  }
}
