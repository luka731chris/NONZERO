(function (root) {
  'use strict';
  const P = root.NonZeroCoachProtocol;
  function client(options) {
    const key = options.key;
    let saved;
    try {
      saved = JSON.parse(options.storage.getItem(key) || 'null');
    } catch {
      throw Error('Coaching cache needs recovery; export local storage before resetting it.');
    }
    let doc = P.document(saved?.doc),
      pending = Array.isArray(saved?.pending) ? saved.pending : [],
      conflict = saved?.conflict || null,
      error = '',
      busy = false,
      retryAt = 0,
      delay = 2000,
      projectionError = '';
    const optimistic = () => {
        let d = P.document(doc);
        projectionError = '';
        for (const op of pending)
          try {
            d = P.apply(d, [op], Date.now(), true);
          } catch (e) {
            projectionError = e.message;
          }
        return d;
      },
      snapshot = () => ({
        ...P.view(optimistic()),
        doc,
        optimisticDoc: optimistic(),
        pending: P.clone(pending),
        conflict: conflict || (projectionError ? { message: projectionError, fields: [] } : null),
        error,
        busy
      });
    function persist() {
      options.storage.setItem(key, JSON.stringify({ doc, pending, conflict }));
    }
    function notify() {
      options.onChange?.(snapshot());
    }
    function accept(value) {
      const next = P.document(value);
      if (next.revision < doc.revision) return;
      doc = next;
      pending = pending.filter((x) => !doc.applied.includes(x.id));
      if (!pending.length) conflict = null;
      persist();
      notify();
    }
    async function flush(force = false) {
      if (
        busy ||
        conflict ||
        !pending.length ||
        !options.ready() ||
        (!force && Date.now() < retryAt)
      )
        return;
      busy = true;
      notify();
      try {
        const response = await options.send(pending.slice(0, 20));
        accept(response.doc);
        error = '';
        delay = 2000;
        retryAt = 0;
      } catch (e) {
        error = e.message || 'Sync pending';
        if (e.doc) {
          doc = P.document(e.doc);
          pending = pending.filter((x) => !doc.applied.includes(x.id));
        }
        if ([400, 409, 413].includes(e.status)) {
          conflict = { fields: e.fields || [], message: error };
          persist();
        }
        retryAt = Date.now() + delay;
        delay = Math.min(30000, delay * 2);
      } finally {
        busy = false;
        notify();
      }
    }
    function enqueue(ops) {
      if (!Array.isArray(ops) || pending.length + ops.length > 100)
        throw Error('Sync pending changes before adding more');
      P.apply(optimistic(), ops, Date.now(), true);
      const prior = pending;
      pending = [...pending, ...ops];
      try {
        persist();
      } catch (e) {
        pending = prior;
        throw Error('Phone storage is full. This change was not saved.');
      }
      notify();
      void flush();
      return snapshot();
    }
    function save(kind, key, patch, base) {
      const op = P.operation(base || optimistic(), kind, key, patch);
      return Object.keys(op.patch).length ? enqueue([op]) : snapshot();
    }
    function resolve(choice) {
      if (choice === 'mine') pending = P.rebase(doc, pending);
      else if (choice === 'remote') pending = [];
      else throw Error('Choose pending or synced changes');
      conflict = null;
      persist();
      notify();
      void flush(true);
    }
    persist();
    return { snapshot, accept, enqueue, save, flush, resolve };
  }
  root.NonZeroCoachClient = { client };
  if (typeof module !== 'undefined') module.exports = root.NonZeroCoachClient;
})(typeof globalThis !== 'undefined' ? globalThis : this);
