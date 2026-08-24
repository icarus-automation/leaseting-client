/**
 * Shared floor-plan geometry. The viewer, the Konva map editor and the upload
 * cropper all read from here so a plan is framed identically wherever it
 * appears.
 */

/**
 * The ratio new plans are cropped to on upload. 16:9 matches the shape of the
 * space the plan gets — a wide column beside the unit panel — so a cropped
 * plan fills the frame instead of leaving bars down the sides.
 *
 * The viewer does not assume it: it takes each image's own ratio, so plans
 * uploaded before cropping existed still render whole.
 */
export const FLOOR_PLAN_ASPECT = 16 / 9;

/**
 * Vertical space above the plan: app header, breadcrumb, property header and
 * the floor toolbar. Subtracted from the viewport to get the plan's height
 * budget, which is what keeps the whole floor on screen without scrolling.
 */
export const PLAN_VIEWPORT_RESERVE_PX = 260;

/** Below this a plan is unreadable; better to overflow slightly than shrink further. */
export const PLAN_MIN_HEIGHT_PX = 320;
