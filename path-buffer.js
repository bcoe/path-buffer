const assert = require('assert');
const CHAR_CODE_FORWARD_SLASH = '/'.charCodeAt(0);
const CHAR_CODE_BACKWARD_SLASH = '\\'.charCodeAt(0);
const CHAR_CODE_DOT = '.'.charCodeAt(0)
const CHAR_CODE_LOWERCASE_A = 'a'.charCodeAt(0);
const CHAR_CODE_UPPERCASE_A = 'A'.charCodeAt(0);
const CHAR_CODE_LOWERCASE_Z = 'z'.charCodeAt(0);
const CHAR_CODE_UPPERCASE_Z = 'Z'.charCodeAt(0);
const CHAR_CODE_COLON = ':'.charCodeAt(0);
const isUint8Array = () => true;
const platformIsWin32 = (process.platform === 'win32');

function isPathSeparator(code) {
  return code === CHAR_CODE_FORWARD_SLASH || code === CHAR_CODE_BACKWARD_SLASH;
}

function isPosixPathSeparator(code) {
  return code === CHAR_CODE_FORWARD_SLASH;
}

function isWindowsDeviceRoot(code) {
  return (code >= CHAR_CODE_UPPERCASE_A && code <= CHAR_CODE_UPPERCASE_Z) ||
         (code >= CHAR_CODE_LOWERCASE_A && code <= CHAR_CODE_LOWERCASE_Z);
}

// Wraps a Buffer providing handling for both utf8 and utf8le byte encodings.
class UnicodeBufferWrapper {
  #buf = null;
  #detectEncoding = (buf) => {
    return buf.lastIndexOf(0) !== -1 ? 'utf16le' : 'utf8';
  };
  constructor(buf, encoding) {
    this.#buf = buf;
    this.encoding = encoding ?? this.#detectEncoding(buf);
  }
  static concat = (bufs) => {
    const unwrappedBuffers = [];
    for (const buf of bufs) {
      if (buf instanceof UnicodeBufferWrapper) {
        unwrappedBuffers.push(buf.buffer);
      } else {
        unwrappedBuffers.push(buf);;
      }
    }
    return UnicodeBufferWrapper.from(Buffer.concat(unwrappedBuffers));
  }
  static from = (buf, encoding) => {
    return new UnicodeBufferWrapper(Buffer.from(buf, encoding), encoding);
  }
  charCodeAt(i) {
    if (this.encoding === 'utf16le') {
      i *= 2;
      // Handle both LE and BE case:
      return this.#buf[i] ? this.#buf[i] : this.#buf[i + 1]
    } else {
      return this.#buf[i];
    }
  }
  lastIndexOf(charCode) {
    for (let i  = this.length - 1; i >= 0; i--) {
      if (this.charCodeAt(i) === charCode) return i;
    }
    return -1;
  }
  slice(start, end) {
    if (this.encoding === 'utf16le') {
      start *= 2;
      end *= 2;
    }
    return UnicodeBufferWrapper.from(this.#buf.slice(start, end));
  }
  get buffer() {
    return Buffer.from(this.#buf);
  }
  get length() {
    if (this.encoding === 'utf16le') return this.#buf.length / 2;
    else return this.#buf.length;
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeString(path, allowAboveRoot, separator, separatorCode, isPathSeparator) {
  let res = UnicodeBufferWrapper.from('', path.encoding);
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code = 0;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (isPathSeparator(code))
      break;
    else
      code = CHAR_CODE_FORWARD_SLASH;

    if (isPathSeparator(code)) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 ||
            res.charCodeAt(res.length - 1) !== CHAR_CODE_DOT ||
            res.charCodeAt(res.length - 2) !== CHAR_CODE_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separatorCode);
            if (lastSlashIndex === -1) {
              res = UnicodeBufferWrapper.from('', path.encoding);
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength =
                res.length - 1 - res.lastIndexOf(separatorCode);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length !== 0) {
            res = UnicodeBufferWrapper.from('', path.encoding);
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res = UnicodeBufferWrapper.concat(
            res.length > 0 ? 
              [res, separator, UnicodeBufferWrapper.from('..', path.encoding)] :
              [res, UnicodeBufferWrapper.from('..', path.encoding)]
          );
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res = UnicodeBufferWrapper.concat([res, separator, path.slice(lastSlash + 1, i)])
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
    path = UnicodeBufferWrapper.from(path);
    const hasRoot = path.charCodeAt(0) === CHAR_CODE_FORWARD_SLASH;
    let end = -1;
    let matchedSlash = true;
    for (let i = path.length - 1; i >= 1; --i) {
      if (path.charCodeAt(i) === CHAR_CODE_FORWARD_SLASH) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) {
      return hasRoot ?
        Buffer.from('/', path.encoding) :
        Buffer.from('.', path.encoding);
    }
    if (hasRoot && end === 1)
      return Buffer.from('//', path.encoding);
    return path.slice(0, end).buffer;
  },
  /**
   * @param {Buffer} path
   * @returns {boolean}
   */
  isAbsolute(path) {
    assert(isUint8Array(path));
    path = UnicodeBufferWrapper.from(path);
    return path.length > 0 && path.charCodeAt(0) === CHAR_CODE_FORWARD_SLASH;
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
      let arg = args[i];
      assert(isUint8Array(arg));
      arg = UnicodeBufferWrapper.from(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else {
          joined = UnicodeBufferWrapper.concat([joined, Buffer.from('/', arg.encoding), arg]);
        }
      }
    }
    if (joined === undefined)
      return Buffer.from('.');
    return posix.normalize(joined.buffer);
  },
  /**
   * @param {string} path
   * @returns {string}
   */
   normalize(path) {
    assert(isUint8Array(path));

    if (path.length === 0)
      return Buffer.from('.');
    path = UnicodeBufferWrapper.from(path);

    const isAbsolute = path.charCodeAt(0) === CHAR_CODE_FORWARD_SLASH;
    const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_CODE_FORWARD_SLASH;

    // Normalize the path
    path = normalizeString(
      path,
      !isAbsolute,
      UnicodeBufferWrapper.from('/', path.encoding),
      CHAR_CODE_FORWARD_SLASH,
      isPosixPathSeparator
    );

    if (path.length === 0) {
      if (isAbsolute)
        return UnicodeBufferWrapper.from('/', path.encoding).buffer;
      return trailingSeparator ?
        UnicodeBufferWrapper.from('./', path.encoding).buffer :
        UnicodeBufferWrapper.from('.', path.encoding).buffer;
    }
    if (trailingSeparator)
      path = UnicodeBufferWrapper.concat([
        path, UnicodeBufferWrapper.from('/', path.encoding)
      ]);
    return isAbsolute ?
      UnicodeBufferWrapper.concat([UnicodeBufferWrapper.from('/', path.encoding), path]).buffer :
      path.buffer;
  },
  sep: '/',
};

posix.posix = posix;

const win32 = {
  /**
   * @param {Buffer} path
   * @returns {string}
   */
   dirname(path) {
    assert(isUint8Array(path));
    path = UnicodeBufferWrapper.from(path);
    const len = path.length;
    if (len === 0)
      return UnicodeBufferWrapper.from('.', path.encoding).buffer;
    let rootEnd = -1;
    let offset = 0;
    const code = path.charCodeAt(0)

    if (len === 1) {
      // `path` contains just a path separator, exit early to avoid
      // unnecessary work or a dot.
      return isPathSeparator(code) ?
        path.buffer :
        UnicodeBufferWrapper.from('.', path.encoding).buffer;
    }

    // Try to match a root
    if (isPathSeparator(code)) {
      // Possible UNC root

      rootEnd = offset = 1;

      if (isPathSeparator(path.charCodeAt(1))) {
        // Matched double path separator at beginning
        let j = 2;
        let last = j;
        // Match 1 or more non-path separators
        while (j < len &&
               !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          // Matched!
          last = j;
          // Match 1 or more path separators
          while (j < len &&
                 isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            // Matched!
            last = j;
            // Match 1 or more non-path separators
            while (j < len &&
                   !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              // We matched a UNC root only
              return path.buffer;
            }
            if (j !== last) {
              // We matched a UNC root with leftovers

              // Offset by 1 to include the separator after the UNC root to
              // treat it as a "normal root" on top of a (UNC) root
              rootEnd = offset = j + 1;
            }
          }
        }
      }
    // Possible device root
    } else if (isWindowsDeviceRoot(code) &&
               path.charCodeAt(1) === CHAR_CODE_COLON) {
      rootEnd =
        len > 2 && isPathSeparator(path.charCodeAt(2)) ? 3 : 2;
      offset = rootEnd;
    }

    let end = -1;
    let matchedSlash = true;
    for (let i = len - 1; i >= offset; --i) {
      if (isPathSeparator(path.charCodeAt(i))) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) {
      if (rootEnd === -1)
        return UnicodeBufferWrapper.from('.', path.encoding).buffer;

      end = rootEnd;
    }
    return path.slice(0, end).buffer;
  },
  /**
   * @param {Buffer} path
   * @returns {boolean}
   */
  isAbsolute(path) {
    assert(isUint8Array(path));
    path = UnicodeBufferWrapper.from(path);
    const len = path.length;
    if (path.length === 0)
      return false;
    const code = path.charCodeAt(0);
    return isPathSeparator(code) ||
      // Possible device root
      (len > 2 &&
      isWindowsDeviceRoot(code) &&
      path.charCodeAt(1) === CHAR_CODE_COLON &&
      isPathSeparator(path.charCodeAt(2)));
  },
  /**
   * @param {...Buffer} args
   * @returns {Buffer}
   */
   join(...args) {
    if (args.length === 0)
      return Buffer.from('.');

    let joined;
    let firstPart;
    for (let i = 0; i < args.length; ++i) {
      let arg = args[i];
      assert(isUint8Array(arg));
      arg = UnicodeBufferWrapper.from(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = firstPart = arg;
        else
          joined = UnicodeBufferWrapper.concat([joined, Buffer.from('\\', arg.encoding), arg]);
      }
    }

    if (joined === undefined)
      return Buffer.from('.');

    // Make sure that the joined path doesn't start with two slashes, because
    // normalize() will mistake it for a UNC path then.
    //
    // This step is skipped when it is very clear that the user actually
    // intended to point at a UNC path. This is assumed when the first
    // non-empty string arguments starts with exactly two slashes followed by
    // at least one more non-slash character.
    //
    // Note that for normalize() to treat a path as a UNC path it needs to
    // have at least 2 components, so we don't filter for that here.
    // This means that the user can use join to construct UNC paths from
    // a server name and a share name; for example:
    //   path.join('//server', 'share') -> '\\\\server\\share\\')
    let needsReplace = true;
    let slashCount = 0;
    if (isPathSeparator(firstPart.charCodeAt(0))) {
      ++slashCount;
      const firstLen = firstPart.length;
      if (firstLen > 1 &&
          isPathSeparator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstLen > 2) {
          if (isPathSeparator(firstPart.charCodeAt(2)))
            ++slashCount;
          else {
            // We matched a UNC path in the first part
            needsReplace = false;
          }
        }
      }
    }
    if (needsReplace) {
      // Find any more consecutive slashes we need to replace
      while (slashCount < joined.length &&
             isPathSeparator(joined.charCodeAt(slashCount))) {
        slashCount++;
      }

      // Replace the slashes if needed
      if (slashCount >= 2)
        joined = UnicodeBufferWrapper.concat([Buffer.from('\\', joined.encoding), joined.slice(slashCount, joined.length)]);
    }

    return win32.normalize(joined);
  },
  /**
   * @param {Buffer} path
   * @returns {Buffer}
   */
   normalize(path) {
    assert(isUint8Array(path));
    path = UnicodeBufferWrapper.from(path);
    const len = path.length;
    if (len === 0)
      return Buffer.from('.');
    let rootEnd = 0;
    let device;
    let isAbsolute = false;
    const code = path.charCodeAt(0);

    // Try to match a root
    if (len === 1) {
      // `path` contains just a single char, exit early to avoid
      // unnecessary work
      return isPosixPathSeparator(code) ? '\\' : path.buffer;
    }
    if (isPathSeparator(code)) {
      // Possible UNC root

      // If we started with a separator, we know we at least have an absolute
      // path of some kind (UNC or otherwise)
      isAbsolute = true;

      if (isPathSeparator(path.charCodeAt(1))) {
        // Matched double path separator at beginning
        let j = 2;
        let last = j;
        // Match 1 or more non-path separators
        while (j < len &&
               !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          const firstPart = path.slice(last, j);
          // Matched!
          last = j;
          // Match 1 or more path separators
          while (j < len &&
                 isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            // Matched!
            last = j;
            // Match 1 or more non-path separators
            while (j < len &&
                   !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              // We matched a UNC root only
              // Return the normalized version of the UNC root since there
              // is nothing left to process
              return UnicodeBufferWrapper.concat([
                Buffer.from('\\\\', path.encoding),
                firstPart,
                Buffer.from('\\', path.encoding),
                path.slice(last, path.length)
              ]).buffer;
            }
            if (j !== last) {
              // We matched a UNC root with leftovers
              device = UnicodeBufferWrapper.concat([
                Buffer.from('\\\\', path.encoding),
                firstPart,
                Buffer.from('\\', path.encoding),
                path.slice(last, j)
              ]);
              rootEnd = j;
            }
          }
        }
      } else {
        rootEnd = 1;
      }
    } else if (isWindowsDeviceRoot(code) &&
               path.charCodeAt(1) === CHAR_CODE_COLON) {
      // Possible device root
      device = path.slice(0, 2);
      rootEnd = 2;
      if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
        // Treat separator following drive name as an absolute path
        // indicator
        isAbsolute = true;
        rootEnd = 3;
      }
    }

    let tail = rootEnd < len ?
      normalizeString(
        path.slice(rootEnd, path.length),
        !isAbsolute,
        UnicodeBufferWrapper.from('\\', path.encoding),
        CHAR_CODE_BACKWARD_SLASH,
        isPathSeparator
      ) :
      Buffer.from('');
    if (tail.length === 0 && !isAbsolute)
      tail = Buffer.from('.', path.encoding);
    if (tail.length > 0 &&
        isPathSeparator(path.charCodeAt(len - 1))) {
      tail = UnicodeBufferWrapper.concat([tail, Buffer.from('\\', path.encoding)]);
    }
    if (device === undefined) {
      return isAbsolute ? UnicodeBufferWrapper.concat([Buffer.from('\\', path.encoding), tail]).buffer : tail.buffer;
    }
    if (isAbsolute) {
      return UnicodeBufferWrapper.concat([device, Buffer.from('\\', path.encoding), tail]).buffer;
    } else {
      return UnicodeBufferWrapper.concat([device, tail]).buffer;
    }
  },
};

posix.win32 = win32.win32 = win32;
posix.posix = win32.posix = posix;

module.exports = platformIsWin32 ? win32 : posix;
