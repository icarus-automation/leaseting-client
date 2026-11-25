import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import type { KitMentionOption } from '../../kit-mention.util';
import { serializeDraft } from '../../kit-mention.util';
import { KitChatService } from '../../services/kit-chat.service';
import { KitComposer } from './kit-composer';

const BRICKSTONE_MARIA: KitMentionOption = {
  id: '5f0e8a52-3c1d-4b7a-9e21-6d4c8b0f1a23',
  name: 'Maria Santos',
  unitNo: '102',
  propertyName: 'Brickstone Boarding House',
};
const LAKEVIEW_MARIA: KitMentionOption = {
  id: 'c3a9d7e1-8b42-4f6c-a0d5-2e7b9c1f4a86',
  name: 'Maria Santos',
  unitNo: 'A1',
  propertyName: 'Lakeview Residences',
};

describe('KitComposer mentions', () => {
  const api = { searchResidents: vi.fn() };
  let fixture: ComponentFixture<KitComposer>;
  let composer: KitComposer;

  beforeEach(async () => {
    vi.useFakeTimers();
    api.searchResidents.mockReturnValue(of([BRICKSTONE_MARIA, LAKEVIEW_MARIA]));
    await TestBed.configureTestingModule({
      imports: [KitComposer],
      providers: [{ provide: KitChatService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(KitComposer);
    composer = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const field = () => fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
  const options = () => [...fixture.nativeElement.querySelectorAll('[role="option"]')] as HTMLElement[];

  /** Types `text` as the box's whole value, with the caret at its end, and lets the search settle. */
  function type(text: string): void {
    const box = field();
    box.value = text;
    box.setSelectionRange(text.length, text.length);
    box.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(200);
    fixture.detectChanges();
  }

  function press(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, cancelable: true });
    field().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  it('opens a list above the box on @ and filters it by what follows', () => {
    type('Create a notice for @mar');

    expect(api.searchResidents).toHaveBeenCalledWith('mar');
    const rows = options().map((option) =>
      [...option.querySelectorAll('span')].map((part) => part.textContent?.trim()).filter(Boolean),
    );
    expect(rows).toEqual([
      ['Maria Santos', 'Unit 102'],
      ['Maria Santos', 'Unit A1'],
    ]);
    expect(options()[0].getAttribute('aria-label')).toBe('Maria Santos, Unit 102, Brickstone Boarding House');
    expect(field().getAttribute('aria-activedescendant')).toBe('kit-mention-list-option-0');
  });

  it('picks with the arrow keys and Enter, and does not send', () => {
    const submitted = vi.fn();
    composer.submitted.subscribe(submitted);
    type('Create a notice for @mar');

    press('ArrowDown');
    const enter = press('Enter');

    expect(enter.defaultPrevented).toBe(true);
    expect(submitted).not.toHaveBeenCalled();
    expect(composer.draft()).toBe('Create a notice for @Maria Santos ');
    expect(serializeDraft({ text: composer.draft(), mentions: composer.mentions() }).mentions).toEqual([
      LAKEVIEW_MARIA.id,
    ]);
    expect(options()).toHaveLength(0);
  });

  it('picks with a click without taking focus from the box', () => {
    type('@mar');

    const mousedown = new MouseEvent('mousedown', { cancelable: true });
    options()[0].dispatchEvent(mousedown);
    fixture.detectChanges();

    expect(mousedown.defaultPrevented).toBe(true);
    expect(composer.mentions()).toEqual([
      { residentId: BRICKSTONE_MARIA.id, name: 'Maria Santos', start: 0, end: 13 },
    ]);
  });

  it('draws a picked tenant as a chip in the box', () => {
    type('@mar');
    press('Enter');

    const chip = fixture.nativeElement.querySelector('[aria-hidden="true"] span.text-primary') as HTMLElement;
    expect(chip.textContent).toBe('@Maria Santos');
  });

  it('updates the box and its caret at once, so the next key edits the new text', () => {
    type('Create a notice for @mar');
    const box = field();
    // No render in between: the very next key must already see the pick.
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    const backspace = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
    expect(box.value).toBe('Create a notice for @Maria Santos ');
    expect(box.selectionStart).toBe(box.value.length);

    box.dispatchEvent(backspace);
    expect(backspace.defaultPrevented).toBe(false);
    box.value = box.value.slice(0, -1);
    box.setSelectionRange(box.value.length, box.value.length);
    box.dispatchEvent(new Event('input'));
    const second = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
    box.dispatchEvent(second);

    expect(second.defaultPrevented).toBe(true);
    expect(composer.draft()).toBe('Create a notice for ');
    expect(box.value).toBe('Create a notice for ');
    expect(composer.mentions()).toEqual([]);
  });

  it('removes a chip whole on Backspace', () => {
    type('@mar');
    press('Enter');
    const box = field();
    box.value = composer.draft();
    box.setSelectionRange(13, 13);

    const backspace = press('Backspace');

    expect(backspace.defaultPrevented).toBe(true);
    expect(composer.draft()).toBe(' ');
    expect(composer.mentions()).toEqual([]);
  });

  it('closes the list on Escape and keeps it closed for that @', () => {
    type('@mar');
    press('Escape');
    expect(options()).toHaveLength(0);

    type('@mari');
    expect(options()).toHaveLength(0);
  });

  it('sends on Enter when the list is closed', () => {
    const submitted = vi.fn();
    composer.submitted.subscribe(submitted);
    type('Who owes me money?');

    press('Enter');

    expect(submitted).toHaveBeenCalledTimes(1);
  });

  it('says so when no tenant matches', () => {
    api.searchResidents.mockReturnValue(of([]));
    type('@zzz');

    expect(options()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No active tenants match “zzz”.');
  });

  it('tells a failed search apart from no matches, and recovers on the next keystroke', () => {
    api.searchResidents.mockReturnValue(throwError(() => new Error('offline')));
    type('@mar');

    expect(options()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Tenants could not be loaded just now.');
    expect(fixture.nativeElement.textContent).not.toContain('No active tenants');

    api.searchResidents.mockReturnValue(of([LAKEVIEW_MARIA]));
    type('@mari');
    expect(options()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain('could not be loaded');
  });

  it('never opens on an email address', () => {
    type('Send it to maria@example.com');
    expect(api.searchResidents).not.toHaveBeenCalled();
  });
});
