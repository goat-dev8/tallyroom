'use client';
let cached: boolean | null = null;
/**
 * True when the browser has hardware-accelerated WebGL2. Software rasterisers (SwiftShader, llvmpipe, etc.)
 * render shaders on the CPU and would freeze the main thread, so those visitors get the static SVG instead.
 */
export function hasFastWebGL(): boolean {
  if (cached !== null) return cached;
  if (/[?&]gl=force\b/.test(window.location.search)) return (cached = true); // QA override for headless screenshots
  try {
    const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return (cached = false);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return (cached = !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name));
  } catch { return (cached = false); }
}
