import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import type { MarkdownBlock } from '../../kit-markdown.util';

/**
 * Draws a parsed Kit reply.
 *
 * Takes blocks, not a string: the parsing happens once in the view model, and
 * this only maps tokens onto elements. That split is what keeps `innerHTML`
 * out of the picture entirely — there is no point in this file where model
 * output could become markup.
 *
 * The span template is shared by all three block kinds through
 * `ngTemplateOutlet`. Inlining it three times was the obvious first draft and
 * meant a change to how inline code looks had to be made in three places.
 */
@Component({
  selector: 'app-kit-markdown',
  imports: [NgTemplateOutlet],
  templateUrl: './kit-markdown.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitMarkdown {
  readonly blocks = input.required<MarkdownBlock[]>();
}
