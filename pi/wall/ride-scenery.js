/* Route-grounded offline scenery. Simplified geography and architecture, not navigation or photographic footage. */
(function (root) {
  'use strict';
  const THEMES = [
    {
      id: 'pittsburgh',
      name: 'PITTSBURGH · THREE RIVERS',
      sky: ['#102e53', '#648ba6', '#f3ba83'],
      land: '#254c42',
      road: '#343b46',
      accent: '#f3c94b',
      landmarks: ['POINT STATE PARK', 'THE GOLDEN BRIDGES', 'GLASS SPIRES', 'NORTH SHORE']
    },
    {
      id: 'west-virginia',
      name: 'WEST VIRGINIA · COUNTRY ROADS',
      sky: ['#4589b5', '#a4c9cf', '#f8e8bf'],
      land: '#536a35',
      road: '#444844',
      accent: '#e6d29a',
      landmarks: ['APPALACHIAN RIDGE', 'THE RED BARN', 'WILDFLOWER VALLEY', 'COUNTRY ROAD HOME']
    },
    {
      id: 'mountain-bike',
      name: 'MOUNTAIN BIKE · FOREST TRAIL',
      sky: ['#314b60', '#839e9a', '#d2d6ab'],
      land: '#304e31',
      road: '#8a7050',
      accent: '#bca17b',
      landmarks: ['CEDAR GROVE', 'ROCK GARDEN', 'FERN CREEK', 'RIDGELINE TRAIL']
    },
    {
      id: 'beach',
      name: 'HILTON HEAD · SEA PINES TOUR',
      sky: ['#347cad', '#9ad5de', '#f9e4bb'],
      land: '#b5b18a',
      road: '#dfd1ab',
      accent: '#eee0b8',
      landmarks: ['SEA PINES BEACH CLUB', 'HARBOUR TOWN LIGHTHOUSE', 'SOUTH BEACH MARINA', 'ATLANTIC BEACH']
    },
    {
      id: 'salt-flats',
      name: 'SALT FLATS · HORIZON',
      sky: ['#346aa0', '#a8cfde', '#f0d2aa'],
      land: '#d7dcd9',
      road: '#c0c9c7',
      accent: '#f9fbf5',
      landmarks: ['THE MIRROR', 'SILVER HORIZON', 'SALT CRYSTAL PLAIN', 'THE GREAT OPEN']
    },
    {
      id: 'rockies',
      name: 'ROCKY MOUNTAINS · HIGH COUNTRY',
      sky: ['#204a7b', '#82abc5', '#dfddd0'],
      land: '#4d6056',
      road: '#424a4f',
      accent: '#eee2c2',
      landmarks: ['ALPINE LAKE', 'THE CONTINENTAL RIDGE', 'GRANITE PASS', 'HIGH COUNTRY VISTA']
    },
    {
      id: 'france',
      name: 'FRANCE · GRAND TOUR',
      sky: ['#3c7eac', '#b4d7d8', '#f8e3be'],
      land: '#6d843e',
      road: '#575951',
      accent: '#f0dfae',
      landmarks: ['SUNFLOWER VALLEY', 'THE VILLAGE SQUARE', 'LACETS DU COL', 'THE SUMMIT BANNER']
    }
  ];
  if (root.NonZeroRoutes)
    THEMES.forEach((t) => {
      const r = root.NonZeroRoutes.ROUTES[t.id];
      if (r) {
        t.name = r.name;
        t.landmarks = r.points.map((p) => p.name);
      }
    });
  const rand = (n) => {
      const x = Math.sin(n * 127.13 + 19.7) * 43758.5453;
      return x - Math.floor(x);
    },
    poly = (c, p, color) => {
      c.fillStyle = color;
      c.beginPath();
      p.forEach((v, i) => (i ? c.lineTo(...v) : c.moveTo(...v)));
      c.closePath();
      c.fill();
    };
  function create(canvas) {
    const c = canvas.getContext('2d', { alpha: false }),
      back = document.createElement('canvas'),
      b = back.getContext('2d', { alpha: false });
    let key = '',
      w = 0,
      h = 0,
      T = null,
      world = '';
    function ridge(layer, base, amplitude, color) {
      const points = [[0, h]],
        profile = [];
      for (let i = 0; i <= 240; i++) {
        const x = i / 240,
          phase = layer * 1.7;
        let shape =
          0.48 +
          Math.sin(x * 6.2 + phase) * 0.21 +
          Math.sin(x * 16.7 + phase * 0.7) * 0.13 +
          Math.sin(x * 37.9 + phase * 2) * 0.055 +
          Math.sin(x * 91.3 + phase) * 0.018;
        if (world === 'rockies' || world === 'france')
          shape += Math.abs(Math.sin(x * 19.7 + phase)) * 0.14;
        const y = (base - amplitude * shape) * h;
        points.push([x * w, y]);
        profile.push([x * w, y]);
      }
      points.push([w, h]);
      const gradient = b.createLinearGradient(0, h * (base - amplitude), 0, h * base);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, layer < 3 ? '#789396' : T.land);
      poly(b, points, gradient);
      if (world === 'rockies' && layer < 4) {
        for (let i = 0; i < profile.length - 1; i++) {
          const a = profile[i],
            z = profile[i + 1],
            limit = h * (0.345 + layer * 0.013);
          if (a[1] < limit && z[1] < limit) {
            poly(
              b,
              [
                a,
                z,
                [z[0], Math.min(limit, z[1] + h * (0.012 + rand(i + layer * 241) * 0.022))],
                [a[0], Math.min(limit, a[1] + h * (0.012 + rand(i + layer * 241 - 1) * 0.022))]
              ],
              layer < 2 ? '#e7ece7' : '#c2d4d2'
            );
          }
        }
      }
      return points;
    }

    function build(index) {
      w = canvas.width;
      h = canvas.height;
      T = THEMES[index];
      world = T.id;

      back.width = w;
      back.height = h;
      const g = b.createLinearGradient(0, 0, 0, h * 0.7);
      T.sky.forEach((v, i) => g.addColorStop(i / 2, v));
      b.fillStyle = g;
      b.fillRect(0, 0, w, h);
      const sun = b.createRadialGradient(w * 0.76, h * 0.27, 0, w * 0.76, h * 0.27, h * 0.3);
      sun.addColorStop(0, '#fff0ce88');
      sun.addColorStop(0.15, '#ffeecb18');
      sun.addColorStop(1, '#fff0');
      b.fillStyle = sun;
      b.fillRect(0, 0, w, h);
      b.fillStyle = '#fff1cd';
      b.beginPath();
      b.arc(w * 0.76, h * 0.27, h * 0.024, 0, Math.PI * 2);
      b.fill();
      for (let l = 0; l < 6; l++) {
        const color = ['#9cb1b8', '#829fa6', '#6e9097', '#557d7d', '#3b6764', T.land][l];
        ridge(
          l,
          0.47 + l * 0.017,
          (world === 'rockies' ? 0.38 : world === 'france' ? 0.21 : 0.1) * (1 - l * 0.08),
          color
        );
      }

      if (['beach', 'salt-flats', 'pittsburgh'].includes(world)) {
        const g = b.createLinearGradient(0, h * 0.49, 0, h);
        g.addColorStop(0, world === 'salt-flats' ? '#bbd0d1' : '#76abb7');
        g.addColorStop(1, world === 'salt-flats' ? '#e8eae1' : '#21576b');
        b.fillStyle = g;
        b.fillRect(0, h * 0.52, w, h * 0.48);
      }
      key = index + '|' + w + '|' + h;
    }

    function cityScene(distance) {
      const camera = root.NonZeroRoutes?.geo('pittsburgh', distance);
      if (!camera) return;
      const route = root.NonZeroRoutes.ROUTES.pittsburgh,
        focal = w * 0.58,
        base = h * 0.55,
        view = camera.heading + 0.4;
      const render = [];
      for (const a of route.buildings) {
        const east = (a.lon - camera.lon) * 111320 * Math.cos((camera.lat * Math.PI) / 180),
          north = (a.lat - camera.lat) * 111320;
        const z = east * Math.sin(view) + north * Math.cos(view),
          x = east * Math.cos(view) - north * Math.sin(view);
        if (z < 35) continue;
        const scale = focal / z,
          sx = w * 0.5 + x * scale,
          bw = a.width * scale,
          bh = a.height * scale;
        if (sx + bw < -100 || sx - bw > w + 100) continue;
        render.push({ ...a, z, sx, bw, bh, scale });
      }
      render.sort((a, b) => b.z - a.z);
      for (const a of render) {
        const x = a.sx - a.bw * 0.5,
          y = base - a.bh,
          depth = a.bw * 0.22;
        const glass = c.createLinearGradient(x, 0, x + a.bw, 0);
        glass.addColorStop(0, a.color);
        glass.addColorStop(0.48, '#c1d3d3');
        glass.addColorStop(0.5, a.color);
        glass.addColorStop(1, '#526d79');
        c.fillStyle = a.kind === 'steel' ? '#785c4c' : glass;
        c.fillRect(x, y, a.bw, a.bh);
        poly(
          c,
          [
            [x + a.bw, y],
            [x + a.bw + depth, y - depth * 0.25],
            [x + a.bw + depth, base - depth * 0.25],
            [x + a.bw, base]
          ],
          a.kind === 'steel' ? '#493e39' : '#45606a'
        );
        poly(
          c,
          [
            [x, y],
            [x + depth, y - depth * 0.25],
            [x + a.bw + depth, y - depth * 0.25],
            [x + a.bw, y]
          ],
          '#b9c9c5'
        );
        const floors = Math.max(10, Math.round(a.height / 4)),
          cols = Math.max(4, Math.round(a.width / 4));
        c.fillStyle = a.kind === 'steel' ? '#262b2b88' : '#294b6160';
        for (let j = 1; j < floors; j++)
          for (let k = 1; k < cols; k++)
            c.fillRect(
              x + (k * a.bw) / cols,
              y + (j * a.bh) / floors,
              (a.bw / cols) * 0.45,
              Math.max(0.5, (a.bh / floors) * 0.45)
            );
        if (a.kind === 'ppg') {
          for (const dx of [0, 0.2, 0.8, 1]) {
            const px = x + dx * a.bw;
            poly(
              c,
              [
                [px - a.bw * 0.06, y],
                [px, y - a.bh * 0.15],
                [px + a.bw * 0.06, y]
              ],
              '#a6c2c7'
            );
          }
        }
        if (a.kind === 'pyramid')
          poly(
            c,
            [
              [x, y],
              [x + a.bw * 0.5, y - a.bw * 0.6],
              [x + a.bw, y]
            ],
            '#88a6ad'
          );
        if (a.kind === 'stepped')
          for (let j = 0; j < 3; j++) {
            c.fillStyle = j % 2 ? '#b6af9b' : '#d2c2a5';
            c.fillRect(
              x + a.bw * (0.16 + j * 0.08),
              y - a.bw * (0.16 + j * 0.11),
              a.bw * (0.68 - j * 0.16),
              a.bw * 0.14
            );
          }
        // Reflections stay under their building, rather than forming a generic skyline band.
        c.globalAlpha = 0.13;
        c.fillStyle = a.color;
        c.fillRect(x, base + 3, a.bw, Math.min(a.bh * 0.35, h * 0.12));
        c.globalAlpha = 1;
      }
      // A golden sister bridge is encountered once, at its route position.

      const bridges = route.points.filter((p) => /Clemente|Warhol|Carson/.test(p.name));
      for (const stop of bridges) {
        const ahead = stop.m - distance;
        if (ahead < 25 || ahead > 650) continue;
        const scale = 1 / (1 + ahead / 100),
          deck = h * (0.48 + 0.16 * scale),
          tower = h * 0.24 * scale,
          left = w * 0.48,
          right = w * 1.08;
        c.strokeStyle = '#bd952c';
        c.lineWidth = Math.max(2, w * 0.006 * scale);
        c.beginPath();
        c.moveTo(left, deck);
        c.lineTo(right, deck);
        c.stroke();
        for (const tx of [w * 0.64, w * 0.96]) {
          c.fillStyle = '#d5af3b';
          c.fillRect(tx, deck - tower, w * 0.008 * scale, tower + h * 0.03);
          c.beginPath();
          c.moveTo(tx - w * 0.22 * scale, deck);
          c.quadraticCurveTo(tx, deck - tower * 1.7, tx + w * 0.22 * scale, deck);
          c.stroke();
        }
      }
    }
    function terrainDetail(route) {
      const biome = route?.biome || '',
        summit = ['limestone', 'summit', 'tundra', 'rock'].includes(biome);
      if (summit) {
        const g = c.createLinearGradient(0, h * 0.42, 0, h);
        g.addColorStop(0, world === 'france' ? '#d5d0bb' : '#9baba3');
        g.addColorStop(1, world === 'france' ? '#a8a48e' : '#576e60');
        c.fillStyle = g;
        c.fillRect(0, h * 0.49, w, h * 0.51);
      }
      if (world === 'mountain-bike') {
        const g = c.createLinearGradient(0, h * 0.43, 0, h);
        g.addColorStop(0, '#c88657');
        g.addColorStop(1, '#8e553d');
        c.fillStyle = g;
        c.fillRect(0, h * 0.52, w, h * 0.48);
      }
      if (world === 'beach') {
        const g = c.createLinearGradient(0, h * 0.5, 0, h);
        g.addColorStop(0, '#e0d4aa');
        g.addColorStop(1, '#a2946a');
        c.fillStyle = g;
        c.fillRect(0, h * 0.55, w * 0.7, h * 0.45);
      }
      if (world === 'france' && biome === 'village') {
        for (let i = 0; i < 8; i++) {
          const x = w * (0.06 + i * 0.065),
            y = h * (0.49 + Math.sin(i) * 0.008),
            bw = w * 0.045,
            bh = h * (0.025 + rand(i) * 0.04);
          c.fillStyle = i % 2 ? '#d9c5a0' : '#bfae8e';
          c.fillRect(x, y - bh, bw, bh);
          poly(
            c,
            [
              [x - bw * 0.1, y - bh],
              [x + bw * 0.5, y - bh - bw * 0.3],
              [x + bw * 1.1, y - bh]
            ],
            '#9c674c'
          );
          c.fillStyle = '#4f6358';
          c.fillRect(x + bw * 0.15, y - bh * 0.7, bw * 0.14, bh * 0.28);
        }
      }
      if (world === 'france' && route?.distance > 18500) {
        const scale = (route.distance - 18500) / 3000,
          x = w * 0.57,
          y = h * 0.38,
          sz = h * (0.02 + scale * 0.07);
        c.fillStyle = '#e2e0d4';
        c.fillRect(x, y - sz, sz * 0.28, sz);
        c.fillRect(x - sz * 0.1, y - sz * 0.7, sz * 0.48, sz * 0.1);
        c.strokeStyle = '#b9c8c9';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x + sz * 0.14, y - sz);
        c.lineTo(x + sz * 0.14, y - sz * 1.55);
        c.stroke();
      }
    }
    function tree(x, y, size, pine, seed) {
      c.fillStyle = '#453d2d';
      c.fillRect(x - size * 0.045, y - size * 0.74, size * 0.09, size * 0.75);
      if (pine) {
        for (let j = 0; j < 4; j++)
          poly(
            c,
            [
              [x, y - size * (1.3 - j * 0.22)],
              [x - size * (0.24 + j * 0.065), y - size * (0.67 - j * 0.23)],
              [x + size * (0.24 + j * 0.065), y - size * (0.67 - j * 0.23)]
            ],
            ['#203d33', '#294d3c', '#355e43', '#3d6947'][j]
          );
      } else {
        for (let j = 0; j < 7; j++) {
          c.fillStyle = ['#48633a', '#55723e', '#657e44'][j % 3];
          c.beginPath();
          c.ellipse(
            x + (rand(seed + j) - 0.5) * size * 0.65,
            y - size * (0.7 + rand(seed + j + 10) * 0.4),
            size * 0.34,
            size * 0.27,
            0,
            0,
            Math.PI * 2
          );
          c.fill();
        }
      }
    }
    function draw(index, position, time = 0) {
      if (key !== index + '|' + canvas.width + '|' + canvas.height) build(index);
      // Continuous route geometry stays active; photographs no longer replace the ride.
      c.drawImage(back, 0, 0);
      const route = root.NonZeroRoutes?.progress(world, position);
      terrainDetail(route);
      if (world === 'pittsburgh') cityScene(position);
      const horizon = h * 0.52;
      // Clouds move gently; scenery travel remains cadence driven.
      for (let i = 0; i < 7; i++) {
        const x = ((rand(i + 81) * w + time * w * 0.000001 * (1 + i * 0.04)) % (w * 1.4)) - w * 0.2,
          y = h * (0.12 + rand(i + 21) * 0.19);
        c.fillStyle = '#ffffff14';
        for (let j = 0; j < 5; j++) {
          c.beginPath();
          c.ellipse(
            x + j * w * 0.016,
            y - Math.sin(j) * h * 0.008,
            w * 0.037,
            h * 0.012,
            0,
            0,
            Math.PI * 2
          );
          c.fill();
        }
      }
      if (['beach', 'pittsburgh', 'salt-flats'].includes(world)) {
        for (let i = 0; i < 32; i++) {
          const p = i / 32,
            y = h * (0.535 + p * p * 0.46),
            offset = Math.sin(time * 0.0005 + i * 0.7) * w * 0.006;
          c.strokeStyle = world === 'salt-flats' ? '#ffffff45' : '#dbf7ec32';
          c.lineWidth = Math.max(1, p * h * 0.002);
          c.beginPath();
          c.moveTo(offset, y);
          c.lineTo(w * 0.38 + offset, y);
          c.stroke();
        }
      }
      const rows = [],
        trail = world === 'mountain-bike',
        salt = world === 'salt-flats';
      for (let i = 0; i <= 128; i++) {
        const p = i / 128,
          d = p * p,
          curve =
            (Math.sin(position * 0.0006 + p * 2.1) * 0.12 +
              Math.sin(position * 0.00029 + p * 4) * 0.045) *
            (1 - p),
          center = w * (0.52 + curve),
          half = w * (0.002 + d * (trail ? 0.22 : salt ? 0.63 : 0.46));
        rows.push({ y: horizon + (h - horizon) * d, center, half, p, d });
      }
      const ground = c.createLinearGradient(0, horizon, 0, h);
      ground.addColorStop(
        0,
        salt
          ? '#cededc'
          : world === 'beach'
            ? '#ccbf96'
            : world === 'mountain-bike'
              ? '#b97b52'
              : route?.biome === 'limestone' || route?.biome === 'summit'
                ? '#c3bfaa'
                : route?.biome === 'tundra'
                  ? '#8d9278'
                  : world === 'france'
                    ? '#9b9e61'
                    : '#607f56'
      );
      ground.addColorStop(
        1,
        salt
          ? '#e6e8df'
          : world === 'beach'
            ? '#b5a582'
            : world === 'mountain-bike'
              ? '#9d6544'
              : route?.biome === 'limestone' || route?.biome === 'summit'
                ? '#a8a590'
                : route?.biome === 'tundra'
                  ? '#6b7864'
                  : T.land
      );
      if (!salt)
        poly(
          c,
          [[0, h], ...rows.map((r) => [r.center - r.half * 1.07, r.y]).reverse(), [0, horizon]],
          ground
        );
      if (!['beach', 'pittsburgh', 'salt-flats'].includes(world))
        poly(
          c,
          [[w, h], [w, horizon], ...rows.map((r) => [r.center + r.half * 1.07, r.y])],
          ground
        );
      const asphalt = c.createLinearGradient(0, horizon, 0, h);
      asphalt.addColorStop(0, salt ? '#c9d6d3' : trail ? '#a58b64' : '#768385');
      asphalt.addColorStop(1, salt ? '#d7deda' : trail ? '#765e40' : '#30383c');
      poly(
        c,
        [
          ...rows.map((r) => [r.center - r.half, r.y]),
          ...rows
            .slice()
            .reverse()
            .map((r) => [r.center + r.half, r.y])
        ],
        asphalt
      );
      for (let i = 0; i < rows.length - 1; i++) {
        const a = rows[i],
          z = rows[i + 1],
          stripe = Math.floor(position / 7 + i * i * 0.08) % 2;
        if (!trail && !salt && !['pittsburgh', 'west-virginia', 'beach'].includes(world)) {
          for (const sign of [-1, 1])
            poly(
              c,
              [
                [a.center + sign * a.half, a.y],
                [a.center + sign * a.half - a.half * 0.013, a.y],
                [z.center + sign * z.half - z.half * 0.013, z.y],
                [z.center + sign * z.half, z.y]
              ],
              '#f4e9c9bb'
            );
          if (stripe)
            poly(
              c,
              [
                [a.center - a.half * 0.008, a.y],
                [a.center + a.half * 0.008, a.y],
                [z.center + z.half * 0.008, z.y],
                [z.center - z.half * 0.008, z.y]
              ],
              '#edcf8cbb'
            );
        }
      }
      // Fine-grain surfaces and near-field detail prevent broad flat color bands.
      for (let i = 0; i < 500; i++) {
        const p = (rand(i + 410) + position / 6500) % 1,
          r = rows[Math.min(127, Math.floor(p * 128))],
          x = r.center + (rand(i + 312) - 0.5) * r.half * 1.9;
        c.fillStyle = i % 2 ? '#ffffff10' : '#10191618';
        c.fillRect(x, r.y, Math.max(1, r.d * w * 0.001), Math.max(0.5, r.d * h * 0.0008));
      }
      if (!['pittsburgh', 'salt-flats', 'beach'].includes(world)) {
        for (let i = 0; i < 290; i++) {
          const p = (rand(i + 721) + position / 3500) % 1,
            r = rows[Math.min(127, Math.floor(p * 128))],
            side = i % 2 ? 1 : -1,
            x = r.center + side * r.half * (1.12 + rand(i + 12) * 6),
            size = Math.max(0.4, r.d * h * 0.008);
          c.strokeStyle = i % 3 ? '#97a66d30' : '#162e2928';
          c.lineWidth = Math.max(0.5, size * 0.12);
          c.beginPath();
          c.moveTo(x, r.y);
          c.lineTo(x - size * 0.3, r.y - size);
          c.stroke();
          if (world === 'france' && route?.biome === 'vineyard' && i % 2 === 0) {
            c.fillStyle = '#eccb58';
            c.beginPath();
            c.arc(x, r.y - size, size * 0.22, 0, 7);
            c.fill();
          }
        }
      }
      if (world === 'beach') {
        for (let i = 0; i < 8; i++) {
          const yy = h * (0.55 + i * 0.016) + Math.sin(time * 0.00035 + i) * h * 0.002;
          c.strokeStyle = '#eff8e766';
          c.lineWidth = Math.max(1, i * h * 0.0007);
          c.beginPath();
          c.moveTo(w * 0.75, yy);
          c.bezierCurveTo(w * 0.8, yy - h * 0.004, w * 0.9, yy + h * 0.005, w, yy);
          c.stroke();
        }
      }
      // Back-to-front roadside objects create depth, density and changing near-field detail.
      const highCountry = ['limestone', 'summit', 'tundra', 'rock', 'sandstone'].includes(
        route?.biome
      );
      const objects = [];
      for (let i = 0; i < 74; i++) {
        const p = (i / 74 + rand(i + 27) * 0.008 + position / 1500) % 1;
        objects.push({ p, seed: i });
      }
      objects.sort((a, b) => a.p - b.p);
      for (const o of objects) {
        const r = rows[Math.min(127, Math.floor(o.p * 128))],
          size = h * (0.003 + r.d * 0.19),
          side = o.seed % 2 ? 1 : -1,
          x = r.center + side * r.half * (1.16 + rand(o.seed) * 0.6),
          y = r.y;
        if (x < -size || x > w + size || size < 2) continue;
        if (['west-virginia', 'rockies'].includes(world) && !highCountry) {
          tree(x, y, size, world !== 'west-virginia', o.seed);
          if (trail && o.seed % 3 === 0)
            poly(
              c,
              [
                [x + size * 0.2, y],
                [x + size * 0.45, y - size * 0.14],
                [x + size * 0.7, y - size * 0.06],
                [x + size * 0.8, y]
              ],
              '#8e9482'
            );
          if (world === 'west-virginia' && o.seed % 17 === 0) {
            c.fillStyle = '#9f4535';
            c.fillRect(x, y - size * 0.5, size * 0.8, size * 0.5);
            poly(
              c,
              [
                [x - size * 0.08, y - size * 0.5],
                [x + size * 0.4, y - size * 0.9],
                [x + size * 0.88, y - size * 0.5]
              ],
              '#4c4840'
            );
            c.fillStyle = '#d7cfb3';
            c.fillRect(x + size * 0.3, y - size * 0.35, size * 0.18, size * 0.35);
          }
        } else if (world === 'mountain-bike' || highCountry) {
          poly(
            c,
            [
              [x - size * 0.3, y],
              [x - size * 0.2, y - size * 0.18],
              [x + size * 0.2, y - size * 0.24],
              [x + size * 0.4, y]
            ],
            world === 'mountain-bike' ? '#9d674b' : '#b4afa0'
          );
        } else if (world === 'beach') {
          c.strokeStyle = '#68774c';
          c.lineWidth = Math.max(0.7, size * 0.015);
          for (let j = 0; j < 9; j++) {
            c.beginPath();
            c.moveTo(x, y);
            c.quadraticCurveTo(
              x + (j - 4) * size * 0.015,
              y - size * 0.15,
              x + (j - 4) * size * 0.04,
              y - size * (0.2 + rand(j + o.seed) * 0.12)
            );
            c.stroke();
          }
        } else if (world === 'france' && route?.biome === 'forest') {
          tree(x, y, size, true, o.seed);
        } else if (world === 'france') {
          if (o.seed % 4 === 0) {
            const jersey = ['#eacb35', '#f5f1e3', '#c63536', '#486eb5'][o.seed % 4];
            c.fillStyle = jersey;
            c.fillRect(x - size * 0.055, y - size * 0.4, size * 0.11, size * 0.22);
            c.fillStyle = '#cda986';
            c.beginPath();
            c.arc(x, y - size * 0.46, size * 0.05, 0, 7);
            c.fill();
            c.strokeStyle = '#273e40';
            c.lineWidth = Math.max(1, size * 0.02);
            c.beginPath();
            c.moveTo(x, y - size * 0.18);
            c.lineTo(x - size * 0.08, y);
            c.moveTo(x, y - size * 0.18);
            c.lineTo(x + size * 0.08, y);
            c.stroke();
          } else {
            c.strokeStyle = '#d1be91';
            c.lineWidth = Math.max(1, size * 0.025);
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x, y - size * 0.42);
            c.stroke();
            const colors = ['#2857a2', '#f7f3e5', '#b94342'];
            for (let j = 0; j < 3; j++) {
              c.fillStyle = colors[j];
              c.fillRect(x + j * size * 0.1, y - size * 0.42, size * 0.1, size * 0.16);
            }
          }
        } else if (world === 'pittsburgh') {
          c.strokeStyle = '#d2b262';
          c.lineWidth = Math.max(1, size * 0.035);
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x, y - size);
          c.lineTo(x - side * size * 0.25, y - size);
          c.stroke();
          c.fillStyle = '#fce6a7';
          c.fillRect(x - side * size * 0.27, y - size, size * 0.18, size * 0.045);
        } else {
          c.strokeStyle = '#a0aeac50';
          c.lineWidth = Math.max(1, size * 0.01);
          c.beginPath();
          c.moveTo(x - size, y);
          c.lineTo(x, y - size * 0.04);
          c.lineTo(x + size, y);
          c.stroke();
        }
      }
      if (world === 'mountain-bike') {
        c.strokeStyle = '#b4a07c44';
        for (let i = 0; i < 12; i++) {
          const r = rows[80 + i * 3];
          c.beginPath();
          c.moveTo(r.center - r.half * 0.15, r.y);
          c.lineTo(r.center - r.half * 0.3, r.y + h * 0.03);
          c.stroke();
        }
      }
      if (world === 'france' || world === 'rockies') {
        for (let i = 0; i < 3; i++) {
          const p = 0.28 + i * 0.09 + Math.sin(position * 0.0004 + i) * 0.02,
            r = rows[Math.floor(p * 128)],
            s = h * r.d * 0.12,
            x = r.center + r.half * (0.18 + i * 0.16),
            y = r.y;
          c.strokeStyle = '#26343b';
          c.lineWidth = Math.max(1, s * 0.035);
          for (const dx of [-0.22, 0.22]) {
            c.beginPath();
            c.ellipse(x + s * dx, y, s * 0.16, s * 0.2, 0, 0, 7);
            c.stroke();
          }
          c.strokeStyle = ['#e6c849', '#d7e8ea', '#bd4848'][i];
          c.lineWidth = s * 0.13;
          c.beginPath();
          c.moveTo(x, y - s * 0.2);
          c.lineTo(x + s * 0.08, y - s * 0.65);
          c.lineTo(x + s * 0.3, y - s * 0.44);
          c.stroke();
          c.strokeStyle = '#253d47';
          c.lineWidth = s * 0.045;
          c.beginPath();
          c.moveTo(x, y - s * 0.3);
          c.lineTo(x + Math.sin(time * 0.012 + i) * s * 0.18, y - s * 0.12);
          c.stroke();
          c.fillStyle = '#d4d9c8';
          c.beginPath();
          c.arc(x + s * 0.11, y - s * 0.79, s * 0.1, 0, 7);
          c.fill();
        }
      }
      const shade = c.createLinearGradient(0, h * 0.72, 0, h);
      shade.addColorStop(0, '#04111c00');
      shade.addColorStop(1, '#04111c66');
      c.fillStyle = shade;
      c.fillRect(0, h * 0.72, w, h * 0.28);
    }
    return { draw, build, indexFor: (id) => THEMES.findIndex((t) => t.id === id) };
  }
  root.NonZeroScenery = { THEMES, create };
  if (typeof module !== 'undefined') module.exports = { THEMES };
})(typeof window !== 'undefined' ? window : globalThis);
