import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaComprasComponente } from './lista-compras';

describe('ListaComprasComponente', () => {
  let component: ListaComprasComponente;
  let fixture: ComponentFixture<ListaComprasComponente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaComprasComponente],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaComprasComponente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
