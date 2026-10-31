import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { PropertyFloorItem } from '../../../../core/models/property.types';
import { FloorTabs } from './floor-tabs';

const floor = (level: number): PropertyFloorItem => ({
  id: `floor-${level}`,
  level,
  name: null,
  planImageUrl: null,
  planThumbUrl: null,
});

describe('FloorTabs keyboard', () => {
  let fixture: ComponentFixture<FloorTabs>;

  beforeEach(async () => {
    // jsdom has no ResizeObserver or scrollIntoView; the component only uses them to scroll the strip.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      disconnect(): void {}
      unobserve(): void {}
    } as unknown as typeof ResizeObserver;
    Element.prototype.scrollIntoView ??= function scrollIntoView(): void {};

    fixture = TestBed.createComponent(FloorTabs);
    fixture.componentRef.setInput('floors', [floor(1), floor(2), floor(3)]);
    fixture.componentRef.setInput('selectedFloorId', 'floor-1');
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    fixture.destroy();
  });

  const tabs = () => [...fixture.nativeElement.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];
  const press = (key: string) =>
    (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  const focusedLabel = () => (document.activeElement as HTMLElement).textContent?.trim();

  it('moves focus between the floor tabs with the arrow, Home and End keys', () => {
    tabs()[0].focus();

    press('ArrowRight');
    expect(focusedLabel()).toBe('Floor 2');
    press('End');
    expect(focusedLabel()).toBe('Floor 3');
    press('ArrowRight');
    expect(focusedLabel()).toBe('Floor 1');
    press('ArrowLeft');
    expect(focusedLabel()).toBe('Floor 3');
    press('Home');
    expect(focusedLabel()).toBe('Floor 1');
  });

  it('hides the add-floor button from a role that cannot manage properties', async () => {
    const addFloor = () =>
      [...fixture.nativeElement.querySelectorAll('button')].some(
        (button: HTMLButtonElement) => button.textContent?.trim() === 'Floor',
      );

    expect(addFloor()).toBe(true);
    fixture.componentRef.setInput('canAddFloor', false);
    await fixture.whenStable();
    expect(addFloor()).toBe(false);
  });
});
