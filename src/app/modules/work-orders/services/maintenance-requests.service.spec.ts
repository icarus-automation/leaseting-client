import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_BASE_URL } from '../../../core/config/api';
import { MaintenanceRequestsService } from './maintenance-requests.service';

describe('MaintenanceRequestsService', () => {
  const base = `${API_BASE_URL}/maintenance-requests`;
  let service: MaintenanceRequestsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MaintenanceRequestsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the org queue with only the filters that are set', () => {
    service.list({ status: 'OPEN', propertyId: 'prop-1', page: 2, limit: 20 }).subscribe();

    const req = http.expectOne((request) => request.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('OPEN');
    expect(req.request.params.get('propertyId')).toBe('prop-1');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.has('unitId')).toBe(false);
    expect(req.request.params.has('tenantId')).toBe(false);
    req.flush({ data: [], meta: { total: 0, page: 2, limit: 20, lastPage: 1 } });
  });

  it('reads one request by id', () => {
    service.get('req-1').subscribe();
    expect(http.expectOne(`${base}/req-1`).request.method).toBe('GET');
  });

  it('starts a request with a POST and no body', () => {
    service.start('req-1').subscribe();

    const req = http.expectOne(`${base}/req-1/start`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({});
  });

  it('resolves with the note trimmed', () => {
    service.resolve('req-1', '  Cleared the trap under the sink.  ').subscribe();

    const req = http.expectOne(`${base}/req-1/resolve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ resolveNote: 'Cleared the trap under the sink.' });
    req.flush({});
  });

  it('leaves a blank note out of resolve', () => {
    service.resolve('req-1', '   ').subscribe();

    expect(http.expectOne(`${base}/req-1/resolve`).request.body).toEqual({});
  });

  it('loads a private photo as a blob with the session cookie', () => {
    const url = `${base}/req-1/photos/0`;
    service.photo(url).subscribe();

    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.withCredentials).toBe(true);
    req.flush(new Blob(['jpeg'], { type: 'image/jpeg' }));
  });
});
