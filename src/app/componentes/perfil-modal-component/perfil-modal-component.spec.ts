import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilModalComponent } from './perfil-modal-component';

describe('PerfilModalComponent', () => {
  let component: PerfilModalComponent;
  let fixture: ComponentFixture<PerfilModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
