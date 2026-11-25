import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

import { type KitMentionOption, MENTIONS_MAX } from '../../kit-mention.util';

export interface KitMentionRow {
  option: KitMentionOption;
  /** The muted label on the right: the unit, plus the property when that alone is ambiguous. */
  place: string;
  /** Everything a screen reader needs to tell two same-name tenants apart. */
  description: string;
}

/**
 * The floating list of tenants above Kit's message box. It only draws: the
 * composer owns the query, the active row and the keyboard, and keeps focus in
 * the text box (rows are picked on mousedown so the box never blurs).
 */
@Component({
  selector: 'app-kit-mention-picker',
  imports: [PIcon],
  templateUrl: './kit-mention-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitMentionPicker {
  readonly listId = input.required<string>();
  readonly options = input<KitMentionOption[]>([]);
  readonly activeIndex = input(0);
  readonly query = input('');
  readonly loading = input(false);
  readonly failed = input(false);
  readonly limitReached = input(false);

  readonly mentionsMax = MENTIONS_MAX;

  readonly picked = output<KitMentionOption>();
  readonly activated = output<number>();

  readonly rows = computed<KitMentionRow[]>(() => {
    const options = this.options();
    const unitCounts = new Map<string, number>();
    for (const option of options) {
      const key = `${option.name.toLowerCase()}|${unitLabel(option)}`;
      unitCounts.set(key, (unitCounts.get(key) ?? 0) + 1);
    }
    return options.map((option) => {
      const unit = unitLabel(option);
      const clashes = (unitCounts.get(`${option.name.toLowerCase()}|${unit}`) ?? 0) > 1;
      const place = clashes && option.propertyName ? `${unit} · ${option.propertyName}` : unit;
      const description = [option.name, unit, option.propertyName].filter(Boolean).join(', ');
      return { option, place, description };
    });
  });

  optionId(index: number): string {
    return `${this.listId()}-option-${index}`;
  }
}

function unitLabel(option: KitMentionOption): string {
  return option.unitNo ? `Unit ${option.unitNo}` : 'No unit';
}
