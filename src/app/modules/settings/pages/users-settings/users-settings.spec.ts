import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersSettingsPage } from './users-settings';

@Component({ selector: 'app-settings-page-shell', template: '<ng-content />' })
class SettingsPageShellStub {
  readonly section = input('');
}

@Component({ selector: 'app-team-members', template: 'People' })
class TeamMembersStub {}

describe('UsersSettingsPage', () => {
  let fixture: ComponentFixture<UsersSettingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UsersSettingsPage] })
      .overrideComponent(UsersSettingsPage, { set: { imports: [SettingsPageShellStub, TeamMembersStub] } })
      .compileComponents();

    fixture = TestBed.createComponent(UsersSettingsPage);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders people and has no audit log tab', () => {
    const text = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
    expect(fixture.nativeElement.querySelector('app-team-members')).not.toBeNull();
    expect(text).toContain('People');
    expect(text).not.toContain('Audit log');
    expect(fixture.nativeElement.querySelector('[role="tablist"]')).toBeNull();
  });
});
