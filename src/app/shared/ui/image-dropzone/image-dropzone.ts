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

/** Filename extension per accepted type, so the preview item reads like a file. */
const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

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
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  /** Existing stored image (edit mode) — shown as a removable preview. */
  readonly currentImageUrl = input<string | null>(null);
  /** Name on the stored image's preview item; the URL is a UUID, not a label. */
  readonly currentImageName = input('Current image');
  /** Short helper under the drop label, e.g. "A top-down floor plan works best." */
  readonly idleHint = input<string>('PNG, JPG, or WebP, up to 5 MB');
  readonly imagePreviewHeight = input(160);

  /** New file picked (File) or selection cleared (null). */
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
  /** Drops a slow image load whose dialog has already moved to another record. */
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
    this.syncCurrentImage(this.currentImageUrl());
  }

  private syncCurrentImage(url: string | null): void {
    const pond = this.pond;
    if (!pond) return;
    const token = ++this.syncToken;

    this.ownRemovals += pond.getFiles().length;
    void pond.removeFiles({ revert: false });
    if (!url) return;

    /*
     * The stored image has to arrive as real bytes. FilePond's "mock file"
     * shortcut (name/size/type only) skips the load entirely, and the
     * image-preview plugin has nothing to draw from. That is why the edit
     * dialog used to show a black bar labelled "0 bytes" where the photo
     * should be. Fetching it gives the plugin a blob and the item its size.
     */
    this.http
      .get(url, { responseType: 'blob' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          if (token !== this.syncToken || !this.pond) return;
          // Storage can hand back application/octet-stream. The item is
          // display-only and is never re-uploaded, and the preview decodes the
          // bytes rather than the label, so claiming JPEG keeps the accepted-type
          // check from failing an image that is perfectly fine.
          const type = EXTENSIONS[blob.type] ? blob.type : 'image/jpeg';
          const file = new File([blob], `${this.currentImageName()}.${EXTENSIONS[type]}`, { type });
          // 'local' origin marks it as already-stored, so it never reads as a
          // fresh pick and never re-emits through fileChange.
          void this.pond.addFile(file, { type: 'local' }).catch(() => undefined);
        },
        // A stored image that will not load is not worth blocking the form
        // over: the dropzone just starts empty and a new upload still replaces it.
        error: () => undefined,
      });
  }
}
