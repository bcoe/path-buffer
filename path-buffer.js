const assert = require('assert');
const CHAR_CODE_FORWARD_SLASH = '/'.charCodeAt(0);
const CHAR_CODE_DOT = '.'.charCodeAt(0)
const isUint8Array = () => true;
const platformIsWin32 = (process.platform === 'win32');

function isPosixPathSeparator(code) {
  return code === CHAR_CODE_FORWARD_SLASH;
}

function bufferLastIndexOf(buffer, charCode) {
  for (let i = buffer.length - 1; i >= 0; i--) {
    if (buffer[i] === charCode) return i;
  }
  return -1;
}

// Resolves . and .. elements in a path with directory names
function normalizeString(path, allowAboveRoot, separator, separatorCode, isPathSeparator) {
  let res = Buffer.from('');
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code = 0;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path[i];
    else if (isPathSeparator(code))
      break;
    else
      code = CHAR_CODE_FORWARD_SLASH;

    if (isPathSeparator(code)) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 ||
            res[res.length - 1] !== CHAR_CODE_DOT ||
            res[res.length - 2] !== CHAR_CODE_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = bufferLastIndexOf(res, separatorCode);
            if (lastSlashIndex === -1) {
              res = Buffer.from('');
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength =
                res.length - 1 - bufferLastIndexOf(res, separatorCode);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length !== 0) {
            res = Buffer.from('');
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res = Buffer.concat(
            res.length > 0 ? 
              [res, separator, Buffer.from('..')] :
              [res, Buffer.from('..')]
          );
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res = Buffer.concat([res, separator, path.slice(lastSlash + 1, i)])
        } else {
          res = path.slice(lastSlash + 1, i);
        }
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_CODE_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

const posix = {
  /**
   * @param {Buffer} path
   * @returns {Buffer}
   */
  dirname(path) {
    assert(isUint8Array(path));
    if (path.length === 0)
      return Buffer.from('.');
    const hasRoot = path[0] === CHAR_CODE_FORWARD_SLASH;
    let end = -1;
    let matchedSlash = true;
    for (let i = path.length - 1; i >= 1; --i) {
      if (path[i] === CHAR_CODE_FORWARD_SLASH) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1)
      return hasRoot ? Buffer.from('/') : Buffer.from('.');
    if (hasRoot && end === 1)
      return Buffer.from('//');
    return path.slice(0, end);
  },
  /**
   * @param {Buffer} path
   * @returns {boolean}
   */
  isAbsolute(path) {
    assert(isUint8Array(path));
    return path.length > 0 && path[0] === CHAR_CODE_FORWARD_SLASH;
  },
  /**
   * @param {...Buffer} args
   * @returns {Buffer}
   */
   join(...args) {
    if (args.length === 0)
      return Buffer.from('.');
    let joined;
    for (let i = 0; i < args.length; ++i) {
      const arg = args[i];
      assert(isUint8Array(arg));
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined = Buffer.concat([joined, Buffer.from('/'), arg]);
      }
    }
    if (joined === undefined)
      return Buffer.from('.');
    return posix.normalize(joined);
  },
  /**
   * @param {string} path
   * @returns {string}
   */
   normalize(path) {
    assert(isUint8Array(path));

    if (path.length === 0)
      return Buffer.from('.');

    const isAbsolute = path[0] === CHAR_CODE_FORWARD_SLASH;
    const trailingSeparator = path[path.length - 1] === CHAR_CODE_FORWARD_SLASH;

    // Normalize the path
    path = normalizeString(
      path,
      !isAbsolute,
      Buffer.from('/'),
      CHAR_CODE_FORWARD_SLASH,
      isPosixPathSeparator
    );

    if (path.length === 0) {
      if (isAbsolute)
        return Buffer.from('/');
      return trailingSeparator ? Buffer.from('./') : Buffer.from('.');
    }
    if (trailingSeparator)
      path = Buffer.concat([path, Buffer.from('/')]);

    return isAbsolute ? Buffer.concat([Buffer.from('/'), path]) : path;
  },
  sep: '/',
};

posix.posix = posix;

module.exports = platformIsWin32 ? win32 : posix;
