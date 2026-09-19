import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as FilePond from 'filepond';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';

FilePond.registerPlugin(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize,
);

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

@Component({
  selector: 'app-image-dropzone',
  template: `<div class="image-dropzone"><input type="file" #pondInput /></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageDropzone {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentImageUrl = input<string | null>(null);
  readonly currentImageName = input('Current image');
  readonly idleHint = input<string>('PNG, JPG, or WebP, up to 5 MB');
  readonly imagePreviewHeight = input(160);

  readonly fileChange = output<File | null>();

  private readonly pondInput = viewChild.required<ElementRef<HTMLInputElement>>('pondInput');
  private pond: FilePond.FilePond | null = null;
  /**
   * FilePond emits `removefile` on a later tick, well after the call that asked
   * for it returned, so a plain "am I syncing right now" flag never covers the
   * event. Counting the removals we asked for does: anything beyond the count
   * is the user clicking the item's X, which is a real "drop the photo".
   */
  private ownRemovals = 0;
  private syncToken = 0;

  constructor() {
    afterNextRender(() => {
      this.pond = FilePond.create(this.pondInput().nativeElement, {
        allowMultiple: false,
        maxFiles: 1,
        acceptedFileTypes: ['image/png', 'image/jpeg', 'image/webp'],
        labelFileTypeNotAllowed: 'Use a PNG, JPG, or WebP image',
        fileValidateTypeLabelExpectedTypes: '',
        maxFileSize: '5MB',
        labelMaxFileSizeExceeded: 'Image is over 5 MB',
        labelMaxFileSize: 'Maximum size is {filesize}',
        labelIdle: `<span class="filepond--label-action">Browse</span> or drag an image here<br><span class="image-dropzone-hint">${this.idleHint()}</span>`,
        imagePreviewHeight: this.imagePreviewHeight(),
        credits: false,
        storeAsFile: true,
      });
      if (!this.pond) return;

      this.pond.on('addfile', (error, item) => {
        if (error) return;
        if (item.origin === FilePond.FileOrigin.INPUT) {
          this.fileChange.emit(item.file as File);
        }
      });
      this.pond.on('removefile', () => {
        if (this.ownRemovals > 0) {
          this.ownRemovals -= 1;
          return;
        }
        this.fileChange.emit(null);
      });

      this.syncCurrentImage(this.currentImageUrl());
    });

    effect(() => {
      const url = this.currentImageUrl();
      if (this.pond) this.syncCurrentImage(url);
    });

    this.destroyRef.onDestroy(() => {
      this.pond?.destroy();
      this.pond = null;
    });
  }

  reset(): void {
    this.syncCurrentImage(this.currentImageUrl());
  }

  private syncCurrentImage(url: string | null): void {
    const pond = this.pond;
    if (!pond) return;
    const token = ++this.syncToken;

    this.ownRemovals += pond.getFiles().length;
    void pond.removeFiles({ revert: false });
    if (!url) return;

    this.http
      .get(url, { responseType: 'blob' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          if (token !== this.syncToken || !this.pond) return;
          const type = EXTENSIONS[blob.type] ? blob.type : 'image/jpeg';
          const file = new File([blob], `${this.currentImageName()}.${EXTENSIONS[type]}`, { type });
          void this.pond.addFile(file, { type: 'local' }).catch(() => undefined);
        },
        error: () => undefined,
      });
  }
}
