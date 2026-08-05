const Module = require('module');
const path = require('path');

if (!global.__FARES_REQUIRE_ALIAS_FIX__) {
  global.__FARES_REQUIRE_ALIAS_FIX__ = true;

  const projectRoot = path.resolve(__dirname, '..');
  const originalResolveFilename = Module._resolveFilename;

  const isDirectChildOfProject = (parentFilename = '') => {
    const parentDir = path.dirname(parentFilename);
    return path.dirname(parentDir) === projectRoot;
  };

  Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
    if (
      parent?.filename &&
      typeof request === 'string' &&
      request.startsWith('../../') &&
      isDirectChildOfProject(parent.filename)
    ) {
      const rewritten = `../${request.slice(6)}`;
      try {
        return originalResolveFilename.call(this, rewritten, parent, isMain, options);
      } catch (_) {
        // Fall back to the original request if the rewritten path is not valid.
      }
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
}

module.exports = true;
