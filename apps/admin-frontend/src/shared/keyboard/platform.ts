export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform ?? '';
  const userAgent = navigator.userAgent ?? '';
  return /Mac|iPhone|iPad|iPod/.test(platform) || /Mac OS X/.test(userAgent);
}

export function modifierGlyph(): '⌘' | 'Ctrl' {
  return isApplePlatform() ? '⌘' : 'Ctrl';
}
