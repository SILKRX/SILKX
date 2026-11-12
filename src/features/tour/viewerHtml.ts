/**
 * Автономная HTML-страница 360° просмотрщика (three.js) для WebView / iframe.
 *
 * Управление: тянуть пальцем — осмотреться, щипок / колесо — приблизить,
 * тап по золотой метке — перейти в соседнюю комнату.
 * Связь с React Native — JSON-сообщения в обе стороны (см. ViewerInbound / ViewerOutbound).
 */

export interface ViewerScene {
  preview: string;
  hd: string | null;
  startYaw: number;
  label: string;
}

export interface ViewerConfig {
  scenes: ViewerScene[];
  start: number;
  background: string;
  accent: string;
}

/** Сообщения из страницы в приложение */
export type ViewerOutbound =
  | { type: 'ready' }
  | { type: 'scene'; index: number }
  | { type: 'loaded'; index: number; hd: boolean }
  | { type: 'error'; index: number }
  | { type: 'interact' };

/** Команды из приложения в страницу */
export type ViewerInbound = { type: 'go'; index: number } | { type: 'zoom'; delta: number };

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export function parseViewerMessage(raw: unknown): ViewerOutbound | null {
  if (typeof raw !== 'string') return null;
  try {
    const msg = JSON.parse(raw) as { type?: unknown };
    return typeof msg.type === 'string' ? (msg as ViewerOutbound) : null;
  } catch {
    return null;
  }
}

export function buildViewerHtml(config: ViewerConfig): string {
  // `<` экранируем, чтобы подпись комнаты не могла закрыть <script>
  const data = JSON.stringify(config).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:${config.background};touch-action:none;-webkit-user-select:none;user-select:none}
  canvas{display:block;width:100%;height:100%}
  #fade{position:fixed;inset:0;background:${config.background};opacity:1;transition:opacity .45s ease;pointer-events:none}
</style>
</head><body>
<div id="fade"></div>
<script src="${THREE_URL}"></script>
<script>
(function(){
  var CFG = ${data};
  function send(msg){
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent && window.parent !== window) window.parent.postMessage(s, '*');
  }
  if (!window.THREE) { send({type:'error', index: CFG.start}); return; }

  var renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  var maxTex = renderer.capabilities.maxTextureSize || 2048;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
  var geo = new THREE.SphereGeometry(500, 64, 40);
  geo.scale(-1, 1, 1);
  var material = new THREE.MeshBasicMaterial({color:0x111111});
  scene.add(new THREE.Mesh(geo, material));

  // --- Камера: углы обзора с инерцией ---
  var lon = 0, lat = 0, velLon = 0, velLat = 0, fov = 75;
  var autoRotate = true, dragging = false, px = 0, py = 0, moved = 0;
  var pointers = {}, pinchStart = 0, pinchFov = 75;

  function clampFov(v){ return Math.max(35, Math.min(90, v)); }
  function stopAuto(){ if (autoRotate) { autoRotate = false; send({type:'interact'}); } }

  var el = renderer.domElement;
  el.addEventListener('pointerdown', function(e){
    pointers[e.pointerId] = {x:e.clientX, y:e.clientY};
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      pinchStart = Math.hypot(a.x-b.x, a.y-b.y); pinchFov = fov; dragging = false;
    } else { dragging = true; px = e.clientX; py = e.clientY; moved = 0; velLon = velLat = 0; }
    stopAuto();
  });
  el.addEventListener('pointermove', function(e){
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = {x:e.clientX, y:e.clientY};
    var ids = Object.keys(pointers);
    if (ids.length === 2 && pinchStart > 0) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      fov = clampFov(pinchFov * pinchStart / Math.max(Math.hypot(a.x-b.x, a.y-b.y), 1));
      return;
    }
    if (!dragging) return;
    var k = 0.12 * fov / 75;
    var dx = (px - e.clientX) * k, dy = (e.clientY - py) * k;
    velLon = dx; velLat = dy; lon += dx; lat += dy;
    moved += Math.abs(e.clientX - px) + Math.abs(e.clientY - py);
    px = e.clientX; py = e.clientY;
  });
  function up(e){
    var wasTap = dragging && moved < 8;
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length < 2) pinchStart = 0;
    dragging = false;
    if (wasTap) tap(e.clientX, e.clientY);
  }
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', function(e){ e.preventDefault(); fov = clampFov(fov + e.deltaY * 0.05); stopAuto(); }, {passive:false});

  // --- Метки-переходы в соседние комнаты ---
  var markers = [];
  var raycaster = new THREE.Raycaster();
  function makeLabel(text){
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = 'rgba(11,12,15,0.72)'; roundRect(g, 16, 150, 480, 84, 42); g.fill();
    g.strokeStyle = CFG.accent; g.lineWidth = 4; g.stroke();
    g.beginPath(); g.arc(256, 70, 58, 0, Math.PI*2); g.fillStyle = CFG.accent; g.fill();
    g.strokeStyle = '#0B0C0F'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(232, 92); g.lineTo(256, 52); g.lineTo(280, 92); g.stroke();
    g.fillStyle = '#ffffff'; g.font = '600 40px -apple-system, Roboto, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text.length > 18 ? text.slice(0, 17) + '…' : text, 256, 193);
    var tex = new THREE.CanvasTexture(c);
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:false, transparent:true}));
    sprite.scale.set(64, 32, 1);
    return sprite;
  }
  function roundRect(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
  function placeAt(obj, yawDeg, pitchDeg, r){
    var phi = THREE.MathUtils.degToRad(90 - pitchDeg), theta = THREE.MathUtils.degToRad(yawDeg);
    obj.position.set(r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
  }
  function buildMarkers(i){
    markers.forEach(function(m){ scene.remove(m); m.material.map.dispose(); m.material.dispose(); });
    markers = [];
    var n = CFG.scenes.length, start = CFG.scenes[i].startYaw;
    var links = [];
    if (i + 1 < n) links.push({to:i+1, yaw:start + 20});
    if (i - 1 >= 0) links.push({to:i-1, yaw:start + 200});
    links.forEach(function(l){
      var s = makeLabel(CFG.scenes[l.to].label);
      placeAt(s, l.yaw, -14, 300);
      s.userData.to = l.to;
      scene.add(s); markers.push(s);
    });
  }
  function tap(x, y){
    var v = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(v, camera);
    var hit = raycaster.intersectObjects(markers)[0];
    if (hit) go(hit.object.userData.to);
  }

  // --- Загрузка панорам: сначала лёгкая, потом HD ---
  var cache = {}, current = -1, token = 0;
  var fade = document.getElementById('fade');
  function loadImage(url){
    return new Promise(function(res, rej){
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function(){ res(img); }; img.onerror = rej; img.src = url;
    });
  }
  function toTexture(img){
    var w = Math.min(img.naturalWidth, maxTex, 4096), h = Math.round(w / 2);
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    var t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    if ('encoding' in t) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function apply(tex){
    material.map = tex; material.color.set(0xffffff); material.needsUpdate = true;
  }
  function trimCache(keep){
    Object.keys(cache).forEach(function(k){
      var idx = +k; if (Math.abs(idx - keep) > 1 && cache[k].tex) { cache[k].tex.dispose(); delete cache[k]; }
    });
  }
  function go(i){
    if (i < 0 || i >= CFG.scenes.length || i === current) return;
    var my = ++token;
    current = i;
    send({type:'scene', index:i});
    fade.style.opacity = '1';
    var s = CFG.scenes[i];
    var cached = cache[i];
    var ready = cached ? Promise.resolve(cached) : loadImage(s.preview).then(function(img){ cache[i] = {tex: toTexture(img), hd:false}; return cache[i]; });
    ready.then(function(entry){
      if (my !== token) return;
      setTimeout(function(){
        if (my !== token) return;
        apply(entry.tex); buildMarkers(i);
        lon = s.startYaw; lat = 0; fov = 75; velLon = velLat = 0;
        fade.style.opacity = '0';
        send({type:'loaded', index:i, hd:entry.hd});
        trimCache(i);
        // HD — только если устройство потянет большую текстуру
        if (!entry.hd && s.hd && maxTex >= 4096) {
          loadImage(s.hd).then(function(img){
            if (!cache[i]) return;
            var old = cache[i].tex; cache[i] = {tex: toTexture(img), hd:true};
            if (my === token) { apply(cache[i].tex); send({type:'loaded', index:i, hd:true}); }
            old.dispose();
          }).catch(function(){});
        }
        // предзагрузка следующей комнаты
        var next = CFG.scenes[i+1];
        if (next && !cache[i+1]) loadImage(next.preview).then(function(img){ if (!cache[i+1]) cache[i+1] = {tex: toTexture(img), hd:false}; }).catch(function(){});
      }, cached ? 120 : 0);
    }).catch(function(){ if (my === token) { fade.style.opacity = '0'; send({type:'error', index:i}); } });
  }

  function handle(msg){
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'go') go(msg.index);
    if (msg.type === 'zoom') { fov = clampFov(fov + msg.delta); stopAuto(); }
  }
  window.silkxCommand = function(json){ try { handle(JSON.parse(json)); } catch(e){} };
  window.addEventListener('message', function(e){ if (typeof e.data === 'string') { try { handle(JSON.parse(e.data)); } catch(err){} } });

  window.addEventListener('resize', function(){
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  var target = new THREE.Vector3();
  (function loop(){
    requestAnimationFrame(loop);
    if (autoRotate) lon += 0.04;
    else if (!dragging) { lon += velLon; lat += velLat; velLon *= 0.92; velLat *= 0.92; }
    lat = Math.max(-85, Math.min(85, lat));
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov += (fov - camera.fov) * 0.2; camera.updateProjectionMatrix(); }
    var phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon);
    target.set(500*Math.sin(phi)*Math.cos(theta), 500*Math.cos(phi), 500*Math.sin(phi)*Math.sin(theta));
    camera.lookAt(target);
    renderer.render(scene, camera);
  })();

  send({type:'ready'});
  go(CFG.start);
})();
</script>
</body></html>`;
}
