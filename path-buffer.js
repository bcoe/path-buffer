const assert = require('assert');
const CHAR_CODE_FORWARD_SLASH = '/'.charCodeAt(0);
const CHAR_CODE_DOT = '.'.charCodeAt(0)
const isUint8Array = () => true;
const platformIsWin32 = (process.platform === 'win32');

function isPosixPathSeparator(code) {
  return code === CHAR_CODE_FORWARD_SLASH;
}

// Wrapped buffer providing support for utf8 and utf16le encoded paths:
class WrappedBuffer {
  #buf = null;
  #detectEncoding = (buf) => {
    let encoding = 'utf8';
    if (buf.length >= 2 && (buf.length % 2) === 0) {
      if (buf[buf.length - 1] === 0) {
        encoding = 'utf16le';
      }
    }
    return encoding;
  };
  constructor(buf, encoding) {
    this.#buf = buf;
    this.encoding = encoding ?? this.#detectEncoding(buf);
  }
  static concat = (bufs) => {
    const unwrappedBuffers = [];
    for (const buf of bufs) {
      if (buf instanceof WrappedBuffer) {
        unwrappedBuffers.push(buf.buffer);
      } else {
        unwrappedBuffers.push(buf);;
      }
    }
    return WrappedBuffer.from(Buffer.concat(unwrappedBuffers));
  }
  static from = (buf, encoding) => {
    return new WrappedBuffer(Buffer.from(buf, encoding));
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
    return WrappedBuffer.from(this.#buf.slice(start, end));
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
  let res = WrappedBuffer.from('', path.encoding);
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
              res = WrappedBuffer.from('', path.encoding);
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
            res = WrappedBuffer.from('', path.encoding);
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res = WrappedBuffer.concat(
            res.length > 0 ? 
              [res, separator, WrappedBuffer.from('..', path.encoding)] :
              [res, WrappedBuffer.from('..', path.encoding)]
          );
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res = WrappedBuffer.concat([res, separator, path.slice(lastSlash + 1, i)])
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
    path = WrappedBuffer.from(path);
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

    if (end === -1)
      return hasRoot ? Buffer.from('/') : Buffer.from('.');
    if (hasRoot && end === 1)
      return Buffer.from('//');
    return path.slice(0, end).buffer;
  },
  /**
   * @param {Buffer} path
   * @returns {boolean}
   */
  isAbsolute(path) {
    assert(isUint8Array(path));
    path = WrappedBuffer.from(path);
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
      const arg = args[i];
      assert(isUint8Array(arg));
      if (arg.length > 0) {
        // TODO: if utf16le components are being appended detect this.
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
    path = WrappedBuffer.from(path);

    const isAbsolute = path.charCodeAt(0) === CHAR_CODE_FORWARD_SLASH;
    const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_CODE_FORWARD_SLASH;

    // Normalize the path
    path = normalizeString(
      path,
      !isAbsolute,
      WrappedBuffer.from('/', path.encoding),
      CHAR_CODE_FORWARD_SLASH,
      isPosixPathSeparator
    );

    if (path.length === 0) {
      if (isAbsolute)
        return WrappedBuffer.from('/', path.encoding).buffer;
      return trailingSeparator ?
        WrappedBuffer.from('./', path.encoding).buffer :
        WrappedBuffer.from('.', path.encoding).buffer;
    }
    if (trailingSeparator)
      path = WrappedBuffer.concat([
        path, WrappedBuffer.from('/', path.encoding)
      ]);

    return isAbsolute ?
      WrappedBuffer.concat([WrappedBuffer.from('/', path.encoding), path]).buffer :
      path.buffer;
  },
  sep: '/',
};

posix.posix = posix;

module.exports = platformIsWin32 ? win32 : posix;
