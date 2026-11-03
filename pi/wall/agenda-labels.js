(function (root) {
  'use strict';
  const clean = (v) =>
    String(v || '')
      .replace(/\s+/g, ' ')
      .trim();
  function title(item) {
    if (!item) return '';
    let label = clean(item.rawTitle) || clean(item.title);
    const owner = clean(item.child || item.who || item.person);
    if (owner && label.toLowerCase().startsWith(owner.toLowerCase() + ' ·'))
      label = label.slice(owner.length).replace(/^\s*·\s*/, '');
    label = label.replace(
      /^(?:(?:unassigned\s*(?:\/\s*verify)?|verify|Whitney|Whit|Will|Sam)\s*(?:[·:–—-]\s*|\s+))+/i,
      ''
    );
    return clean(label) || 'Calendar event';
  }
  function rides(item) {
    if (!item) return '';
    if (Array.isArray(item.transport) && item.transport.length)
      return item.transport
        .filter(
          (l) => l && l.driver && /^(drop|dropoff|drop-off|pickup|pick-up)$/i.test(l.kind || '')
        )
        .map((l) => `${/^drop/i.test(l.kind) ? 'Drop-off' : 'Pickup'}: ${clean(l.driver)}`)
        .join(' · ');
    return clean(item.meta)
      .split(/\s*·\s*/)
      .filter((s) => /^(drop(?:[ -]?off)?|pick(?:[ -]?up)?)\s*:/i.test(s))
      .map((s) =>
        s
          .replace(/^drop(?:[ -]?off)?\s*:/i, 'Drop-off:')
          .replace(/^pick(?:[ -]?up)?\s*:/i, 'Pickup:')
      )
      .join(' · ');
  }
  root.NonZeroAgendaLabels = { title, rides };
  if (typeof module === 'object' && module.exports) module.exports = { title, rides };
})(typeof globalThis !== 'undefined' ? globalThis : this);
