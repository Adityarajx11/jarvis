// Jarvis orb - yellow dotted spike orb rendered inline (no iframe, no load gap).
(function() {
  if (!window.THREE) return;
  try {
    // ---- tiny self-contained 3D Perlin-style noise (no external lib) ----
    function ImprovedNoise() {
      function fade(t){ return t*t*t*(t*(t*6-15)+10); }
      function lerp(t,a,b){ return a+t*(b-a); }
      function grad(hash,x,y,z){
        var h = hash & 15;
        var u = h < 8 ? x : y;
        var v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
      }
      var perm = [];
      for (var i = 0; i < 256; i++) perm[i] = i;
      var seed = 12345;
      function rand(){ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      for (var i = 255; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        var tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
      }
      var p = new Uint8Array(512);
      for (var i = 0; i < 256; i++) p[i] = p[i + 256] = perm[i];

      this.noise = function(x, y, z) {
        var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        var u = fade(x), v = fade(y), w = fade(z);
        var A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z,
            B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
        return lerp(w,
          lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
                  lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
          lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
                  lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1)))
        );
      };
    }
    var noise = new ImprovedNoise();

    // ---- scene setup (fixed 320px box) ----
    var S = 320;
    var canvas = document.getElementById('orb-canvas');
    if (!canvas) return;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 6.5);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(S, S, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    scene.add(new THREE.HemisphereLight(0x333344, 0x000000, 0.35));
    var key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-4, 5, 6);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x5577ff, 0.35);
    rim.position.set(4, -3, -5);
    scene.add(rim);

    // ---- dots: yellow points on a Fibonacci sphere, breathing with noise ----
    var COUNT = 1800;
    var dotGeo = new THREE.BufferGeometry();
    var dotPos = new Float32Array(COUNT * 3);
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
    var dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({ color: 0xffb732, size: 0.055, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(dots);
    var DOT_GOLD = new THREE.Color(0xffb732);
    var DOT_HOT = new THREE.Color(0xfff6dd);

    var dirs = [];
    for (var i = 0; i < COUNT; i++) {
      var t = i / (COUNT - 1);
      var inclination = Math.acos(1 - 2 * t);
      var azimuth = Math.PI * (1 + Math.sqrt(5)) * i;
      dirs.push(new THREE.Vector3(
        Math.sin(inclination) * Math.cos(azimuth),
        Math.sin(inclination) * Math.sin(azimuth),
        Math.cos(inclination)
      ));
    }

    var baseRadius = 2.0;

    function updateSpikes(time, tms, drive) {
      for (var i = 0; i < COUNT; i++) {
        var dir = dirs[i];
        var n = noise.noise(dir.x * 1.4 + time, dir.y * 1.4 + time, dir.z * 1.4 + time);
        // speech dance: dots surge on each spoken word, slower
        var dance = drive * (0.5 + 0.5 * Math.sin(tms * 0.008 + dir.x * 6 + dir.y * 4 + dir.z * 3));
        var r = baseRadius + n * (0.35 + drive * 0.15) + dance * 0.22;
        dotPos[i * 3] = dir.x * r;
        dotPos[i * 3 + 1] = dir.y * r;
        dotPos[i * 3 + 2] = dir.z * r;
      }
      dotGeo.attributes.position.needsUpdate = true;
    }

    // glowing core inside the dots
    var core = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffe6a3, emissive: 0xff9a2e, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.1 })
    );
    scene.add(core);
    // light hugging the core - the visible ring of emitted light
    var coreGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(coreGlow);

    var talkEnv = 0;
    var speechDrive = 0;

    function animate(t) {
      requestAnimationFrame(animate);
      var time = t * 0.00018;
      var talking = !!window.jarvisTalking;
      talkEnv += ((talking ? 1 : 0) - talkEnv) * (talking ? 0.25 : 0.06);
      // real word sync: a boundary event fires per spoken word, pulse decays after each
      var wAge = t - (window.jarvisWordAt || -1e9);
      var wordEnv = (talking && wAge < 350) ? (1 - wAge / 350) : 0;
      speechDrive = Math.max(talkEnv * 0.45, wordEnv);
      updateSpikes(time, t, speechDrive);
      // heat up: dots shift toward white-hot while answering
      dots.material.color.copy(DOT_GOLD).lerp(DOT_HOT, Math.min(talkEnv, 1) * 0.65);
      dots.rotation.y += 0.0022 + talkEnv * 0.005;
      dots.rotation.x = Math.sin(time * 0.4) * 0.08;
    coreGlow.material.opacity = 0.4 + Math.sin(t * 0.007 + 0.5) * 0.08 + talkEnv * 0.2;
    // core flare (brightness only - no scaling)
    core.material.emissiveIntensity = 0.5 + talkEnv * 1.0;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  } catch (e) {}
})();
