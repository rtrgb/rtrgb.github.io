// FUNDO AURORA (WebGL)
// Port em JS puro do componente "Aurora Flow" (componentry.dev).
// Desenha um quad em tela cheia atrás da página; pausa quando a aba fica oculta
// e desenha um único quadro estático se o usuário pediu menos movimento.

(function () {
  const canvas = document.getElementById('aurora');
  if (!canvas) return;

  // paleta quase neutra, com um leve tom frio, para não tingir as fotos
  const PALETTE = ['#050506', '#0c0e12', '#1a1f27', '#38414e', '#c8d1dc'];

  const SETTINGS = {
    speed: 0.8,
    intensity: 0.9,
    blur: 1,
    contrast: 1.04,
    brightness: 1,
    grainOpacity: 0.18,
    layers: 6,
    flowScale: 1,
    flowStrength: 1,
    flowDirection: -18,
    pointerStrength: 0.7,
    lightingIntensity: 0.7,
    lightingRadius: 1,
    lightingSpeed: 0.8,
    ambientOpacity: 0.6,
    noiseOpacity: 0.16,
    noiseScale: 1,
    vignette: 0.55
  };

  // resolução reduzida: o campo é difuso, então metade da resolução basta
  const RENDER_SCALE = 0.5;

  const VERTEX = [
    'attribute vec2 position;',
    'void main() { gl_Position = vec4(position, 0.0, 1.0); }'
  ].join('\n');

  const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform vec2 u_pointer;
uniform vec2 u_flowDirection;
uniform float u_time;
uniform float u_intensity;
uniform float u_blur;
uniform float u_contrast;
uniform float u_brightness;
uniform float u_layers;
uniform float u_flowScale;
uniform float u_flowStrength;
uniform float u_pointerStrength;
uniform float u_grainOpacity;
uniform float u_noiseOpacity;
uniform float u_noiseScale;
uniform float u_lightingIntensity;
uniform float u_lightingRadius;
uniform float u_lightingSpeed;
uniform float u_ambientOpacity;
uniform float u_vignette;
uniform vec3 u_color0;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

mat2 rotate2d(float a) { float s = sin(a); float c = cos(a); return mat2(c, -s, s, c); }

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.52;
  mat2 turn = mat2(0.84, 0.54, -0.54, 0.84);
  for (int i = 0; i < 7; i++) {
    float enabled = step(float(i) + 0.5, u_layers);
    value += amplitude * valueNoise(p) * enabled;
    p = turn * p * 2.03 + 0.17;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = u_time * 0.075;
  vec2 direction = normalize(u_flowDirection + vec2(0.0001));
  vec2 crossDirection = vec2(-direction.y, direction.x);

  vec2 pointer = (u_pointer - 0.5) * vec2(aspect, 1.0);
  vec2 pointerDelta = pointer - p;
  float pointerFalloff = smoothstep(0.68, 0.0, length(pointerDelta));
  p += crossDirection * pointerDelta.x * pointerFalloff * 0.035 * u_pointerStrength;
  p += direction * pointerDelta.y * pointerFalloff * 0.022 * u_pointerStrength;

  vec2 broadP = p * max(0.2, u_flowScale);
  float warpA = fbm(broadP * 0.82 + direction * t * 0.71 + vec2(2.7, -1.3));
  float warpB = fbm(rotate2d(0.73) * broadP * 1.08 - crossDirection * t * 0.53 + vec2(-4.1, 3.6));
  float warpC = fbm(rotate2d(-0.46) * broadP * 1.42 + vec2(-t * 0.31, t * 0.43) + 8.2);

  vec2 silk = broadP;
  silk += vec2(warpA - 0.5, warpB - 0.5) * 0.72 * u_flowStrength;
  silk += direction * (warpC - 0.5) * 0.28 * u_flowStrength;

  float fieldA = fbm(rotate2d(0.28) * silk * 0.74 + direction * t * 0.83 + 1.9);
  float fieldB = fbm(rotate2d(-0.81) * silk * 0.91 - crossDirection * t * 0.61 + 5.4);
  float fieldC = fbm(rotate2d(1.17) * silk * 1.16 + vec2(t * 0.37, -t * 0.29) + 9.7);

  float softness = clamp(u_blur * 0.08, 0.025, 0.2);
  float veilA = smoothstep(0.28 - softness, 0.76 + softness, fieldA + (warpB - 0.5) * 0.28);
  float veilB = smoothstep(0.34 - softness, 0.82 + softness, fieldB + (warpC - 0.5) * 0.24);
  float veilC = smoothstep(0.42 - softness, 0.86 + softness, fieldC + (fieldA - 0.5) * 0.18);

  float folded = 0.5 + 0.5 * sin(silk.y * 2.7 + silk.x * 0.72 + warpA * 3.1 - warpB * 1.9 + t * 0.47);
  float silkFold = smoothstep(0.18, 0.92, folded) * smoothstep(0.12, 0.94, fieldB);

  vec3 color = mix(u_color0, u_color1, clamp(0.22 + veilA * 0.62, 0.0, 1.0));
  color = mix(color, u_color2, veilB * 0.58 * u_intensity);
  color = mix(color, u_color3, veilC * 0.42 * u_intensity);
  color += u_color4 * silkFold * 0.13 * u_intensity;

  vec2 lightCenter = vec2(
    0.5 + sin(t * 0.37 * u_lightingSpeed + 1.4) * 0.24,
    0.48 + cos(t * 0.29 * u_lightingSpeed - 0.8) * 0.18
  );
  vec2 lightDelta = uv - lightCenter;
  lightDelta = rotate2d(0.42 + warpA * 0.22) * lightDelta;
  lightDelta *= vec2(0.74, 1.32);
  float lightRadius = max(0.08, u_lightingRadius * 0.34);
  float bloom = exp(-dot(lightDelta, lightDelta) / (lightRadius * lightRadius));
  bloom *= 0.76 + fieldC * 0.24;
  color += mix(u_color3, u_color4, 0.58) * bloom * 0.22 * u_lightingIntensity;

  vec2 ambientDelta = (uv - vec2(0.52, 0.47)) * vec2(0.72, 1.0);
  float ambient = exp(-dot(ambientDelta, ambientDelta) / 0.34);
  color += mix(u_color2, u_color4, 0.5) * ambient * 0.12 * u_ambientOpacity;

  float haze = fbm(p * max(0.5, u_noiseScale) * 2.6 + vec2(-t * 0.18, t * 0.14));
  color += (haze - 0.5) * u_noiseOpacity * 0.16;

  float vignetteMask = smoothstep(0.18, 1.08, length((uv - 0.5) * vec2(1.0, 0.86)));
  color *= 1.0 - vignetteMask * 0.52 * u_vignette;

  float grain = hash(gl_FragCoord.xy + floor(u_time * 12.0) * 17.0) - 0.5;
  color += grain * u_grainOpacity * 0.16;
  color = ((color - 0.5) * u_contrast + 0.5) * u_brightness;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  [
    'u_res', 'u_pointer', 'u_flowDirection', 'u_time', 'u_intensity', 'u_blur', 'u_contrast',
    'u_brightness', 'u_layers', 'u_flowScale', 'u_flowStrength', 'u_pointerStrength',
    'u_grainOpacity', 'u_noiseOpacity', 'u_noiseScale', 'u_lightingIntensity',
    'u_lightingRadius', 'u_lightingSpeed', 'u_ambientOpacity', 'u_vignette',
    'u_color0', 'u_color1', 'u_color2', 'u_color3', 'u_color4'
  ].forEach(function (name) { u[name] = gl.getUniformLocation(program, name); });

  // valores fixos: enviados uma vez
  const rad = SETTINGS.flowDirection * Math.PI / 180;
  gl.uniform2f(u.u_flowDirection, Math.cos(rad), Math.sin(rad));
  gl.uniform1f(u.u_intensity, SETTINGS.intensity);
  gl.uniform1f(u.u_blur, SETTINGS.blur);
  gl.uniform1f(u.u_contrast, SETTINGS.contrast);
  gl.uniform1f(u.u_brightness, SETTINGS.brightness);
  gl.uniform1f(u.u_layers, SETTINGS.layers);
  gl.uniform1f(u.u_flowScale, SETTINGS.flowScale);
  gl.uniform1f(u.u_flowStrength, SETTINGS.flowStrength);
  gl.uniform1f(u.u_grainOpacity, SETTINGS.grainOpacity);
  gl.uniform1f(u.u_noiseOpacity, SETTINGS.noiseOpacity);
  gl.uniform1f(u.u_noiseScale, SETTINGS.noiseScale);
  gl.uniform1f(u.u_lightingIntensity, SETTINGS.lightingIntensity);
  gl.uniform1f(u.u_lightingRadius, SETTINGS.lightingRadius);
  gl.uniform1f(u.u_lightingSpeed, SETTINGS.lightingSpeed);
  gl.uniform1f(u.u_ambientOpacity, SETTINGS.ambientOpacity);
  gl.uniform1f(u.u_vignette, SETTINGS.vignette);
  PALETTE.forEach(function (hex, i) {
    const c = hexToRgb(hex);
    gl.uniform3f(u['u_color' + i], c[0], c[1], c[2]);
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: 0.5, y: 0.5 };
  const targetPointer = { x: 0.5, y: 0.5 };
  let elapsed = reduced ? 7.25 : 0;
  let lastNow = performance.now();
  let raf = 0;

  function resize() {
    const w = Math.max(1, Math.floor(window.innerWidth * RENDER_SCALE));
    const h = Math.max(1, Math.floor(window.innerHeight * RENDER_SCALE));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(u.u_res, w, h);
  }

  function draw(now) {
    if (!reduced) elapsed += Math.min((now - lastNow) / 1000, 0.05) * SETTINGS.speed;
    lastNow = now;
    pointer.x += (targetPointer.x - pointer.x) * 0.035;
    pointer.y += (targetPointer.y - pointer.y) * 0.035;
    gl.uniform2f(u.u_pointer, pointer.x, pointer.y);
    gl.uniform1f(u.u_pointerStrength, reduced ? 0 : SETTINGS.pointerStrength);
    gl.uniform1f(u.u_time, elapsed);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function loop(now) {
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (reduced || raf || document.hidden) return;
    lastNow = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  resize();
  draw(performance.now());
  start();

  window.addEventListener('resize', function () {
    resize();
    if (reduced) draw(performance.now());
  });

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    targetPointer.x = e.clientX / window.innerWidth;
    targetPointer.y = 1 - e.clientY / window.innerHeight;
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });
})();
