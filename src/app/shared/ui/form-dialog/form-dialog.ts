import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { PIcon } from '@primeicons/angular/p-icon';

import { ConfirmService } from '../confirm/confirm.service';

/**
 * Centered modal used for all create/edit forms. Forms are short (2–6 fields)
 * and entered repeatedly by staff, so the dialog lands at eye-line, autofocuses
 * its first field, and submits on Enter (native form behavior — footer submit
 * buttons carry the form="..." attribute). Closing is always routed through
 * requestClose(): a dirty form asks before discarding, which is why the
 * built-in close paths (X, Esc, mask click) are disabled and re-implemented.
 *
 * Project form content directly; project footer actions with the
 * `dialog-footer` attribute.
 */
@Component({
  selector: 'app-form-dialog',
  imports: [Dialog, PIcon],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [blockScroll]="true"
      [closable]="false"
      [closeOnEscape]="false"
      [dismissableMask]="false"
      [focusOnShow]="false"
      [showHeader]="false"
      appendTo="body"
      [style]="{ width: width() }"
      styleClass="app-form-dialog !max-w-[calc(100vw-2rem)]"
    >
      <!-- Header rendered in content: PrimeNG 21.2 drops the #header template
           (no heading, no close button), so the dialog owns its own header.
           Ref is NOT named #content/#header/#footer — p-dialog content-queries
           those names and would treat the div as a TemplateRef. -->
      <div #dialogBody class="flex flex-col" (keydown.escape)="requestClose()">
        <div class="flex w-full items-start justify-between gap-3 pb-3">
          <div class="flex flex-col gap-0.5">
            <h2
              #dialogHeading
              [attr.id]="headingId()"
              tabindex="-1"
              class="font-heading text-lg font-semibold leading-tight text-heading"
            >
              {{ heading() }}
            </h2>
            @if (subheading(); as sub) {
              <p class="text-[13px] font-normal text-muted">{{ sub }}</p>
            }
          </div>
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-base border-none bg-transparent text-muted transition-colors duration-150 ease-out hover:bg-surface hover:text-body motion-reduce:transition-none"
            aria-label="Close"
            (click)="requestClose()"
          >
            <svg pIcon="times" [size]="14" aria-hidden="true"></svg>
          </button>
        </div>
        <div class="pb-4">
          <ng-content />
        </div>
        <div class="-mx-[1.125rem] flex shrink-0 items-center justify-end gap-2 border-t border-border px-[1.125rem] pt-4">
          <ng-content select="[dialog-footer]" />
        </div>
      </div>
    </p-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormDialog {
  private readonly confirm = inject(ConfirmService);

  readonly visible = model.required<boolean>();
  readonly heading = input.required<string>();
  readonly subheading = input<string | null>(null);
  readonly width = input('30rem');
  /** Bind the form's dirty state — a dirty dialog confirms before closing. */
  readonly dirty = input(false);

  private readonly content = viewChild<ElementRef<HTMLElement>>('dialogBody');
  private readonly headingElement = viewChild<ElementRef<HTMLElement>>('dialogHeading');
  private readonly dialog = viewChild(Dialog);

  /**
   * p-dialog points aria-labelledby at a title span it only renders with its
   * own header, which this component turns off. Giving our h2 that id is what
   * names the dialog for assistive tech.
   */
  readonly headingId = computed(() => this.dialog()?.ariaLabelledBy ?? null);

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      this.focusFirstField();
    });
  }

  /**
   * Focus the first form field once the dialog content has mounted. PrimeNG's
   * focusOnShow is off — it would land on the close button instead. Public so
   * "Save & add another" flows can send focus back for the next entry.
   */
  focusFirstField(): void {
    setTimeout(() => {
      const field = this.content()?.nativeElement.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select, textarea, [autofocus]',
      );
      // A dialog with nothing to fill in starts at its title, so focus is inside
      // the dialog without scrolling to the footer buttons.
      (field ?? this.headingElement()?.nativeElement)?.focus();
    });
  }

  requestClose(): void {
    if (!this.dirty()) {
      this.visible.set(false);
      return;
    }
    this.confirm.danger({
      header: 'Discard changes?',
      message: 'You have unsaved edits. Closing will throw them away.',
      acceptLabel: 'Discard',
      rejectLabel: 'Keep editing',
      onAccept: () => this.visible.set(false),
    });
  }
}
