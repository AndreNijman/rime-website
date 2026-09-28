// ─── ThemeSet (web) ──────────────────────────────────────────────────────────
// rime-shell's theme/ThemeSet.qml token table, as a function of one scale
// factor, with SettingsService.qml's shipped defaults. The website draws its
// frame and surfaces with these, so a notch here is a Rime notch to the pixel
// at scale 1 (the Shell's calibrated 1080p baseline).
//
//   borderWidth 6 · cornerRadius 17 · notchRadius 15 · notchHeight 40
//   (SettingsService.qml:23-26), dashboard 900 × 520 (:66, :113),
//   notificationsWidth 400 (:67), networkPopupWidth 480 (ThemeSet.qml).
// ─────────────────────────────────────────────────────────────────────────────
export const SETTINGS_DEFAULTS = {
  cornerRadius: 17, borderWidth: 6, notchRadius: 15, notchHeight: 40,
  dashboardWidth: 900, dashboardHeight: 520, notificationsWidth: 400,
};

/** @param {number} [scale] */
export function themeSet(scale = 1, s = SETTINGS_DEFAULTS) {
  /** @param {number} v */
  const px = (v) => Math.round(v * scale);
  const borderWidth = px(s.borderWidth);
  const cornerRadius = px(s.cornerRadius);
  const notchRadius = px(s.notchRadius);
  const notchHeight = px(s.notchHeight);
  return {
    scale, px, borderWidth, cornerRadius, notchRadius, notchHeight,
    notchShoulder: notchRadius,
    // ThemeSet.qml: capped so the notch's side keeps a straight run.
    notchBottom: Math.max(0, Math.min(notchRadius + px(2), Math.floor((notchHeight - borderWidth - px(6)) / 2))),
    radiusS: px(8),
    radiusM: Math.round(cornerRadius * 0.7),
    radiusL: cornerRadius,
    radiusXL: Math.round(cornerRadius * 1.4),
    lNotchMinWidth: px(112),
    cNotchMinWidth: px(300),
    rNotchMinWidth: px(160),
    notchPadding: px(14),
    dashboardWidth: px(s.dashboardWidth),
    dashboardHeight: px(s.dashboardHeight),
    networkPopupWidth: px(480),
    notificationsWidth: px(s.notificationsWidth),
    wsDotSize: px(16),
    wsActiveWidth: px(28),
    wsSpacing: px(5),
    wsPadding: px(5),
  };
}

export const T1 = themeSet(1);
