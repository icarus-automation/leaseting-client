import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import type { Permission } from '../../../../core/auth/permissions';
import { GENERATE_ITEMS, GenerateMenu, type GenerateAction } from './generate-menu';

describe('GenerateMenu', () => {
  let fixture: ComponentFixture<GenerateMenu>;
  const held = signal<Permission[] | null>(null);

  beforeEach(async () => {
    held.set(null);
    await TestBed.configureTestingModule({
      imports: [GenerateMenu],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { can: (code: Permission) => held()?.includes(code) ?? true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GenerateMenu);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('lists Utility run, Rent bills, Association dues and Statement of account under one Generate button', () => {
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.textContent?.trim()).toBe('Generate');
    expect(fixture.componentInstance.items().map((item) => item.label)).toEqual([
      'Utility run',
      'Rent bills',
      'Association dues',
      'Statement of account',
    ]);
  });

  it('gives every item its own icon, so rent and dues never look alike', () => {
    const icons = GENERATE_ITEMS.map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('opens the utility run page and hands the other three back to the Bills page', () => {
    const items = fixture.componentInstance.items();
    expect(items[0].routerLink).toBe('/bills/utility-run');

    const asked: GenerateAction[] = [];
    fixture.componentInstance.generate.subscribe((action) => asked.push(action));
    for (const item of items.slice(1)) item.command?.({});

    expect(asked).toEqual(['rent', 'dues', 'soa']);
  });

  it('shows only what the role can do, and nothing at all without either permission', () => {
    held.set(['soa:manage']);
    fixture.detectChanges();
    expect(fixture.componentInstance.items().map((item) => item.label)).toEqual(['Statement of account']);

    held.set([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });
});
