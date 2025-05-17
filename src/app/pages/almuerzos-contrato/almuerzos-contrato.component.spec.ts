import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlmuerzosContratoComponent } from './almuerzos-contrato.component';

describe('AlmuerzosContratoComponent', () => {
  let component: AlmuerzosContratoComponent;
  let fixture: ComponentFixture<AlmuerzosContratoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlmuerzosContratoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlmuerzosContratoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
