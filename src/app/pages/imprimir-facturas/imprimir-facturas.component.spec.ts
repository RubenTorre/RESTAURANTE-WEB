import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImprimirFacturasComponent } from './imprimir-facturas.component';

describe('ImprimirFacturasComponent', () => {
  let component: ImprimirFacturasComponent;
  let fixture: ComponentFixture<ImprimirFacturasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImprimirFacturasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImprimirFacturasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
