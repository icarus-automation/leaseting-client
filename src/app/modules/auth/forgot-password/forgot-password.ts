import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import { AuthShell } from '../auth-shell/auth-shell';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, PIcon, AuthShell],
  templateUrl: './forgot-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {}
