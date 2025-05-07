import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing.module';
import { SplashComponent } from './splash/splash.component';
import { LoginComponent } from './login/login.component';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    AuthRoutingModule,SplashComponent,LoginComponent
  ]
})
export class AuthModule { }
