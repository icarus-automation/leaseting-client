import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import type { KitSource } from '../../kit-chat.types';
import { parseMarkdown } from '../../kit-markdown.util';
import { KitMarkdown } from './kit-markdown';

const SOURCE: KitSource = {
  kind: 'docs',
  title: 'Bill utilities from meter readings',
  section: 'Bill a whole property this month',
  url: 'https://docs.leaseting.com/billing/utility-bills#monthly-run',
};

describe('KitMarkdown', () => {
  async function paragraphOf(text: string, sources: KitSource[] = []): Promise<HTMLParagraphElement | null> {
    await TestBed.configureTestingModule({
      imports: [KitMarkdown],
      providers: [provideRouter([]), { provide: AuthService, useValue: { can: () => true } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(KitMarkdown);
    fixture.componentRef.setInput('blocks', parseMarkdown(text, sources));
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('p');
  }

  it('sets punctuation right after bold text, with no space the template added', async () => {
    const paragraph = await paragraphOf('Go to **Bills**, open **Billing tools** and choose **Utility run**.');
    expect(paragraph?.textContent).toBe('Go to Bills, open Billing tools and choose Utility run.');
  });

  it('draws one chip where a sentence cites its source', async () => {
    const paragraph = await paragraphOf('Choose **Utility run**.[1] Then type the readings.', [SOURCE]);
    expect(paragraph?.querySelectorAll('app-kit-source-chip')).toHaveLength(1);
    expect(paragraph?.textContent?.startsWith(`Choose Utility run.${SOURCE.title}`)).toBe(true);
    expect(paragraph?.textContent?.endsWith(' Then type the readings.')).toBe(true);
  });
});
