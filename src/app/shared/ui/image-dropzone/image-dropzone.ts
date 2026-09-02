import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, output, viewChild } from '@angular/core';
import * as FilePond from 'filepond';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';

FilePond.registerPlugin(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize,
);

/**
 * Single-image picker built on FilePond: drag & drop, paste, browse, inline
 * image preview, and type/size validation with human error messages. Emits the
 * chosen File (or null when cleared) — uploading stays the caller's job, so
 * this works with the multipart create/update endpoints unchanged.
 *
 * `currentImageUrl` renders the already-stored image as a preview item, which
 * makes "replace the photo" an actual visible flow in edit mode.
 */
@Component({
  selector: 'app-image-dropzone',
  template: `<div class="image-dropzone"><input type="file" #pondInput /></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageDropzone {
  private readonly destroyRef = inject(DestroyRef);

  /** Existing stored image (edit mode) — shown as a removable preview. */
  readonly currentImageUrl = input<string | null>(null);
  /** Short helper under the drop label, e.g. "A top-down floor plan works best." */
  readonly idleHint = input<string>('PNG, JPG, or WebP, up to 5 MB');
  readonly imagePreviewHeight = input(160);

  /** New file picked (File) or selection cleared (null). */
  readonly fileChange = output<File | null>();

  private readonly pondInput = viewChild.required<ElementRef<HTMLInputElement>>('pondInput');
  private pond: FilePond.FilePond | null = null;
  /** Guards event handlers while we programmatically reset the pond. */
  private syncing = false;

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
        if (this.syncing || error) return;
        if (item.origin === FilePond.FileOrigin.INPUT) {
          this.fileChange.emit(item.file as File);
        }
      });
      this.pond.on('removefile', () => {
        if (this.syncing) return;
        this.fileChange.emit(null);
      });

      this.syncCurrentImage(this.currentImageUrl());
    });

    // Re-seed when the drawer switches target (create ↔ edit, or new entity).
    effect(() => {
      const url = this.currentImageUrl();
      if (this.pond) this.syncCurrentImage(url);
    });

    this.destroyRef.onDestroy(() => {
      this.pond?.destroy();
      this.pond = null;
    });
  }

  /** Clears any picked file (used by parents when the form resets). */
  reset(): void {
    if (!this.pond) return;
    this.syncing = true;
    void this.pond.removeFiles({ revert: false });
    this.syncCurrentImage(this.currentImageUrl());
    this.syncing = false;
  }

  private syncCurrentImage(url: string | null): void {
    if (!this.pond) return;
    this.syncing = true;
    void this.pond.removeFiles({ revert: false });
    if (url) {
      // Documented FilePond "mock file" pattern: providing `file` info skips
      // any fetch, and the image-preview plugin renders `metadata.poster`.
      void this.pond
        .addFile(url, {
          type: 'local',
          file: { name: 'current image', size: 0, type: 'image/jpeg' },
          metadata: { poster: url },
        } as never)
        .catch(() => undefined);
    }
    this.syncing = false;
  }
}
