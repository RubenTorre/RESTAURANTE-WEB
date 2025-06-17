import { Routes } from '@angular/router';
import { SplashComponent } from './auth/splash/splash.component';
import { LoginComponent } from './auth/login/login.component';

export const routes: Routes = [
    {path :'', component: SplashComponent},
    {path:'login',component:LoginComponent},
    {
        path:'',
        loadComponent:() => import('./shared/layout/layout.component'),
        children:[
            {
                path:'dashboard',
                loadComponent:() => import('./pages/dashboard/dashboard.component')
            },
            {
                path:'menu/productos',
                loadComponent:() => import('./pages/inventario/inventario.component')

            },
            {
                path:'menu/recetas',
                loadComponent:() => import('./pages/recetas/recetas.component')

            },
            {
                path:'menu/carta',
                loadComponent:() => import('./pages/carta/carta.component')

            },
            {
                path:'facturas/cobros',
                loadComponent:() => import('./pages/facturas/facturas.component')

            },
            {
                path:'facturas/imprimir',
                loadComponent:() => import('./pages/imprimir-facturas/imprimir-facturas.component')

            },
            {
                path:'Usuarios',
                loadComponent:() => import('./pages/usuarios/usuarios.component')

            },
            {
                path:'perfil',
                loadComponent:() => import('./pages/perfil/perfil.component')

            },
            {
                path:'egresos',
                loadComponent:() => import('./pages/gastos/gastos.component')

            },
            {
                path:'Contratos',
                loadComponent:() => import('./pages/almuerzos-contrato/almuerzos-contrato.component')

            },
            {
                path:'Cierre/Caja',
                loadComponent:() => import('./pages/cierre-caja/cierre-caja.component')

            },
        ]
    }
];
