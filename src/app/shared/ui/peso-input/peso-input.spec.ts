import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { PesoInput } from './peso-input';
import {
  formatPesoDisplay,
  formatPesoDraft,
  isPesoDraft,
  normalizePesoText,
  parsePesoText,
  toPesoAmount,
} from './peso-text.util';

describe('peso text rules', () => {
  it('accepts what someone could be halfway through typing', () => {
    for (const text of ['', '1', '15', '1500', '1500.', '1500.5', '1500.50', '.5', '0']) {
      expect(isPesoDraft(text)).toBe(true);
    }
    for (const text of ['1500.505', '1.2.3', '1234567890123', '-5', '1,500']) {
      expect(isPesoDraft(text)).toBe(false);
    }
  });

  it('cleans pasted text into an amount', () => {
    expect(normalizePesoText('₱1,234.567')).toBe('1234.56');
    expect(normalizePesoText('PHP 2,000')).toBe('2000');
    expect(normalizePesoText('1.2.3')).toBe('1.23');
  });

  it('reads blank and a bare point as no amount', () => {
    expect(parsePesoText('')).toBeNull();
    expect(parsePesoText('.')).toBeNull();
    expect(parsePesoText('12.')).toBe(12);
    expect(parsePesoText('.5')).toBe(0.5);
  });

  it('formats two decimals with grouping at rest and plain while editing', () => {
    expect(formatPesoDisplay(1500)).toBe('1,500.00');
    expect(formatPesoDisplay(0)).toBe('0.00');
    expect(formatPesoDisplay(null)).toBe('');
    expect(formatPesoDraft(1500.5)).toBe('1500.50');
    expect(formatPesoDraft(null)).toBe('');
  });

  it('reads API decimal strings as amounts', () => {
    expect(toPesoAmount('2500.50')).toBe(2500.5);
    expect(toPesoAmount(12)).toBe(12);
    expect(toPesoAmount('')).toBeNull();
    expect(toPesoAmount(null)).toBeNull();
    expect(toPesoAmount('abc')).toBeNull();
  });
});

@Component({
  imports: [ReactiveFormsModule, PesoInput],
  template: `<app-peso-input inputId="amount" [formControl]="control" [showClear]="true" />`,
})
class Host {
  readonly control = new FormControl<number | null>(null, [Validators.min(0.01)]);
}

describe('PesoInput', () => {
  let fixture: ComponentFixture<Host>;
  let field: HTMLInputElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    field = fixture.nativeElement.querySelector('input#amount');
  });

  const control = () => fixture.componentInstance.control;

  function type(text: string, inputType = 'insertText'): void {
    field.value = text;
    field.setSelectionRange(text.length, text.length);
    field.dispatchEvent(new InputEvent('input', { inputType }));
    fixture.detectChanges();
  }

  function focus(): void {
    field.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
  }

  function blur(): void {
    field.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
  }

  it('puts ₱ outside the field and starts empty', () => {
    const addon = fixture.nativeElement.querySelector('p-inputgroup-addon');
    expect(addon.textContent.trim()).toBe('₱');
    expect(addon.getAttribute('aria-hidden')).toBe('true');
    expect(field.value).toBe('');
    expect(field.placeholder).toBe('0.00');
    expect(field.getAttribute('inputmode')).toBe('decimal');
  });

  it('types left to right from empty without resetting', () => {
    focus();
    for (const [text, amount] of [['1', 1], ['15', 15], ['150', 150], ['1500', 1500], ['1500.', 1500], ['1500.7', 1500.7]] as const) {
      type(text);
      expect(field.value).toBe(text);
      expect(control().value).toBe(amount);
    }
  });

  it('selects 0.00 on focus so the first keystroke replaces it', () => {
    control().setValue(0);
    fixture.detectChanges();
    expect(field.value).toBe('0.00');

    focus();
    expect(field.value).toBe('0.00');
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(4);

    type('2');
    type('25');
    expect(control().value).toBe(25);
  });

  it('shows two decimals with grouping only after blur', () => {
    focus();
    type('12000.5');
    expect(field.value).toBe('12000.5');

    blur();
    expect(field.value).toBe('12,000.50');
    expect(control().value).toBe(12000.5);
    expect(control().touched).toBe(true);

    focus();
    expect(field.value).toBe('12000.50');
    expect(field.selectionEnd).toBe('12000.50'.length);
  });

  it('ignores a keystroke past two decimals or a second point', () => {
    focus();
    type('12.34');
    type('12.345');
    expect(field.value).toBe('12.34');
    type('12..34');
    expect(field.value).toBe('12.34');
    expect(control().value).toBe(12.34);
  });

  it('drops letters and commas as they are typed', () => {
    focus();
    type('1,5');
    expect(field.value).toBe('15');
    type('15a');
    expect(field.value).toBe('15');
    expect(control().value).toBe(15);
  });

  it('cleans up a pasted amount', () => {
    focus();
    type('₱1,234.567', 'insertFromPaste');
    expect(field.value).toBe('1234.56');
    expect(control().value).toBe(1234.56);
  });

  it('stays null when cleared, never 0.00', () => {
    control().setValue(500);
    fixture.detectChanges();
    focus();
    type('', 'deleteContentBackward');
    expect(control().value).toBeNull();
    blur();
    expect(field.value).toBe('');
    expect(control().value).toBeNull();
  });

  it('leaves the minimum to the form, so a low amount stays as typed and is invalid', () => {
    focus();
    type('0');
    blur();
    expect(field.value).toBe('0.00');
    expect(control().value).toBe(0);
    expect(control().hasError('min')).toBe(true);
  });

  it('shows an amount the form sets, including API decimal strings', () => {
    (control() as FormControl<unknown>).setValue('2500.5');
    fixture.detectChanges();
    expect(field.value).toBe('2,500.50');
  });

  it('selects an amount the form sets while the field has focus, so typing replaces it', () => {
    focus();
    control().setValue(1500);
    fixture.detectChanges();

    expect(field.value).toBe('1500.00');
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(7);
  });

  it('leaves the draft alone when the form echoes what is being typed', () => {
    focus();
    type('12.5');
    control().setValue(12.5);
    fixture.detectChanges();

    expect(field.value).toBe('12.5');
  });

  it('empties the field with the clear button', () => {
    control().setValue(650);
    fixture.detectChanges();
    const clear = fixture.nativeElement.querySelector('button[aria-label="Clear amount"]') as HTMLButtonElement;
    clear.click();
    fixture.detectChanges();
    expect(control().value).toBeNull();
    expect(fixture.nativeElement.querySelector('button[aria-label="Clear amount"]')).toBeNull();
  });

  describe('the ₱99,999,999.99 cap', () => {
    const message = () => fixture.nativeElement.querySelector('p.text-destructive') as HTMLElement | null;

    it('marks a pasted amount over the cap invalid and says so under the field', () => {
      focus();
      type('500000000000', 'insertFromPaste');
      blur();

      expect(field.value).toBe('500,000,000,000.00');
      expect(control().hasError('pesoMax')).toBe(true);
      expect(control().invalid).toBe(true);
      expect(message()?.textContent?.trim()).toBe('Max ₱99,999,999.99');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.getAttribute('aria-describedby')).toBe(message()?.id);
    });

    it('says so as soon as a typed amount goes over, and clears once it is back under', () => {
      focus();
      type('99999999.99');
      expect(control().valid).toBe(true);
      expect(message()).toBeNull();

      type('100000000');
      expect(control().hasError('pesoMax')).toBe(true);
      expect(message()?.textContent?.trim()).toBe('Max ₱99,999,999.99');

      type('10000000');
      expect(control().valid).toBe(true);
      expect(message()).toBeNull();
      expect(field.hasAttribute('aria-describedby')).toBe(false);
    });

    it('flags an amount the form sets over the cap', () => {
      control().setValue(123_456_789);
      fixture.detectChanges();
      expect(control().hasError('pesoMax')).toBe(true);
      expect(message()).not.toBeNull();
    });
  });

  it('follows the control when it is disabled', () => {
    control().disable();
    fixture.detectChanges();
    expect(field.disabled).toBe(true);
  });
});
