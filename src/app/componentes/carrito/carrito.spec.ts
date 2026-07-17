import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarritoModalComponent } from './carrito';

describe('CarritoModalComponent', () => {
  let component: CarritoModalComponent;
  let fixture: ComponentFixture<CarritoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarritoModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CarritoModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
