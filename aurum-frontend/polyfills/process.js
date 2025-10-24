const globalProcess =
  typeof globalThis !== "undefined" && globalThis.process ? globalThis.process : undefined;

if (globalProcess) {
  module.exports = globalProcess;
} else {
  const env = {};
  const queue = [];
  let draining = false;

  function runTimeout(fn) {
    return setTimeout(fn, 0);
  }

  function drainQueue() {
    if (draining) return;
    draining = true;
    let currentQueue;
    let len = queue.length;
    while (len) {
      currentQueue = queue.slice();
      queue.length = 0;
      for (let i = 0; i < currentQueue.length; i += 1) {
        const [cb, args] = currentQueue[i];
        cb.apply(undefined, args);
      }
      len = queue.length;
    }
    draining = false;
  }

  module.exports = {
    env,
    argv: [],
    version: "",
    versions: {},
    browser: true,
    nextTick(cb, ...args) {
      queue.push([cb, args]);
      if (!draining) {
        runTimeout(drainQueue);
      }
    },
    on() {},
    addListener() {},
    once() {},
    off() {},
    removeListener() {},
    removeAllListeners() {},
    emit() {},
    prependListener() {},
    prependOnceListener() {},
    listeners() {
      return [];
    },
    binding() {
      throw new Error("process.binding is not supported");
    },
    cwd() {
      return "/";
    },
    chdir() {
      throw new Error("process.chdir is not supported");
    },
    umask() {
      return 0;
    },
  };
}
