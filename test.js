const path = require('./path-buffer');
const assert = require('assert');
const pathString= require('path');

const platformIsWin32 = (process.platform === 'win32');

// dirname should handle absolute path with multiple components.
{
  const p = [path.sep, 'foo', 'bar', 'apple'].join(path.sep);
  let buf = Buffer.from(p);
  assert.strictEqual(path.dirname(buf).toString(), pathString.dirname(p));
}

// dirname should handle relative path with multiple components.
{
  const p = ['.', 'bar', 'apple'].join(path.sep);
  const buf = Buffer.from(p);
  assert.strictEqual(path.dirname(buf).toString(), pathString.dirname(p));
}

// dirname should handle empty path.
{
  const p = '';
  const buf = Buffer.from(p);
  assert.strictEqual(path.dirname(buf).toString(), pathString.dirname(p));
}

// dirname retains // at beginning of path.
if (!platformIsWin32) {
  const p = '//foo';
  const buf = Buffer.from(p);
  assert.strictEqual(path.dirname(buf).toString(), '//');
  assert.strictEqual(path.dirname(path.dirname(buf)).toString(), '/');
}

// isAbsolute returns false if path is relative.
{
  const p = '.';
  const buf = Buffer.from(p);
  assert.strictEqual(path.isAbsolute(buf), false);
}

// isAbsolute returns true if path is absolute.
{
  const p = [path.sep, 'foo', 'bar', 'apple'].join(path.sep);
  const buf = Buffer.from(p);
  assert.strictEqual(path.isAbsolute(buf), true);
}

// Test join().

// join allows set of relative paths to be joined.
const failures = [];
const joinTests = [
  [ [path.posix.join],
    // Arguments                     result
    [[['.', 'x/b', '..', '/b/c.js'], 'x/b/c.js'],
     [[], '.'],
     [['/.', 'x/b', '..', '/b/c.js'], '/x/b/c.js'],
     [['/foo', '../../../bar'], '/bar'],
     [['foo', '../../../bar'], '../../bar'],
     [['foo/', '../../../bar'], '../../bar'],
     [['foo/x', '../../../bar'], '../bar'],
     [['foo/x', './bar'], 'foo/x/bar'],
     [['foo/x/', './bar'], 'foo/x/bar'],
     [['foo/x/', '.', 'bar'], 'foo/x/bar'],
     [['./'], './'],
     [['.', './'], './'],
     [['.', '.', '.'], '.'],
     [['.', './', '.'], '.'],
     [['.', '/./', '.'], '.'],
     [['.', '/////./', '.'], '.'],
     [['.'], '.'],
     [['', '.'], '.'],
     [['', 'foo'], 'foo'],
     [['foo', '/bar'], 'foo/bar'],
     [['', '/foo'], '/foo'],
     [['', '', '/foo'], '/foo'],
     [['', '', 'foo'], 'foo'],
     [['foo', ''], 'foo'],
     [['foo/', ''], 'foo/'],
     [['foo', '', '/bar'], 'foo/bar'],
     [['./', '..', '/foo'], '../foo'],
     [['./', '..', '..', '/foo'], '../../foo'],
     [['.', '..', '..', '/foo'], '../../foo'],
     [['', '..', '..', '/foo'], '../../foo'],
     [['/'], '/'],
     [['/', '.'], '/'],
     [['/', '..'], '/'],
     [['/', '..', '..'], '/'],
     [[''], '.'],
     [['', ''], '.'],
     [[' /foo'], ' /foo'],
     [[' ', 'foo'], ' /foo'],
     [[' ', '.'], ' '],
     [[' ', '/'], ' /'],
     [[' ', ''], ' '],
     [['/', 'foo'], '/foo'],
     [['/', '/foo'], '/foo'],
     [['/', '//foo'], '/foo'],
     [['/', '', '/foo'], '/foo'],
     [['', '/', 'foo'], '/foo'],
     [['', '/', '/foo'], '/foo'],
    ],
  ],
];
joinTests.forEach((test) => {
  if (!Array.isArray(test[0]))
    test[0] = [test[0]];
  test[0].forEach((join) => {
    test[1].forEach((test) => {
      const t = test[0].map((p) => Buffer.from(p));
      const actual = join.apply(null, t).toString();
      const expected = test[1];
      // For non-Windows specific tests with the Windows join(), we need to try
      // replacing the slashes since the non-Windows specific tests' `expected`
      // use forward slashes
      const os = 'posix';
      if (actual !== expected) {
        const delimiter = test[0].map(JSON.stringify).join(',');
        const message = `path.${os}.join(${delimiter})\n  expect=${
          JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
        failures.push(`\n${message}`);
      }
    });
  });
});
assert.strictEqual(failures.length, 0, failures.join(''));

// Test normalize().

const normalizeOriginal = path.posix.normalize;
for (const encoding of ['utf8', 'utf16le']) {
  path.posix.normalize = (path) => {
    const p = normalizeOriginal(Buffer.from(path, encoding));
    return p.toString(encoding);
  }
  assert.strictEqual(path.posix.normalize('./fixtures///b/../b/c.js'),
                    'fixtures/b/c.js');
  assert.strictEqual(path.posix.normalize('/foo/../../../bar'), '/bar');
  assert.strictEqual(path.posix.normalize('a//b//../b'), 'a/b');
  assert.strictEqual(path.posix.normalize('a//b//./c'), 'a/b/c');
  assert.strictEqual(path.posix.normalize('a//b//.'), 'a/b');
  assert.strictEqual(path.posix.normalize('/a/b/c/../../../x/y/z'), '/x/y/z');
  assert.strictEqual(path.posix.normalize('///..//./foo/.//bar'), '/foo/bar');
  assert.strictEqual(path.posix.normalize('bar/foo../../'), 'bar/');
  assert.strictEqual(path.posix.normalize('bar/foo../..'), 'bar');
  assert.strictEqual(path.posix.normalize('bar/foo../../baz'), 'bar/baz');
  assert.strictEqual(path.posix.normalize('bar/foo../'), 'bar/foo../');
  assert.strictEqual(path.posix.normalize('bar/foo..'), 'bar/foo..');
  assert.strictEqual(path.posix.normalize('../foo../../../bar'), '../../bar');
  assert.strictEqual(path.posix.normalize('../.../.././.../../../bar'),
                    '../../bar');
  assert.strictEqual(path.posix.normalize('../../../foo/../../../bar'),
                    '../../../../../bar');
  assert.strictEqual(path.posix.normalize('../../../foo/../../../bar/../../'),
                    '../../../../../../');
  assert.strictEqual(
    path.posix.normalize('../foobar/barfoo/foo/../../../bar/../../'),
    '../../'
  );
  assert.strictEqual(
    path.posix.normalize('../.../../foobar/../../../bar/../../baz'),
    '../../../../baz'
  );
  assert.strictEqual(path.posix.normalize('foo/bar\\baz'), 'foo/bar\\baz');
}
