import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild, ElementRef, Renderer2, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../Services/user.service';

@Component({
  selector: 'app-side-bar',
  imports: [CommonModule, RouterLink],
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
    private renderer: Renderer2
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
    const permisos: { [key: string]: string[] } = {
      administrador: ['Dashboard', 'Usuarios', 'Menú', 'Facturas'],
      mesero: ['Dashboard', 'Facturas'],
      cocinero: ['Dashboard', 'Menú'],
      cajero: ['Dashboard', 'Facturas'],
    };
  
    const permitidos = permisos[rol] || [];
  
    this.visibleMenuItems = this.menuItems.filter(item =>
      permitidos.includes(item.label)
    );
  }
  
  menuItems = [
    {
      icon: 'bi bi-speedometer2',
      label: 'Dashboard',
      route: '/dashboard',
      submenus: [
        { label: 'Resumen', route: '/dashboard', icon: 'bi bi-house-door' },
        { label: 'Reportes', route: '/dashboard/reportes', icon: 'bi bi-file-earmark' },
      ],
      expanded: true
    },
    {
      icon: 'bi bi-people',
      label: 'Usuarios',
      route: '/usuarios',
      submenus: [
        { label: 'Lista', route: '/usuarios/lista', icon: 'bi bi-list-ul' },
        { label: 'Roles', route: '/usuarios/roles', icon: 'bi bi-shield-lock' },
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
      icon: 'bi bi-card-list',
      label: 'Facturas',
      route: '/menu',
      submenus: [
        { label: 'Facturas', route: '/facturas/cobros', icon: 'bi bi-cup-straw' },
        { label: 'Pedidos', route: '/facturas/imprimir', icon: 'bi bi-tags' },
        { label: 'Recetas', route: '/menu/recetas', icon: 'bi bi-egg' },
      ],
      expanded: true
    },
  ];
  
  toggleSubmenu(item: any) {
    item.expanded = !item.expanded;
  }
}