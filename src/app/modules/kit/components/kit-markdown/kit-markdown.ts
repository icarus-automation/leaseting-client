import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import type { MarkdownBlock } from '../../kit-markdown.util';
import { KitSourceChip } from '../kit-source-chip/kit-source-chip';

@Component({
  selector: 'app-kit-markdown',
  imports: [NgTemplateOutlet, KitSourceChip],
  templateUrl: './kit-markdown.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitMarkdown {
  readonly blocks = input.required<MarkdownBlock[]>();
}
