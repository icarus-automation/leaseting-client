import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

interface GuideSection {
  id: string;
  label: string;
}

interface Faq {
  q: string;
  a: string;
}

@Component({
  selector: 'app-utility-billing-guide',
  imports: [RouterLink, PIcon],
  templateUrl: './utility-billing.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtilityBillingGuide {
  private readonly document = inject(DOCUMENT);

  /** In-page table of contents — order matches the sections below. */
  readonly sections: GuideSection[] = [
    { id: 'overview', label: 'What it does' },
    { id: 'dates', label: 'The three dates' },
    { id: 'readings', label: 'Readings & carry-over' },
    { id: 'rates', label: 'Two ways to price it' },
    { id: 'extras', label: 'Admin fee, VAT & tax' },
    { id: 'monthly-run', label: 'Bill a whole property' },
    { id: 'single-bill', label: 'Bill one unit' },
    { id: 'faq', label: 'Questions & fixes' },
  ];

  /** Numbered walkthrough of the billing-run page (light markup allowed). */
  readonly runSteps: string[] = [
    'Pick the <strong class="font-medium text-heading">property</strong> and the <strong class="font-medium text-heading">utility</strong> (Electricity or Water). The units and their carried-over previous readings load on their own.',
    'Set the <strong class="font-medium text-heading">rate</strong> — the provider\'s total bill for the building, or a fixed price per unit if you know it. The app shows the working rate as you type.',
    'Type each unit\'s <strong class="font-medium text-heading">present reading</strong>. Consumed and amount update live beside every row.',
    'Leave the <strong class="font-medium text-heading">dates</strong> alone — they\'re filled in for you — unless you need to adjust the period.',
    'Check the <strong class="font-medium text-heading">total</strong> and how many units will be billed at the bottom.',
    'Hit <strong class="font-medium text-heading">Create bills</strong>. Every bill is made at once, each due on its tenant\'s own due day.',
  ];

  readonly faqs: Faq[] = [
    {
      q: 'A row says "skipped" — why?',
      a: 'Its present reading is blank, or that unit was already billed for this month. Skipped rows are never charged — type a present reading to include it.',
    },
    {
      q: 'It warns "below previous".',
      a: 'The present reading is smaller than the previous one, and a meter can\'t count down. Re-check the figure — it\'s almost always a typo.',
    },
    {
      q: 'The previous reading shows 0.',
      a: 'There\'s no earlier bill to carry from, so this is the first time the unit is billed for this utility. Enter the real previous reading once; next month it carries over on its own.',
    },
    {
      q: 'I ran the same month twice by accident.',
      a: 'No harm done. Units already billed are skipped, so nobody is charged twice.',
    },
    {
      q: 'I deleted an auto-generated bill and it came back.',
      a: 'The system re-creates missing bills. To cancel a charge, don\'t delete it — set its amount to zero (or record a waiver) instead.',
    },
    {
      q: 'Do tenants get reminded to pay?',
      a: 'Yes. When SMS is set up, tenants are texted before the due date and again if it lapses — automatically, with no action from you.',
    },
    {
      q: 'How accurate is the photo scan?',
      a: 'It\'s a helper, not the source of truth. It fills fields from the receipt to save typing; always verify the numbers before you save.',
    },
  ];

  scrollTo(id: string): void {
    this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
