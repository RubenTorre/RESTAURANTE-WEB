import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild, ElementRef, Renderer2, OnInit } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { UserService } from '../../Services/user.service';
import { SupabaseService } from '../../Services/supabase.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-side-bar',
  imports: [CommonModule, RouterLink,RouterModule],
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css']
})
export class SideBarComponent implements OnInit {
  isHovered = false;
  nombreUsuario: string = '';
  rolUsuario: string = '';
  visibleMenuItems: any[] = [];
  isMobileView = false;
  forceCollapsed = false;
  @ViewChild('sidebarContainer') sidebarContainer!: ElementRef;

  constructor(
    private userService: UserService,
    private renderer: Renderer2,
    private SupabaseService: SupabaseService,
    private router: Router
  ) {
    this.checkViewport();
    this.renderer.listen('window', 'resize', () => this.checkViewport());
  }

  ngOnInit() {
    this.userService.nombreUsuario$.subscribe(nombre => {
      this.nombreUsuario = nombre;      
    });
    this.userService.rolUsuario$.subscribe(rol => {
      this.rolUsuario = rol;
      this.filtrarMenuPorRol(rol);
    });
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.isMobileView && !this.forceCollapsed) {
      const clickedInside = this.sidebarContainer.nativeElement.contains(event.target);
      const isHamburgerButton = (event.target as HTMLElement).closest('.mobile-menu-btn');
      
      if (!clickedInside && !isHamburgerButton) {
        this.closeMenuOnMobile();
      }
    }
  }

  checkViewport() {
    this.isMobileView = window.innerWidth < 768;
    if (this.isMobileView) {
      this.forceCollapsed = true;
    } else {
      this.forceCollapsed = false;
    }
  }

  toggleMobileMenu() {
    if (this.isMobileView) {
      this.forceCollapsed = !this.forceCollapsed;
      this.isHovered = !this.forceCollapsed;
    }
  }

  closeMenuOnMobile() {
    if (this.isMobileView) {
      this.forceCollapsed = true;
      this.isHovered = false;
    }
  }
  filtrarMenuPorRol(rol: string) {
    const permisos: { [key: string]: { [key: string]: string[] } } = {
      administrador: {
        Dashboard: [],
        Usuarios: [],
        Menú: [],
        Facturación: [],
        Cuenta: []
      },
      mesero: {
        Menú: ['Carta'], // Solo puede ver "Carta" del Menú
        Cuenta: []
      },
      cocinero: {
        Dashboard: [],
        Menú: ['Recetas', 'Productos'], // Solo estos submenús
        Cuenta: []
      },
      cajero: {
        Dashboard: ['Resumen'],
        Facturación: [],
        Cuenta: []
      }
    };
  
    const permisosRol = permisos[rol] || {};
  
    this.visibleMenuItems = this.menuItems
      .map(item => {
        if (permisosRol.hasOwnProperty(item.label)) {
          const subpermisos = permisosRol[item.label];
  
          // Filtrar submenús si están definidos
          if (item.submenus && item.submenus.length > 0) {
            const submenusFiltrados = subpermisos.length > 0
              ? item.submenus.filter(sub => subpermisos.includes(sub.label))
              : item.submenus;
  
            if (submenusFiltrados.length > 0) {
              return { ...item, submenus: submenusFiltrados };
            } else {
              return null; // No mostrar el ítem si no tiene submenús visibles
            }
          }
  
          return item; // Ítems sin submenús
        }
  
        return null;
      })
      .filter(Boolean); // Quitar los null
  }
  menuItems = [
    {
      icon: 'bi bi-speedometer2',
      label: 'Dashboard',
     
      submenus: [
        { label: 'Resumen', route: '/dashboard', icon: 'bi bi-house-door' },
        { label: 'Reportes', route: '/dashboard/reportes', icon: 'bi bi-file-earmark' },
      ],
      expanded: true
    },
    {
      icon: 'bi bi-people',
      label: 'Usuarios',
      route: '/Usuarios',
      submenus: [
        { label: 'Lista', route: '/Usuarios', icon: 'bi bi-list-ul' },
      ],
      expanded: true
    },
    {
      icon: 'bi bi-card-list',
      label: 'Menú',
      route: '/menu',
      submenus: [
        { label: 'Carta', route: '/menu/carta', icon: 'bi bi-book' },
        { label: 'Productos', route: '/menu/productos', icon: 'bi bi-cup-straw' },
        { label: 'Recetas', route: '/menu/recetas', icon: 'bi bi-egg' },
      ],
      expanded: true
    },
    {
      icon: 'bi bi-receipt',
      label: 'Facturación',
     
      submenus: [
        { label: 'Cobros', route: '/facturas/cobros', icon: 'bi bi-cash-stack' },
        { label: 'Pedidos', route: '/facturas/imprimir',icon: 'bi bi-receipt-cutoff' },
        { label: 'Egresos', route: '/egresos',icon: 'bi bi-receipt-cutoff' },
        { label: 'Contratos', route: '/Contratos',icon: 'bi bi-receipt-cutoff' },
      ],
      expanded: true
    },
    {
      icon: 'bi bi-person-circle',
      label: 'Cuenta',
      submenus: [
        { label: 'Mi perfil', route: '/perfil', icon: 'bi bi-person' },
        { label: 'Cerrar sesión', icon: 'bi bi-box-arrow-right', action: 'logout' }
      ],
      expanded: true
    }
    
   
    
  ];
  
  toggleSubmenu(item: any) {
    item.expanded = !item.expanded;
  }
  async handleSubmenuClick(sub: any) {
    if (sub.action === 'logout') {
      await this.cerrarSesion();
    }
  }
  
  async cerrarSesion() {
    const resultado = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Estás a punto de cerrar sesión.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    });
  
    if (resultado.isConfirmed) {
      try {
        await this.SupabaseService.logout();
        this.userService.limpiarNombre();
        this.userService.limpiarRol();
        this.router.navigate(['/login']);
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        Swal.fire('Error', 'No se pudo cerrar sesión.', 'error');
      }
    }
  }
  
}