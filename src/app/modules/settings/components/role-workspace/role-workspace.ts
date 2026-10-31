import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { combineLatest, map, of, switchMap } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { AccessCatalogService } from '../../services/access-catalog.service';
import { RolesService } from '../../services/roles.service';
import {
  type CatalogIndex,
  type PermissionPick,
  type RoleDraft,
  heldCodes,
  indexCatalog,
  openDraft,
  projectPicker,
  toggleGroup,
  togglePermission,
  writePayload,
} from '../../utils/role-access.util';

type WorkspaceState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; draft: RoleDraft; index: CatalogIndex };

@Component({
  selector: 'app-role-workspace',
  imports: [ReactiveFormsModule, PIcon, ErrorBanner, Skeleton],
  templateUrl: './role-workspace.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleWorkspace {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly rolesApi = inject(RolesService);
  private readonly catalogApi = inject(AccessCatalogService);
  private readonly confirm = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);
  private requestGeneration = 0;

  readonly state = signal<WorkspaceState>({ kind: 'loading' });
  readonly pick = signal<PermissionPick>({ selected: new Set(), unknown: [] });
  readonly permissionQuery = signal('');
  readonly saveError = signal<string | null>(null);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(200)]],
  });

  readonly canManage = computed(() => this.auth.can('roles:manage'));
  private readonly held = computed(() => heldCodes(this.auth.currentUser()));

  readonly writable = computed(() => {
    const current = this.state();
    return current.kind === 'ready' && current.draft.intent !== 'view';
  });

  readonly readOnlyNote = computed(() => {
    const current = this.state();
    if (current.kind !== 'ready' || current.draft.intent !== 'view') return null;
    return current.draft.role.isLocked
      ? "System · Locked. You can look at this role, and you can't change it."
      : "You can look at this role. You can't change it.";
  });

  readonly picker = computed(() => {
    const current = this.state();
    if (current.kind !== 'ready') return null;
    return projectPicker(current.index, this.pick(), this.held(), this.permissionQuery(), this.writable());
  });

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  load(): void {
    const generation = ++this.requestGeneration;
    const roleId = this.route.snapshot.paramMap.get('roleId');
    const from = this.route.snapshot.queryParamMap.get('from');

    if (!roleId && !this.canManage()) {
      void this.router.navigate(['/settings/roles']);
      return;
    }

    this.state.set({ kind: 'loading' });
    this.saveError.set(null);
    this.permissionQuery.set('');

    this.catalogApi
      .catalog()
      .pipe(
        switchMap((catalog) => {
          const id = from ?? roleId;
          return id
            ? this.rolesApi.get(id).pipe(map((role) => ({ catalog, role, from: Boolean(from) })))
            : of({ catalog, role: null, from: false });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ catalog, role, from: isCopy }) => {
          if (generation !== this.requestGeneration) return;
          const index = indexCatalog(catalog);
          const request = role
            ? isCopy
              ? { kind: 'copy' as const, role }
              : { kind: 'open' as const, role }
            : { kind: 'new' as const };
          const opened = openDraft(request, index, this.canManage());
          if (!opened.ok) {
            this.state.set({ kind: 'error', message: opened.message });
            return;
          }
          this.form.reset({ name: opened.draft.seed.name, description: opened.draft.seed.description });
          if (opened.draft.intent === 'view') this.form.disable({ emitEvent: false });
          else this.form.enable({ emitEvent: false });
          this.pick.set(opened.draft.seed.pick);
          this.state.set({ kind: 'ready', draft: opened.draft, index });
        },
        error: (error: unknown) => {
          if (generation !== this.requestGeneration) return;
          this.state.set({
            kind: 'error',
            message: apiErrorMessage(
              error,
              roleId || from ? 'Could not load this role.' : 'Could not load the permission list.',
            ),
          });
        },
      });
  }

  setPermissionQuery(query: string): void {
    this.permissionQuery.set(query);
  }

  onPermissionSearch(event: Event): void {
    this.setPermissionQuery((event.target as HTMLInputElement).value);
  }

  onTogglePermission(code: string): void {
    const current = this.state();
    if (current.kind !== 'ready' || current.draft.intent === 'view') return;
    this.pick.set(togglePermission(this.pick(), code, current.index, this.held()));
  }

  onToggleGroup(groupId: string): void {
    const current = this.state();
    if (current.kind !== 'ready' || current.draft.intent === 'view') return;
    this.pick.set(toggleGroup(this.pick(), groupId, current.index, this.held(), this.permissionQuery()));
  }

  save(): void {
    const current = this.state();
    if (current.kind !== 'ready' || current.draft.intent === 'view' || this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveError.set('Enter a name between 2 and 50 characters.');
      return;
    }

    const body = writePayload(this.form.getRawValue(), this.pick(), current.index);
    this.saving.set(true);
    this.saveError.set(null);
    const saved$ =
      current.draft.intent === 'edit' ? this.rolesApi.update(current.draft.roleId, body) : this.rolesApi.create(body);
    saved$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (role) => {
        this.saving.set(false);
        if (this.auth.currentUser()?.organizationRole === role.id) {
          this.auth.refreshMe().subscribe({ error: () => undefined });
        }
        void this.router.navigate(['/settings/roles']);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveError.set(apiErrorMessage(error, 'Could not save this role.'));
      },
    });
  }

  requestBack(): void {
    if (!this.isDirty()) {
      void this.router.navigate(['/settings/roles']);
      return;
    }
    this.confirm.danger({
      header: 'Discard changes?',
      message: 'You have unsaved edits. Closing will throw them away.',
      acceptLabel: 'Discard',
      rejectLabel: 'Keep editing',
      onAccept: () => void this.router.navigate(['/settings/roles']),
    });
  }

  private isDirty(): boolean {
    const current = this.state();
    if (current.kind !== 'ready') return false;
    if (this.form.dirty) return true;
    const seed = current.draft.seed.pick.selected;
    const selected = this.pick().selected;
    if (seed.size !== selected.size) return true;
    for (const code of selected) {
      if (!seed.has(code)) return true;
    }
    return false;
  }
}
