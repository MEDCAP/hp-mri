/**
 * Shared layout constants for sidebar-dependent content margins.
 *
 * Pages that sit beside the permanent {@link Sidebar} offset their content by
 * these amounts so it clears the sidebar in its open vs. collapsed states.
 * Single-sourced here so the values stay in sync across pages.
 */

/** Left margin for page content when the sidebar is expanded. */
export const SIDEBAR_OPEN_CONTENT_MARGIN = '260px';

/** Left margin for page content when the sidebar is collapsed. */
export const SIDEBAR_CLOSED_CONTENT_MARGIN = '80px';

/**
 * Extra left offset added by centered single-card pages (e.g. UploadPage) on
 * top of the sidebar margin so the card visually centers in the remaining space.
 */
export const CENTERED_CONTENT_EXTRA_MARGIN = 260;
