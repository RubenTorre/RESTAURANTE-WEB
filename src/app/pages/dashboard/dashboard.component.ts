import { Component } from '@angular/core';
import { SupabaseService } from '../../Services/supabase.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export default class DashboardComponent {

  constructor(private supabaseservice:SupabaseService){}

 
  

}
