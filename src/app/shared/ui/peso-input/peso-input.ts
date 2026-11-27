import { ChangeDetectionStrategy, Component, ElementRef, computed, forwardRef, input, signal, viewChild } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PIcon } from '@primeicons/angular/p-icon';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddon } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';

import {
  formatPesoDisplay,
  formatPesoDraft,
  isPesoDraft,
  normalizePesoText,
  parsePesoText,
  stripPesoText,
  toPesoAmount,
} from './peso-text.util';

/** Keystrokes that would break the amount are ignored; pastes and drops are cleaned up instead. */
const TYPED_INPUT = new Set(['insertText', 'insertCompositionText']);

/**
 * Every money field in the app. ₱ sits outside the field, typing runs left to
 * right with nothing to delete first, and the amount shows two decimals once
 * the field is left. Focus selects it all so the next keystroke replaces it.
 * A blank field is null, never 0.00. Minimums are the host form's validators,
 * shown inline on submit, so the field never rewrites what someone typed.
 */
@Component({
  selector: 'app-peso-input',
  imports: [InputGroup, InputGroupAddon, InputText, PIcon],
  template: `
    <p-inputgroup styleClass="field-host">
      <p-inputgroup-addon styleClass="text-muted" aria-hidden="true">₱</p-inputgroup-addon>
      <input
        #field
        pInputText
        type="text"
        inputmode="decimal"
        autocomplete="off"
        [attr.id]="inputId() ?? null"
        [attr.aria-label]="ariaLabel() ?? null"
        [attr.aria-describedby]="ariaDescribedBy() ?? null"
        [attr.aria-invalid]="invalid() || null"
        [invalid]="invalid()"
        [placeholder]="placeholder()"
        [readOnly]="readonly()"
        [disabled]="disabled()"
        [value]="text()"
        [class.pr-8]="clearable()"
        (focus)="onFocus()"
        (mousedown)="armSelectAll()"
        (mouseup)="keepSelectAll($event)"
        (input)="onInput($event)"
        (blur)="onBlur()"
      />
    </p-inputgroup>
    @if (clearable()) {
      <button
        type="button"
        tabindex="-1"
        class="absolute right-2 top-1/2 z-[2] flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-base border-none bg-transparent text-muted transition-colors duration-150 ease-out hover:bg-surface hover:text-body motion-reduce:transition-none"
        aria-label="Clear amount"
        (click)="clear()"
      >
        <svg pIcon="times" [size]="12" aria-hidden="true"></svg>
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PesoInput), multi: true }],
  host: { class: 'relative block' },
})
export class PesoInput implements ControlValueAccessor {
  readonly inputId = input<string>();
  readonly placeholder = input('0.00');
  readonly ariaLabel = input<string>();
  readonly ariaDescribedBy = input<string>();
  readonly invalid = input(false);
  readonly readonly = input(false);
  /** Shows an × that empties the field, for optional amounts. */
  readonly showClear = input(false);

  readonly text = signal('');
  readonly disabled = signal(false);
  readonly clearable = computed(
    () => this.showClear() && this.text() !== '' && !this.disabled() && !this.readonly(),
  );

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private amount: number | null = null;
  private focused = false;
  private selectAllOnMouseUp = false;
  private onChange: (amount: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: unknown): void {
    const amount = toPesoAmount(value);
    if (!this.focused) {
      this.amount = amount;
      this.text.set(formatPesoDisplay(amount));
      return;
    }
    // The form echoing what's being typed: leave the draft and the caret alone.
    if (amount === this.amount) return;
    // A new amount arriving mid-focus, like a balance prefill, is selected so typing replaces it.
    this.amount = amount;
    const draft = formatPesoDraft(amount);
    const element = this.field().nativeElement;
    element.value = draft;
    this.text.set(draft);
    element.select();
  }

  registerOnChange(fn: (amount: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  focus(): void {
    this.field().nativeElement.focus();
  }

  onFocus(): void {
    this.focused = true;
    const element = this.field().nativeElement;
    const draft = formatPesoDraft(this.amount);
    element.value = draft;
    this.text.set(draft);
    element.select();
  }

  /** A click that focuses the field would drop the selection on mouseup; keep it. */
  armSelectAll(): void {
    this.selectAllOnMouseUp = !this.focused;
  }

  keepSelectAll(event: MouseEvent): void {
    if (!this.selectAllOnMouseUp) return;
    this.selectAllOnMouseUp = false;
    event.preventDefault();
  }

  onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    const raw = element.value;
    const caret = element.selectionStart ?? raw.length;
    const stripped = stripPesoText(raw);

    let next: string;
    let nextCaret: number;
    if (isPesoDraft(stripped)) {
      next = stripped;
      nextCaret = stripPesoText(raw.slice(0, caret)).length;
    } else if (TYPED_INPUT.has((event as InputEvent).inputType)) {
      next = this.text();
      nextCaret = Math.max(0, caret - (raw.length - next.length));
    } else {
      next = normalizePesoText(raw);
      nextCaret = Math.min(normalizePesoText(raw.slice(0, caret)).length, next.length);
    }

    if (raw !== next) {
      element.value = next;
      element.setSelectionRange(nextCaret, nextCaret);
    }
    this.text.set(next);
    this.amount = parsePesoText(next);
    this.onChange(this.amount);
  }

  onBlur(): void {
    this.focused = false;
    this.selectAllOnMouseUp = false;
    this.text.set(formatPesoDisplay(this.amount));
    this.onTouched();
  }

  clear(): void {
    this.amount = null;
    this.text.set('');
    this.onChange(null);
    this.onTouched();
    this.focus();
  }
}
