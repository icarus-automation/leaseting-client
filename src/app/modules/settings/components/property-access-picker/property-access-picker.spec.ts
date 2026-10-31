import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { PropertyListItem } from '../../../../core/models/property.types';
import { PropertiesService } from '../../../properties/services/properties.service';
import { EVERY_PROPERTY_VALUE, type PropertyAccessValue } from '../../utils/property-access.util';
import { PropertyAccessPicker } from './property-access-picker';

@Component({
  imports: [ReactiveFormsModule, PropertyAccessPicker],
  template:
    '<app-property-access-picker [formControl]="control" idPrefix="test" [error]="error()" [subject]="subject()" />',
})
class Host {
  readonly control = new FormControl<PropertyAccessValue>(EVERY_PROPERTY_VALUE, { nonNullable: true });
  readonly error = signal<string | null>(null);
  readonly subject = signal<'staff' | 'attendant'>('staff');
}

function property(id: string, name: string, city = 'Makati'): PropertyListItem {
  return { id, name, city } as PropertyListItem;
}

const PROPERTIES = [property('p-harbor', 'Harbor View', 'Pasig'), property('p-brickstone', 'Brickstone')];

describe('PropertyAccessPicker', () => {
  const listAll = vi.fn();
  const hasEveryProperty = signal(true);
  let fixture: ComponentFixture<Host>;
  let host: Host;

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        { provide: PropertiesService, useValue: { listAll } },
        { provide: AuthService, useValue: { hasEveryProperty } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function radios(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]'));
  }

  function checkboxes(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="checkbox"]'));
  }

  function chooseSpecific(): void {
    radios()[1].click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    listAll.mockReset();
    listAll.mockReturnValue(of(PROPERTIES));
    hasEveryProperty.set(true);
  });

  it('starts on All properties and hides the list', async () => {
    await render();

    expect(radios()[0].checked).toBe(true);
    expect(radios()[0].disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Every property, including ones added later.');
    expect(checkboxes()).toHaveLength(0);
  });

  it('lists the properties by name once Specific properties is chosen, and holds the picked ones', async () => {
    await render();

    chooseSpecific();
    expect(host.control.value).toEqual({ everyProperty: false, propertyIds: [] });
    const names = Array.from(fixture.nativeElement.querySelectorAll('li'), (item: HTMLElement) => item.textContent?.trim());
    expect(names[0]).toContain('Brickstone');
    expect(names[1]).toContain('Harbor View');
    expect(names[1]).toContain('Pasig');

    checkboxes()[1].click();
    fixture.detectChanges();

    expect(host.control.value).toEqual({ everyProperty: false, propertyIds: ['p-harbor'] });
    expect(fixture.nativeElement.textContent).toContain('1 property picked');

    checkboxes()[1].click();
    expect(host.control.value).toEqual({ everyProperty: false, propertyIds: [] });
  });

  it('shows a value the form already holds', async () => {
    await render();

    host.control.setValue({ everyProperty: false, propertyIds: ['p-brickstone'] });
    fixture.detectChanges();

    expect(radios()[1].checked).toBe(true);
    expect(checkboxes().map((box) => box.checked)).toEqual([true, false]);
  });

  it('keeps All properties from someone who is limited themselves', async () => {
    hasEveryProperty.set(false);
    await render();

    expect(radios()[0].disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Only someone with access to every property can give this.');
  });

  it('says why the list did not load, and loads it again on retry', async () => {
    listAll.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500, error: { statusCode: 500, message: 'Server down.' } })),
    );
    await render();
    chooseSpecific();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Server down.');

    fixture.debugElement.query((element) => element.componentInstance instanceof PropertyAccessPicker)
      .componentInstance.load();
    fixture.detectChanges();

    expect(listAll).toHaveBeenCalledTimes(2);
    expect(checkboxes()).toHaveLength(2);
  });

  it('says so when there are no properties to pick', async () => {
    listAll.mockReturnValue(of([]));
    await render();
    chooseSpecific();

    expect(fixture.nativeElement.textContent).toContain('There are no properties to pick yet.');
  });

  it('adds a search box past eight properties', async () => {
    listAll.mockReturnValue(of(Array.from({ length: 9 }, (_, index) => property(`p-${index}`, `Tower ${index + 1}`))));
    await render();
    chooseSpecific();

    const search = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'tower 9';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(checkboxes()).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('li').textContent).toContain('Tower 9');
  });

  it('speaks of terminals for a parking attendant', async () => {
    await render();

    host.subject.set('attendant');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#test-every-property-hint').textContent).toContain(
      'Every terminal, at every property, including ones added later.',
    );
    expect(fixture.nativeElement.querySelector('#test-specific-hint').textContent).toContain(
      'Only the terminals at the properties you pick.',
    );
  });

  it('shows the form error under the choices', async () => {
    await render();

    host.error.set('Pick at least one property, or give every property.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#test-property-error').textContent).toContain(
      'Pick at least one property, or give every property.',
    );
  });
});
