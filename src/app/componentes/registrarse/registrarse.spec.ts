import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Registrarse } from './registrarse';

describe('Registrarse', () => {
  let component: Registrarse;
  let fixture: ComponentFixture<Registrarse>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Registrarse],
    }).compileComponents();

    fixture = TestBed.createComponent(Registrarse);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
