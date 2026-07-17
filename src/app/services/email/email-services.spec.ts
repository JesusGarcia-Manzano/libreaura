import { TestBed } from '@angular/core/testing';

import { EmailServices } from './email-services';

describe('EmailServices', () => {
  let service: EmailServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmailServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
