// Short landscape viewports need a side shop, not a tall bottom dock.
export const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 540px)';
export function isShortLandscape(width, height) {
  return width > height && height <= 540;
}
export function viewportSize() {
  const vv = window.visualViewport;
  return { width: window.innerWidth, height: Math.min(window.innerHeight, vv?.height || window.innerHeight) };
}
export function shortLandscape() {
  // Match CSS media-query dimensions; browser toolbars only reduce usable height.
  return isShortLandscape(window.innerWidth,window.innerHeight);
}
export function boardBand(width, height, hud, dock, landscape = isShortLandscape(width,height)) {
  const left = landscape ? Math.max(8,hud.left || 0) : width >= 1280 ? 292 : width >= 1000 ? 252 : 0;
  const y = hud.bottom + (landscape ? 4 : 6);
  const right = landscape ? dock.left - 8 : width - (width >= 1280 ? 368 : 0);
  const bottom = landscape ? height - 8 : dock.top - 6;
  return {x:left,y,w:Math.max(1,right-left),h:Math.max(1,bottom-y)};
}
