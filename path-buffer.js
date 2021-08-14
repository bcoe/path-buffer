const assert = require('assert');
const CHAR_CODE_FORWARD_SLASH = '/'.charCodeAt(0);
BufferPrototypeSlice = (path, start, end) => {
 return path.slice(start, end)
}
const isUint8Array = () => true;

const platformIsWin32 = (process.platform === 'win32');

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
    return BufferPrototypeSlice(path, 0, end);
  },
  /**
   * @param {Buffer} path
   * @returns {boolean}
   */
  isAbsolute(path) {
    assert(isUint8Array(path));
    return path.length > 0 && path[0] === CHAR_CODE_FORWARD_SLASH;
  },
};

module.exports = platformIsWin32 ? win32 : posix;
