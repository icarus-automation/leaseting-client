import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import { AuthLayout } from '../auth-layout/auth-layout';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, PIcon, AuthLayout],
  templateUrl: './forgot-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {}
