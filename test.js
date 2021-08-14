const {
  dirname,
  isAbsolute,
} = require('./path-buffer');
const assert = require('assert');
const path = require('path');

const platformIsWin32 = (process.platform === 'win32');

// dirname should handle absolute path with multiple components.
{
  const p = [path.sep, 'foo', 'bar', 'apple'].join(path.sep);
  const buf = Buffer.from(p);
  assert.strictEqual(dirname(buf).toString(), path.dirname(p));
}

// dirname should handle relative path with multiple components.
{
  const p = ['.', 'bar', 'apple'].join(path.sep);
  const buf = Buffer.from(p);
  assert.strictEqual(dirname(buf).toString(), path.dirname(p));
}

// dirname should handle empty path.
{
  const p = '';
  const buf = Buffer.from(p);
  assert.strictEqual(dirname(buf).toString(), path.dirname(p));
}

// dirname retains // at beginning of path.
if (!platformIsWin32) {
  const p = '//foo';
  const buf = Buffer.from(p);
  assert.strictEqual(dirname(buf).toString(), '//');
  assert.strictEqual(dirname(dirname(buf)).toString(), '/');
}

// isAbsolute returns false if path is relative.
{
  const p = '.';
  const buf = Buffer.from(p);
  assert.strictEqual(isAbsolute(buf), false);
}

// isAbsolute returns true if path is absolute.
{
  const p = [path.sep, 'foo', 'bar', 'apple'].join(path.sep);
  const buf = Buffer.from(p);
  assert.strictEqual(isAbsolute(buf), true);
}
