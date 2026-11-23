import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { parseNoticeBody } from '../../utils/notice-format.util';

/** A privacy notice's text, laid out from its headings, list items, and paragraphs. */
@Component({
  selector: 'app-notice-body',
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-3 text-[13.5px] leading-relaxed text-body">
      @for (block of blocks(); track $index) {
        @switch (block.kind) {
          @case ('heading') {
            <h2 class="mt-2 font-heading text-[15px] font-semibold text-heading first:mt-0">{{ block.text }}</h2>
          }
          @case ('list') {
            <ul class="m-0 flex list-disc flex-col gap-1 pl-5">
              @for (item of block.items; track $index) {
                <li>{{ item }}</li>
              }
            </ul>
          }
          @default {
            <p class="m-0">{{ block.text }}</p>
          }
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticeBody {
  readonly body = input.required<string>();

  readonly blocks = computed(() => parseNoticeBody(this.body()));
}
