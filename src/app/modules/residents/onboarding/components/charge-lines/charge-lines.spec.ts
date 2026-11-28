import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { AuthService } from '../../../../../core/auth/auth.service';
import type { ChargeItemResponse } from '../../../../../core/models/charge-item.types';
import { ChargeItemsService } from '../../../../settings/services/charge-items.service';
import { createChargeLineArray } from './charge-line-form';
import { ChargeLines } from './charge-lines';

function oneTime(id: string, name: string, defaultAmount: string | null): ChargeItemResponse {
  return {
    id,
    name,
    billType: 'OTHER',
    defaultAmount,
    isArchived: false,
    frequency: 'ONE_TIME',
    isSystem: false,
    systemKey: null,
    createdAt: '',
    updatedAt: '',
  };
}

const CATALOG = [oneTime('key', 'Key Deposit', '1000.00'), oneTime('gate', 'Gate card', '250.00'), oneTime('misc', 'Misc', null)];

@Component({
  imports: [ChargeLines],
  template: `<app-charge-lines [lines]="lines" frequency="ONE_TIME" idPrefix="one-time" />`,
})
class Host {
  readonly lines = createChargeLineArray([{}]);
}

describe('ChargeLines picking a charge', () => {
  let fixture: ComponentFixture<Host>;
  let lines: ChargeLines;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        { provide: ChargeItemsService, useValue: { list: () => of(CATALOG) } },
        { provide: AuthService, useValue: { can: () => false } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    lines = fixture.debugElement.query(By.directive(ChargeLines)).componentInstance as ChargeLines;
  });

  const line = () => fixture.componentInstance.lines.at(0);

  it('fills in the item’s default amount, and the amount stays editable', () => {
    lines.onChargePicked(line(), 'key');

    expect(line().controls.amount.value).toBe(1000);
    expect(line().controls.amount.enabled).toBe(true);
    expect(line().getRawValue()).toMatchObject({ name: 'Key Deposit', billType: 'OTHER' });
  });

  it('swaps a filled-in default when another item is picked', () => {
    lines.onChargePicked(line(), 'key');
    lines.onChargePicked(line(), 'gate');

    expect(line().controls.amount.value).toBe(250);
  });

  it('keeps an amount someone typed, and one an item without a default would blank', () => {
    lines.onChargePicked(line(), 'key');
    line().controls.amount.setValue(900);
    line().controls.amount.markAsDirty();

    lines.onChargePicked(line(), 'gate');
    expect(line().controls.amount.value).toBe(900);

    lines.onChargePicked(line(), 'misc');
    expect(line().controls.amount.value).toBe(900);
  });
});
