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

            }
        ]
    }
];
