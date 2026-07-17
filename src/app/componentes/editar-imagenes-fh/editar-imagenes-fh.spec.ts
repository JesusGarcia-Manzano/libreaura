import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarImagenesFHComponent } from './editar-imagenes-fh';

describe('EditarImagenesFH', () => {
  let component: EditarImagenesFHComponent;
  let fixture: ComponentFixture<EditarImagenesFHComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarImagenesFHComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditarImagenesFHComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
