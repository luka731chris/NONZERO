/* Offline route references. Named stop order sourced in ROUTE-SOURCES.md.
   Road curves, skyline footprints and terrain meshes are simplified reconstructions. */
(function (root) {
  'use strict';
  const point = (m, name, elevation, biome) => ({ m, name, elevation, biome });
  const ROUTES = {
    pittsburgh: {
      name: 'PITTSBURGH · NORTH SHORE EASTBOUND',
      length: 3600,
      width: 3.5,
      riverSide: 1,
      points: [
        point(0, 'Carnegie Science Center', 220, 'city'),
        point(650, 'Acrisure Stadium riverfront', 220, 'city'),
        point(1450, 'Fort Duquesne Bridge', 222, 'city'),
        point(1900, 'PNC Park riverfront', 222, 'city'),
        point(2130, 'Roberto Clemente Bridge · 6th Street', 223, 'city'),
        point(2300, 'Allegheny Landing', 223, 'city'),
        point(2440, 'Andy Warhol Bridge · 7th Street', 223, 'city'),
        point(2720, 'Rachel Carson Bridge · 9th Street', 223, 'city'),
        point(3600, 'David McCullough Bridge · 16th Street', 224, 'city')
      ],
      path: [
        [40.4441, -80.0195],
        [40.4445, -80.0164],
        [40.4445, -80.0124],
        [40.4448, -80.0091],
        [40.4452, -80.0065],
        [40.4466, -80.0045],
        [40.447, -80.0034],
        [40.4476, -80.0021],
        [40.4482, -79.9996],
        [40.4503, -79.991]
      ],
      buildings: [
        {
          name: 'PPG Place',
          lat: 40.4399,
          lon: -80.0031,
          height: 194,
          width: 55,
          kind: 'ppg',
          color: '#829a9e'
        },
        {
          name: 'Gateway Center',
          lat: 40.4413,
          lon: -80.0064,
          height: 120,
          width: 56,
          kind: 'glass',
          color: '#8eaca8'
        },
        {
          name: 'Tower at PNC Plaza',
          lat: 40.4405,
          lon: -80.0004,
          height: 166,
          width: 48,
          kind: 'glass',
          color: '#83a4ab'
        },
        {
          name: 'Fifth Avenue Place',
          lat: 40.4425,
          lon: -80.003,
          height: 188,
          width: 48,
          kind: 'pyramid',
          color: '#bfbbac'
        },
        {
          name: 'Gulf Tower',
          lat: 40.443,
          lon: -79.9968,
          height: 177,
          width: 38,
          kind: 'stepped',
          color: '#cabfa5'
        },
        {
          name: 'U.S. Steel Tower',
          lat: 40.4416,
          lon: -79.995,
          height: 256,
          width: 74,
          kind: 'steel',
          color: '#6e5147'
        },
        {
          name: 'BNY Mellon Center',
          lat: 40.4403,
          lon: -79.9956,
          height: 221,
          width: 53,
          kind: 'pyramid',
          color: '#b2a494'
        },
        {
          name: 'Koppers Building',
          lat: 40.4425,
          lon: -79.9968,
          height: 145,
          width: 34,
          kind: 'stepped',
          color: '#ad967c'
        }
      ]
    },
    france: {
      name: 'FRANCE · BÉDOIN TO MONT VENTOUX',
      length: 21500,
      width: 6,
      points: [
        point(0, 'Bédoin', 300, 'village'),
        point(3500, 'Sainte-Colombe', 390, 'vineyard'),
        point(5500, 'Saint-Estève bend', 540, 'forest'),
        point(15500, 'Chalet Reynard', 1417, 'limestone'),
        point(19300, 'Col des Tempêtes approach', 1810, 'limestone'),
        point(21500, 'Mont Ventoux summit', 1909, 'summit')
      ]
    },
    rockies: {
      name: 'ROCKIES · TRAIL RIDGE ROAD WESTBOUND',
      length: 37015,
      width: 7,
      points: [
        point(0, 'Beaver Meadows Visitor Center', 2394, 'meadow'),
        point(13357, 'Many Parks Curve', 2938, 'forest'),
        point(19473, 'Rainbow Curve', 3301, 'subalpine'),
        point(27037, 'Forest Canyon Overlook', 3571, 'tundra'),
        point(30256, 'Rock Cut', 3673, 'tundra'),
        point(33635, 'Lava Cliffs', 3658, 'rock'),
        point(35406, 'Gore Range Overlook', 3661, 'tundra'),
        point(37015, 'Alpine Visitor Center · Fall River Pass', 3595, 'tundra')
      ]
    },
    'mountain-bike': {
      name: 'MOAB · SLICKROCK MAIN LOOP',
      length: 16900,
      width: 2.1,
      points: [
        point(0, 'Slickrock trailhead', 1350, 'sandstone'),
        point(1600, 'Practice loop junction area', 1390, 'sandstone'),
        point(6200, 'Navajo sandstone high ground', 1450, 'sandstone'),
        point(11000, 'La Sal Mountains panorama', 1420, 'sandstone'),
        point(16900, 'Return to Slickrock trailhead', 1350, 'sandstone')
      ]
    },
    beach: {
      name: 'HILTON HEAD · SEA PINES DISCOVERY LOOP',
      length: 24140, // 15-mile curated virtual circuit through the Sea Pines district
      width: 3.2,
      simulation: true,
      geography: 'Sea Pines, Hilton Head Island, South Carolina',
      fidelity: 'Landmark order and general geography; connecting curves and beach transitions are artistically simulated',
      points: [
        point(0, 'Sea Pines Beach Club · Atlantic Ocean', 2, 'coast'),
        point(1900, 'Beach Club shoreline · ride on packed sand', 2, 'coast'),
        point(3400, 'North Sea Pines Drive · shaded leisure path', 3, 'forest'),
        point(5100, 'Lighthouse Road · live oak canopy', 3, 'forest'),
        point(6800, 'Harbour Town Golf Links · 18th fairway', 2, 'golf'),
        point(7600, 'Harbour Town Lighthouse · Calibogue Sound', 2, 'harbour'),
        point(8400, 'Harbour Town Yacht Basin and Liberty Oak', 2, 'harbour'),
        point(10500, 'Stoney-Baynard Ruins · Plantation Drive', 3, 'forest'),
        point(12200, 'South Sea Pines Drive · lagoons and palms', 2, 'lagoon'),
        point(13900, 'South Beach Marina Village · Salty Dog', 2, 'harbour'),
        point(15700, 'South Beach · Calibogue Sound shoreline', 2, 'coast'),
        point(17400, 'South Sea Pines Drive · maritime forest', 3, 'forest'),
        point(19200, 'Atlantic beach access · packed sand', 2, 'coast'),
        point(21100, 'Atlantic dunes · oceanfront beach ride', 2, 'coast'),
        point(22900, 'Sea Pines Beach Club · beach exit', 2, 'dunes'),
        point(24140, 'Sea Pines Beach Club · finish', 2, 'coast')
      ],
      // Anchors are approximate landmark positions; not a surveyed cycling GPS trace.
      anchors: [
        [32.1294,-80.7682], [32.1320,-80.7648], [32.1324,-80.7734],
        [32.1335,-80.7830], [32.1353,-80.8073], [32.1365,-80.8118],
        [32.1367,-80.8110], [32.1262,-80.8144], [32.1177,-80.8132],
        [32.1130,-80.8250], [32.1096,-80.8257], [32.1158,-80.8050],
        [32.1230,-80.7735], [32.1280,-80.7665], [32.1294,-80.7682],
        [32.1294,-80.7682]
      ]
    },
    'west-virginia': {
      name: 'WEST VIRGINIA · GREENBRIER RIVER TRAIL',
      length: 125500,
      width: 3,
      points: [
        point(0, 'Cass trailhead · southbound', 744, 'forest'),
        point(17000, 'Sharps Tunnel', 700, 'forest'),
        point(39500, 'Marlinton', 650, 'valley'),
        point(74000, 'Watoga area', 610, 'forest'),
        point(93000, 'Droop Mountain Tunnel', 580, 'forest'),
        point(125500, 'Caldwell trailhead', 530, 'valley')
      ]
    },
    'salt-flats': {
      name: 'BONNEVILLE · OPEN SALT PAN',
      length: 10000,
      width: 12,
      points: [
        point(0, 'Bonneville access area', 1282, 'salt'),
        point(10000, 'Salt pan horizon', 1282, 'salt')
      ]
    }
  };
  function progress(id, distance = 0) {
    const r = ROUTES[id] || ROUTES.pittsburgh,
      d = Math.max(0, Math.min(r.length, Number(distance) || 0));
    let i = 0;
    while (i < r.points.length - 2 && d >= r.points[i + 1].m) i++;
    const a = r.points[i],
      b = r.points[i + 1],
      f = Math.max(0, Math.min(1, (d - a.m) / (b.m - a.m))),
      elevation = a.elevation + (b.elevation - a.elevation) * f;
    return {
      route: r,
      distance: d,
      index: i,
      current: a,
      next: b,
      remaining: Math.max(0, b.m - d),
      fraction: d / r.length,
      elevation,
      grade: ((b.elevation - a.elevation) / (b.m - a.m)) * 100,
      biome: f < 0.8 ? a.biome : b.biome,
      direction: id === 'beach' ? (a.biome === 'coast' ? 'shoreline' : 'leisure path') : null,
      finished: d >= r.length
    };
  }
  function geo(id, d) {
    const r = ROUTES[id],
      p = r?.path;
    if (!p) return null;
    const v = progress(id, d).fraction * (p.length - 1),
      i = Math.min(p.length - 2, Math.floor(v)),
      f = v - i,
      a = p[i],
      b = p[i + 1];
    return {
      lat: a[0] + (b[0] - a[0]) * f,
      lon: a[1] + (b[1] - a[1]) * f,
      heading: Math.atan2((b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180), b[0] - a[0])
    };
  }
  root.NonZeroRoutes = { ROUTES, progress, geo };
  if (typeof module !== 'undefined') module.exports = root.NonZeroRoutes;
})(typeof globalThis !== 'undefined' ? globalThis : this);
