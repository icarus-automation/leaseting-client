import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import type { MarkdownBlock } from '../../kit-markdown.util';

@Component({
  selector: 'app-kit-markdown',
  imports: [NgTemplateOutlet],
  templateUrl: './kit-markdown.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitMarkdown {
  readonly blocks = input.required<MarkdownBlock[]>();
}
