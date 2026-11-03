/* Offline perspective ride scenes. Route references are simplified, not street-view footage. */
(function (root) {
  'use strict';
  const ids = [
    'pittsburgh',
    'west-virginia',
    'mountain-bike',
    'beach',
    'salt-flats',
    'rockies',
    'france'
  ];
  const palettes = {
    pittsburgh: [0xb6d9ea, 0x73945c, 0x3a4549],
    'west-virginia': [0xa5cfdf, 0x587344, 0x897e66],
    'mountain-bike': [0xbcd6df, 0xb87a51, 0xd09b6d],
    beach: [0xaedfe9, 0xc6b67f, 0xa49c80],
    'salt-flats': [0xb7d9ea, 0xe0e2db, 0xd9dfda],
    rockies: [0xb4d4e8, 0x7c8a6a, 0x525858],
    france: [0xc1dbe5, 0x8d9b5b, 0x77786d]
  };
  const random = (n) => {
    const x = Math.sin(n * 127.1 + 31.7) * 43758.5453;
    return x - Math.floor(x);
  };
  function create(fallback) {
    const T = root.THREE;
    if (!T || !fallback.parentElement) return null;
    const canvas = document.createElement('canvas');
    canvas.id = 'rideImmersiveCanvas';
    canvas.setAttribute('aria-label', 'Continuous ride scenery');
    let renderer;
    try {
      renderer = new T.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
    } catch {
      return null;
    }
    fallback.parentElement.insertBefore(canvas, fallback);
    canvas.hidden = true;
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const camera = new T.PerspectiveCamera(68, 16 / 9, 0.08, 8000),
      scene = new T.Scene(),
      group = new T.Group();
    scene.add(group);
    scene.add(new T.HemisphereLight(0xe6f3ff, 0x665f51, 1.8));
    const sun = new T.DirectionalLight(0xffecd1, 2.5);
    sun.position.set(-400, 600, 80);
    scene.add(sun);
    const unitBox = new T.BoxGeometry(1, 1, 1),
      trunkGeo = new T.CylinderGeometry(0.12, 0.19, 1, 6),
      leafGeo = new T.IcosahedronGeometry(1, 2),
      pineGeo = new T.ConeGeometry(1, 1, 12);
    let id = '',
      lastTheme = -1,
      disposed = false,
      failed = false,
      rendered = 0,
      lastPosition = 0,
      width = 1,
      height = 1,
      road = null,
      roadEdges = null,
      terrain = null,
      sky = null,
      mountains = null;
    const roadside = [],
      batches = [],
      water = [],
      geometry = [],
      textures = [],
      textureCache = new Map(),
      materials = new Map(),
      routes = root.NonZeroRoutes;
    function surface(kind) {
      if (textureCache.has(kind)) return textureCache.get(kind);
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d'),
        image = ctx.createImageData(256, 256);
      for (let y = 0; y < 256; y++)
        for (let x = 0; x < 256; x++) {
          const i = (y * 256 + x) * 4,
            patch = Math.sin(x * 0.12) * Math.sin(y * 0.09),
            v = Math.round((kind === 'road' ? 165 : 190) + random(x + y * 256) * 45 + patch * 12);
          image.data[i] = v;
          image.data[i + 1] = v;
          image.data[i + 2] = v;
          image.data[i + 3] = 255;
        }
      ctx.putImageData(image, 0, 0);
      const texture = new T.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      texture.colorSpace = T.SRGBColorSpace;
      textures.push(texture);
      textureCache.set(kind, texture);
      return texture;
    }
    function makeSky() {
      let texture = textureCache.get('sky');
      if (!texture) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const c = canvas.getContext('2d'),
          g = c.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, '#28608c');
        g.addColorStop(0.42, '#93bdd1');
        g.addColorStop(0.57, '#d2e1df');
        g.addColorStop(1, '#b7c8c4');
        c.fillStyle = g;
        c.fillRect(0, 0, 1024, 512);
        c.filter = 'blur(9px)';
        for (let i = 0; i < 90; i++) {
          c.fillStyle = 'rgba(255,255,255,' + (0.08 + random(i + 30) * 0.15) + ')';
          c.beginPath();
          c.ellipse(
            random(i) * 1024,
            110 + random(i + 2) * 120,
            20 + random(i + 8) * 85,
            3 + random(i + 6) * 10,
            0,
            0,
            7
          );
          c.fill();
        }
        texture = new T.CanvasTexture(canvas);
        texture.colorSpace = T.SRGBColorSpace;
        textures.push(texture);
        textureCache.set('sky', texture);
      }
      const geo = new T.SphereGeometry(6500, 32, 16);
      geometry.push(geo);
      let material = materials.get('sky');
      if (!material) {
        material = new T.MeshBasicMaterial({
          map: texture,
          side: T.BackSide,
          depthWrite: false,
          fog: false
        });
        materials.set('sky', material);
      }
      sky = mesh(geo, material, 0, 0, 0);
      sky.renderOrder = -2;
    }
    function makeMountains() {
      if (['pittsburgh', 'beach', 'salt-flats'].includes(id)) return;
      const g = new T.PlaneGeometry(10000, 10000, 100, 90);
      g.rotateX(-Math.PI / 2);
      const a = g.attributes.position,
        colors = new Float32Array(a.count * 3);
      const rocky = id === 'rockies',
        desert = id === 'mountain-bike',
        height = rocky ? 1500 : id === 'france' ? 1100 : desert ? 450 : 600;
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i),
          z = a.getZ(i),
          edge = Math.min(1, Math.max(0, Math.abs(x) - 300) / 900);
        const ridge =
          0.25 +
          Math.abs(Math.sin(x * 0.0015 + z * 0.0004)) * 0.4 +
          Math.abs(Math.sin(x * 0.004 - z * 0.0009)) * 0.22 +
          random(i) * 0.06;
        const y = edge * ridge * height;
        a.setY(i, y - 4);
        const color = new T.Color(desert ? 0xb97d5b : rocky ? 0x7e8d91 : 0x6d806f);
        if (rocky && y > 700) color.lerp(new T.Color(0xebf0ee), Math.min(1, (y - 700) / 300));
        color.multiplyScalar(0.7 + random(i) * 0.3);
        color.toArray(colors, i * 3);
      }
      g.setAttribute('color', new T.BufferAttribute(colors, 3));
      g.computeVertexNormals();
      geometry.push(g);
      let material = materials.get('mountains');
      if (!material) {
        material = new T.MeshStandardMaterial({
          vertexColors: true,
          roughness: 1,
          side: T.DoubleSide
        });
        materials.set('mountains', material);
      }
      mountains = mesh(g, material, 0, -1, -2200);
    }
    const mat = (color, extra = {}) => {
      const key = color + '|' + JSON.stringify(extra);
      if (!materials.has(key))
        materials.set(key, new T.MeshStandardMaterial({ color, roughness: 0.85, ...extra }));
      return materials.get(key);
    };
    function mesh(geo, color, x, y, z, sx = 1, sy = 1, sz = 1) {
      const m = new T.Mesh(geo, typeof color === 'object' ? color : mat(color));
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      group.add(m);
      return m;
    }
    function box(color, x, y, z, sx, sy, sz) {
      return mesh(unitBox, color, x, y, z, sx, sy, sz);
    }
    function pathPoint(d) {
      if (id === 'pittsburgh') {
        const p = routes.geo(id, d),
          base = routes.ROUTES.pittsburgh.path[0];
        return new T.Vector3((p.lon - base[1]) * 84700, 0, -(p.lat - base[0]) * 111320);
      }
      const bend = id === 'salt-flats' ? 0 : id === 'mountain-bike' ? 15 : 40;
      return new T.Vector3(Math.sin(d / 260) * bend + Math.sin(d / 930) * bend * 0.65, 0, -d);
    }
    function forward(d) {
      return pathPoint(d + 8)
        .sub(pathPoint(d))
        .normalize();
    }
    function atOffset(d, side) {
      const p = pathPoint(d),
        f = forward(d);
      return p.add(new T.Vector3(-f.z, 0, f.x).multiplyScalar(side));
    }
    function building(b) {
      const base = routes.ROUTES.pittsburgh.path[0],
        x = (b.lon - base[1]) * 84700,
        z = -(b.lat - base[0]) * 111320;
      const m = box(b.color, x, b.height / 2 - 9, z, b.width, b.height, b.width * 0.7);
      if (b.kind !== 'steel') {
        const glass = mat(0xc1dfe5, { roughness: 0.28, metalness: 0.45 });
        const count = Math.floor(b.height / 4),
          inst = new T.InstancedMesh(unitBox, glass, count * 2),
          dummy = new T.Object3D();
        let k = 0;
        for (let n = 0; n < count; n++)
          for (const sign of [-1, 1]) {
            dummy.position.set(x, b.height - 9 - n * 4, z + sign * b.width * 0.356);
            dummy.scale.set(b.width * 0.92, 0.75, 0.1);
            dummy.updateMatrix();
            inst.setMatrixAt(k++, dummy.matrix);
          }
        group.add(inst);
      }
      if (b.kind === 'ppg')
        for (const dx of [-0.45, 0.45])
          for (const dz of [-0.3, 0.3]) {
            const g = new T.ConeGeometry(3, 22, 4);
            geometry.push(g);
            mesh(g, 0xc9e0e5, x + dx * b.width, b.height + 1, z + dz * b.width);
          }
      if (b.kind === 'pyramid') {
        const g = new T.ConeGeometry(b.width * 0.6, 25, 4);
        geometry.push(g);
        const top = mesh(g, b.color, x, b.height + 3, z);
        top.rotation.y = Math.PI / 4;
      }
      if (b.kind === 'stepped')
        for (let n = 0; n < 3; n++)
          box(
            b.color,
            x,
            b.height - 5 + n * 5,
            z,
            b.width * (0.8 - n * 0.18),
            5,
            b.width * (0.55 - n * 0.12)
          );
      return m;
    }
    function bridge(d, gold) {
      const center = pathPoint(d),
        f = forward(d),
        side = new T.Vector3(-f.z, 0, f.x),
        span = 370;
      const deck = box(
        gold ? 0xd7ad3b : 0x698b94,
        center.x + side.x * span * 0.45,
        12,
        center.z + side.z * span * 0.45,
        span,
        3,
        12
      );
      deck.rotation.y = -Math.atan2(side.z, side.x);
      for (const offset of [30, 130, 260]) {
        const p = center.clone().addScaledVector(side, offset);
        box(gold ? 0xd1a636 : 0x79919a, p.x, 22, p.z, 4, 45, 4);
      }
      for (let n = 0; n < 25; n++) {
        const off = n * 14,
          p = center.clone().addScaledVector(side, off),
          y = 13 + Math.abs(Math.cos((off / span) * Math.PI * 2)) * 20;
        box(gold ? 0xe3bd54 : 0x92a2a8, p.x, (y + 13) / 2, p.z, 1, Math.max(0.2, y - 13), 1);
        if (n) {
          const prev = center.clone().addScaledVector(side, off - 14),
            py = 13 + Math.abs(Math.cos(((off - 14) / span) * Math.PI * 2)) * 20;
          const g = new T.BufferGeometry().setFromPoints([
            new T.Vector3(prev.x, py, prev.z),
            new T.Vector3(p.x, y, p.z)
          ]);
          geometry.push(g);
          const line = new T.Line(
            g,
            new T.LineBasicMaterial({ color: gold ? 0xdab240 : 0x8a9da4 })
          );
          group.add(line);
        }
      }
    }
    function makeRoad() {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(161 * 2 * 3), 3));
      const indices = [];
      for (let i = 0; i < 160; i++) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      g.setIndex(indices);
      g.setAttribute('uv', new T.BufferAttribute(new Float32Array(161 * 2 * 2), 2));
      geometry.push(g);
      road = mesh(g, palettes[id][2], 0, 0, 0);
      road.material.side = T.DoubleSide;
      road.material.map = surface('road');
      road.material.bumpMap = road.material.map;
      road.material.bumpScale = 0.012;
      road.material.roughness = 1;
      const edge = new T.BufferGeometry();
      edge.setAttribute('position', new T.BufferAttribute(new Float32Array(161 * 4 * 3), 3));
      geometry.push(edge);
      roadEdges = new T.LineSegments(
        edge,
        new T.LineBasicMaterial({
          color: id === 'pittsburgh' ? 0xb7b6a2 : 0xe9dec1,
          transparent: true,
          opacity: 0.65
        })
      );
      group.add(roadEdges);
    }
    function updateRoad(distance) {
      const data = road.geometry.attributes.position,
        edges = roadEdges.geometry.attributes.position,
        half = (routes.ROUTES[id]?.width || 4) / 2;
      for (let i = 0; i <= 160; i++) {
        const d = distance - 10 + i * 7.5,
          p = pathPoint(d),
          f = forward(d),
          side = new T.Vector3(-f.z, 0, f.x);
        for (let s = 0; s < 2; s++) {
          const q = p.clone().addScaledVector(side, (s ? 1 : -1) * half);
          data.setXYZ(i * 2 + s, q.x, 0.025, q.z);
          road.geometry.attributes.uv.setXY(i * 2 + s, s * 2, d / 8);
        }
        const p2 = pathPoint(d + 7.5),
          f2 = forward(d + 7.5),
          side2 = new T.Vector3(-f2.z, 0, f2.x);
        for (let s = 0; s < 2; s++) {
          const sign = s ? 1 : -1;
          const a = p.clone().addScaledVector(side, half * sign),
            b = p2.clone().addScaledVector(side2, half * sign);
          edges.setXYZ(i * 4 + s * 2, a.x, 0.04, a.z);
          edges.setXYZ(i * 4 + s * 2 + 1, b.x, 0.04, b.z);
        }
      }
      data.needsUpdate = true;
      road.geometry.attributes.uv.needsUpdate = true;
      edges.needsUpdate = true;
      road.geometry.computeVertexNormals();
      road.geometry.computeBoundingSphere();
      roadEdges.geometry.computeBoundingSphere();
    }
    function makeTerrain() {
      const g = new T.PlaneGeometry(3200, 2400, 72, 72);
      g.rotateX(-Math.PI / 2);
      geometry.push(g);
      terrain = mesh(g, palettes[id][1], 0, -0.06, 0);
      terrain.material.side = T.DoubleSide;
      const texture = surface('ground');
      texture.repeat.set(150, 120);
      terrain.material.map = texture;
      terrain.material.bumpMap = texture;
      terrain.material.bumpScale = 0.035;
      const a = g.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i),
          z = a.getZ(i),
          edge = Math.max(0, Math.abs(x) - 18),
          mountain =
            id === 'rockies' ? 2.6 : id === 'mountain-bike' ? 0.7 : id === 'france' ? 1.2 : 0.25;
        let y =
          -0.1 +
          Math.min(edge / 100, 1) *
            (Math.sin(x * 0.008 + z * 0.0014) * Math.cos(z * 0.004) * 22 * mountain +
              edge * 0.08 * mountain);
        if (['pittsburgh', 'salt-flats', 'beach'].includes(id)) y = -0.12;
        a.setY(i, y);
      }
      g.computeVertexNormals();
    }
    function makeWater() {
      if (!['pittsburgh', 'beach', 'salt-flats'].includes(id)) return;
      const color = id === 'salt-flats' ? 0xc5d5d4 : id === 'beach' ? 0x399eb8 : 0x366b83;
      let g;
      if (id === 'pittsburgh') {
        g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(new Float32Array(161 * 2 * 3), 3));
        const indices = [];
        for (let i = 0; i < 160; i++) {
          const a = i * 2;
          indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
        g.setIndex(indices);
      } else g = new T.PlaneGeometry(1200, 9000);
      if (id !== 'pittsburgh') g.rotateX(-Math.PI / 2);
      geometry.push(g);
      const m = mesh(
        g,
        mat(color, { roughness: 0.3, metalness: 0.3, side: T.DoubleSide }),
        0,
        0,
        0
      );
      water.push(m);
    }
    function props() {
      const pine = ['rockies', 'west-virginia'].includes(id),
        desert = id === 'mountain-bike',
        empty = id === 'salt-flats';
      for (let i = 0; i < 100; i++) {
        const g = new T.Group(),
          tree = !empty && !desert;
        if (tree) {
          const trunk = new T.Mesh(trunkGeo, mat(0x63523c));
          trunk.scale.set(1, 4, 1);
          trunk.position.y = 2;
          g.add(trunk);
          const leaf = new T.Mesh(
            pine ? pineGeo : leafGeo,
            mat(i % 3 === 0 ? 0x547445 : i % 3 === 1 ? 0x3a6545 : 0x6f8751)
          );
          leaf.scale.set(pine ? 2.2 : 3.6, pine ? 9 : 3.4, pine ? 2.2 : 3.2);
          leaf.position.y = pine ? 7 : 6;
          leaf.scale.multiplyScalar(0.7 + random(i) * 0.3);
          if (!leaf.material.map) {
            leaf.material.map = surface('foliage');
            leaf.material.bumpMap = leaf.material.map;
            leaf.material.bumpScale = 0.25;
          }
          if (pine) {
            for (let n = 0; n < 2; n++) {
              const tier = new T.Mesh(pineGeo, leaf.material);
              tier.position.y = 3 + n * 2;
              tier.scale.set(2.8 - n * 0.4, 4.5, 2.8 - n * 0.4);
              g.add(tier);
            }
          }
          g.add(leaf);
        } else if (!empty) {
          const rock = new T.Mesh(leafGeo, mat(desert ? 0xa96544 : 0xc9ba93));
          rock.scale.set(3 + random(i) * 4, 1 + random(i + 1) * 2, 3);
          rock.position.y = 0.3;
          g.add(rock);
        }
        if (empty) {
          const pole = new T.Mesh(unitBox, mat(0x98a9a6));
          pole.scale.set(0.07, 0.8, 0.07);
          pole.position.y = 0.4;
          g.add(pole);
        }
        group.add(g);
        roadside.push({
          g,
          offset: i * 9 + random(i + 7) * 5,
          side:
            id === 'pittsburgh' ? -10 - random(i) * 8 : (i % 2 ? 1 : -1) * (12 + random(i) * 30),
          seed: i
        });
      }
      if (id === 'pittsburgh') {
        // River edge rail, lamps and benches move past the rider in world space.
        for (let i = 0; i < 65; i++) {
          const g = new T.Group();
          const pole = new T.Mesh(unitBox, mat(0x3d4c4e));
          pole.scale.set(0.12, 4, 0.12);
          pole.position.y = 2;
          g.add(pole);
          const lamp = new T.Mesh(unitBox, mat(0xe3d4a4, { emissive: 0x675735 }));
          lamp.scale.set(0.65, 0.12, 0.3);
          lamp.position.set(0.25, 4, 0);
          g.add(lamp);
          group.add(g);
          roadside.push({ g, offset: i * 15, side: 3.7, seed: i });
        }
      }
      if (id === 'france')
        for (let i = 0; i < 14; i++) {
          const g = new T.Group(),
            house = new T.Mesh(unitBox, mat(i % 2 ? 0xd0ba91 : 0xe2cfae));
          house.scale.set(9, 7, 8);
          house.position.y = 3.5;
          g.add(house);
          const roofGeo = new T.ConeGeometry(8, 4, 4);
          geometry.push(roofGeo);
          const roof = new T.Mesh(roofGeo, mat(0x9c6550));
          roof.rotation.y = Math.PI / 4;
          roof.position.y = 9;
          g.add(roof);
          group.add(g);
          roadside.push({ g, offset: i * 70, side: (i % 2 ? 1 : -1) * 22, seed: i });
        }
    }
    function makeSeaPinesLandmarks() {
      // Distinctive simplified 3D landmarks, fixed to approximate route mile markers.
      // The model is intentionally not presented as survey-grade 3D geometry.
      function at(d, side) { return atOffset(d, side); }
      function structure(d, side, color, sx, sy, sz) {
        const p = at(d, side);
        return box(color, p.x, sy / 2, p.z, sx, sy, sz);
      }
      // Harbour Town lighthouse: red and white bands, lantern and cap.
      const p = at(7600, -45);
      for (let i = 0; i < 8; i++) {
        const level = box(i % 2 ? 0xf0eee5 : 0xb9322e, p.x, 2.5 + i * 5, p.z, 8.5 - i * 0.52, 5, 8.5 - i * 0.52);
        level.rotation.y = Math.PI / 4;
      }
      box(0x33494d, p.x, 43.2, p.z, 7.2, 3.2, 7.2);
      box(0x8d3432, p.x, 46.1, p.z, 9.5, 2.5, 9.5);
      // Yacht basin: docks and moored sailboats facing Calibogue Sound.
      for (let i = 0; i < 7; i++) {
        const q = at(8150 + i * 35, -55 - (i % 3) * 11);
        box(0x765e42, q.x, 0.3, q.z, 14, 0.5, 3);
        box(0xe9e9de, q.x + 5, 0.9, q.z + 5, 7, 1.2, 2.4);
        box(0xdad8c9, q.x + 5, 8, q.z + 5, 0.2, 15, 0.2);
      }
      // Marina Village and beach club rooflines, kept deliberately lightweight.
      for (let i = 0; i < 5; i++) structure(13900 + i * 24, 40, i % 2 ? 0xc9ad85 : 0xe0c6a0, 16, 8, 12);
      for (let i = 0; i < 3; i++) structure(i * 40, 35, 0xd6c4a1, 22, 7, 14);
      // Golf course green beside Harbour Town; live oak canopy elsewhere.
      structure(6850, 55, 0x5d9a53, 90, 0.15, 55);
    }
    function batchProps() {
      const pools = new Map();
      for (const o of roadside) {
        o.g.visible = false;
        o.g.updateMatrixWorld(true);
        for (const child of o.g.children) {
          if (!child.isMesh) continue;
          const key = child.geometry.uuid + '|' + child.material.uuid;
          if (!pools.has(key)) pools.set(key, []);
          pools.get(key).push({ o, child });
        }
      }
      for (const entries of pools.values()) {
        const first = entries[0].child,
          mesh = new T.InstancedMesh(first.geometry, first.material, entries.length);
        mesh.frustumCulled = false;
        group.add(mesh);
        batches.push({ mesh, entries });
      }
    }
    function clear() {
      group.traverse((o) => {
        if (o.isLine && o.material) o.material.dispose();
      });
      group.clear();
      geometry.splice(0).forEach((g) => g.dispose());

      sky = null;
      mountains = null;

      roadside.length = 0;
      water.length = 0;
      batches.length = 0;
    }
    function build(theme) {
      clear();
      id = ids[theme] || ids[0];
      lastTheme = theme;
      scene.background = new T.Color(palettes[id][0]);
      scene.fog = new T.Fog(palettes[id][0], id === 'pittsburgh' ? 1600 : 750, 6000);
      makeSky();
      makeMountains();
      makeTerrain();
      makeRoad();
      makeWater();
      props();
      batchProps();
      if (id === 'pittsburgh') {
        routes.ROUTES.pittsburgh.buildings.forEach(building);
        routes.ROUTES.pittsburgh.points
          .filter((p) => /Bridge/.test(p.name))
          .forEach((p) => bridge(p.m, /Clemente|Warhol|Carson/.test(p.name)));
        // North bank stadium masses sit opposite the downtown skyline.
        // Approximate landmark footprints anchored to real-world coordinates; not survey geometry.
        const base = routes.ROUTES.pittsburgh.path[0];
        const stadiums = [
          { lat: 40.4468, lon: -80.0158, rx: 115, rz: 88, color: 0xb4ac94 }, // Acrisure Stadium
          { lat: 40.4469, lon: -80.0057, rx: 82, rz: 75, color: 0xb69a78 } // PNC Park
        ];
        for (const st of stadiums) {
          const x = (st.lon - base[1]) * 84700, z = -(st.lat - base[0]) * 111320;
          const bowlGeo = new T.CylinderGeometry(1, 1, 28, 48, 1, true);
          geometry.push(bowlGeo);
          const bowl = mesh(bowlGeo, st.color, x, 14, z);
          bowl.scale.set(st.rx, 1, st.rz);
          const fieldGeo = new T.CircleGeometry(1, 48);
          geometry.push(fieldGeo);
          const field = mesh(fieldGeo, 0x477b45, x, 3, z);
          field.rotation.x = -Math.PI / 2;
          field.scale.set(st.rx * 0.72, st.rz * 0.72, 1);
          const rimGeo = new T.TorusGeometry(1, 0.035, 6, 48);
          geometry.push(rimGeo);
          const rim = mesh(rimGeo, 0xe1ddd1, x, 28, z);
          rim.rotation.x = Math.PI / 2;
          rim.scale.set(st.rx, st.rz, 1);
        }
      }
    }
    function resize(w, h) {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    let viewYaw = 0, viewPitch = 0;
    function setView(yaw, pitch) {
      viewYaw = Math.max(-Math.PI, Math.min(Math.PI, Number(yaw) || 0));
      viewPitch = Math.max(-0.65, Math.min(0.65, Number(pitch) || 0));
    }
    function draw(theme, position) {
      if (disposed || failed) return false;
      try {
        if (theme !== lastTheme) build(theme);
        const length = routes.ROUTES[id]?.length || 1e9,
          d = id === 'pittsburgh' ? Math.min(position, length - 2) : position;
        const p = pathPoint(d),
          f = forward(d),
          right = new T.Vector3(-f.z, 0, f.x);
        // North Shore looks slightly across the river while following the trail.
        camera.position.copy(p).add(new T.Vector3(0, 1.65, 0));
        const look = p
          .clone()
          .addScaledVector(f, 35)
          .addScaledVector(right, id === 'pittsburgh' ? 7 : 0);
        look.y = 1.4;
        const heading = Math.atan2(f.x, -f.z) + viewYaw;
        const horizontal = 35 * Math.cos(viewPitch);
        look.set(camera.position.x + Math.sin(heading) * horizontal,
          camera.position.y + Math.sin(viewPitch) * 35,
          camera.position.z - Math.cos(heading) * horizontal);
        camera.lookAt(look);
        if (terrain) terrain.position.set(p.x, -0.06, p.z - 450);
        if (sky) sky.position.copy(camera.position);
        if (mountains) mountains.position.set(p.x * 0.85, -1, p.z * 0.85 - 2200);
        for (const o of roadside) {
          const ahead = (((o.offset - d) % 950) + 950) % 950,
            along = d + ahead,
            pos = atOffset(id === 'pittsburgh' ? Math.min(along, length - 1) : along, o.side);
          o.g.position.copy(pos);
          o.g.visible = false;
        }
        for (const o of roadside) o.g.updateMatrixWorld(true);
        for (const batch of batches) {
          batch.entries.forEach((entry, i) => {
            const matrix = entry.child.matrixWorld.clone();
            if (
              !entry.o.g.visible &&
              id === 'pittsburgh' &&
              d + ((((entry.o.offset - d) % 950) + 950) % 950) >= length - 1
            )
              matrix.scale(new T.Vector3(0, 0, 0));
            batch.mesh.setMatrixAt(i, matrix);
          });
          batch.mesh.instanceMatrix.needsUpdate = true;
        }
        for (const m of water) {
          const off = atOffset(d, id === 'pittsburgh' ? 163 : id === 'beach' ? 650 : 0);
          if (id === 'pittsburgh') {
            const a = m.geometry.attributes.position;
            for (let i = 0; i <= 160; i++) {
              const along = d - 10 + i * 7.5;
              for (let s = 0; s < 2; s++) {
                const v = atOffset(along, s ? 380 : 6);
                a.setXYZ(i * 2 + s, v.x, -0.025, v.z);
              }
            }
            a.needsUpdate = true;
            m.geometry.computeVertexNormals();
            m.geometry.computeBoundingSphere();
          } else {
            m.position.set(off.x + f.x * 1500, -0.02, off.z + f.z * 1500);
            m.rotation.y = Math.atan2(f.x, -f.z);
          }
        }
        updateRoad(d);
        renderer.render(scene, camera);
        canvas.hidden = false;
        fallback.style.visibility = 'hidden';
        lastPosition = position;
        rendered++;
        return true;
      } catch (e) {
        failed = true;
        canvas.hidden = true;
        fallback.style.visibility = '';
        root.console?.warn('Ride graphics fallback', e);
        return false;
      }
    }
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      failed = true;
      canvas.hidden = true;
      fallback.style.visibility = '';
    });
    canvas.addEventListener('webglcontextrestored', () => {
      failed = false;
    });
    return {
      setView,
      draw,
      resize,
      // The worker acknowledges GPU completion, not just command submission.
      // This bounds the actual GPU queue on slower devices and software renderers.
      async waitForFrame() {
        const gl = renderer.getContext();
        if (!gl.fenceSync) {
          gl.finish();
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        if (!sync) throw Error('Graphics synchronization unavailable');
        try {
          await new Promise((resolve, reject) => {
            const started = Date.now();
            const poll = () => {
              if (Date.now() - started > 2000) {
                reject(Error('Graphics GPU fence timeout'));
                return;
              }
              if (gl.isContextLost()) {
                reject(Error('Graphics context lost'));
                return;
              }
              const status = gl.clientWaitSync(sync, 0, 0);
              if (status === gl.TIMEOUT_EXPIRED) root.setTimeout(poll, 8);
              else if (status === gl.WAIT_FAILED) reject(Error('Graphics completion failed'));
              else resolve();
            };
            poll();
          });
        } finally {
          gl.deleteSync(sync);
        }
      },
      snapshot: () => ({
        renderer: 'webgl',
        scene: id,
        position: lastPosition,
        frames: rendered,
        width,
        height,
        failed,
        drawCalls: renderer.info.render.calls,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures
      }),
      dispose() {
        disposed = true;
        clear();
        unitBox.dispose();
        trunkGeo.dispose();
        leafGeo.dispose();
        pineGeo.dispose();
        materials.forEach((m) => m.dispose());
        materials.clear();
        textures.splice(0).forEach((t) => t.dispose());
        textureCache.clear();
        renderer.dispose();
        canvas.remove();
      }
    };
  }
  root.NonZeroImmersive = { create };
})(typeof window !== 'undefined' ? window : globalThis);
