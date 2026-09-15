import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';

import { ConfirmService } from './confirm.service';

@Component({ imports: [ConfirmDialog], template: '<p-confirmdialog />' })
class Host {}

function open(run: (confirm: ConfirmService) => void): HTMLElement {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  run(TestBed.inject(ConfirmService));
  fixture.detectChanges();
  const dialog = document.querySelector<HTMLElement>('.p-confirmdialog');
  expect(dialog).not.toBeNull();
  return dialog as HTMLElement;
}

describe('ConfirmService', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [ConfirmationService],
    }).compileComponents();
  });

  it('renders the heading, message, and both buttons', () => {
    const dialog = open((confirm) =>
      confirm.danger({
        header: 'Delete bill',
        message: 'Delete the unpaid Rent bill?',
        acceptLabel: 'Delete',
        onAccept: () => undefined,
      }),
    );

    expect(dialog.querySelector('.p-dialog-title')?.textContent).toContain('Delete bill');
    expect(dialog.querySelector('.p-confirmdialog-message')?.textContent).toContain(
      'Delete the unpaid Rent bill?',
    );
    expect(dialog.querySelector('.p-confirmdialog-accept-button')?.textContent).toContain('Delete');
    expect(dialog.querySelector('.p-confirmdialog-reject-button')?.textContent).toContain('Cancel');
  });

  /*
   * The icon slot is a blank 2rem box in this app: icons are SVG components and
   * the primeicons font is never loaded. It used to shrink to a different width
   * in every dialog, indenting each message by a different amount. No confirm
   * may pass one again.
   */
  it('never renders the empty icon slot that knocked messages out of line', () => {
    const dialog = open((confirm) =>
      confirm.danger({
        header: 'Archive tenant',
        message: 'Archive Lauren Tan?',
        acceptLabel: 'Archive',
        onAccept: () => undefined,
      }),
    );

    expect(dialog.querySelector('.p-confirmdialog-icon')).toBeNull();
  });

  it('runs the accept handler when the accept button is clicked', () => {
    let accepted = false;
    const dialog = open((confirm) =>
      confirm.proceed({
        header: 'Send payment reminder',
        message: 'Text Ana Cruz about their oldest unpaid bill?',
        acceptLabel: 'Send now',
        rejectLabel: 'Not now',
        onAccept: () => {
          accepted = true;
        },
      }),
    );

    expect(dialog.querySelector('.p-confirmdialog-reject-button')?.textContent).toContain('Not now');
    dialog.querySelector<HTMLButtonElement>('.p-confirmdialog-accept-button')?.click();
    expect(accepted).toBe(true);
  });
});
