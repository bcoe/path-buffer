const path = require('./path-buffer');
const assert = require('assert');
const pathString= require('path');

const platformIsWin32 = (process.platform === 'win32');

// Test dirname()

{
  const dirnameOriginalPosix = path.posix.dirname;
  const dirnameOriginalWin32 = path.win32.dirname;
  for (const encoding of ['utf8', 'utf16le']) {
    path.posix.dirname = (path) => {
      return dirnameOriginalPosix(Buffer.from(path, encoding)).toString(path ? encoding : undefined);
    }
    path.win32.dirname = (path) => {
      return dirnameOriginalWin32(Buffer.from(path, encoding)).toString(path ? encoding : undefined);
    }
    assert.strictEqual(path.posix.dirname('/a/b/'), '/a');
    assert.strictEqual(path.posix.dirname('/a/b'), '/a');
    assert.strictEqual(path.posix.dirname('/a'), '/');
    assert.strictEqual(path.posix.dirname(''), '.');
    assert.strictEqual(path.posix.dirname('/'), '/');
    assert.strictEqual(path.posix.dirname('////'), '/');
    assert.strictEqual(path.posix.dirname('//a'), '//');
    assert.strictEqual(path.posix.dirname('foo'), '.');

    assert.strictEqual(path.win32.dirname('c:\\'), 'c:\\');
    assert.strictEqual(path.win32.dirname('c:\\foo'), 'c:\\');
    assert.strictEqual(path.win32.dirname('c:\\foo\\'), 'c:\\');
    assert.strictEqual(path.win32.dirname('c:\\foo\\bar'), 'c:\\foo');
    assert.strictEqual(path.win32.dirname('c:\\foo\\bar\\'), 'c:\\foo');
    assert.strictEqual(path.win32.dirname('c:\\foo\\bar\\baz'), 'c:\\foo\\bar');
    assert.strictEqual(path.win32.dirname('c:\\foo bar\\baz'), 'c:\\foo bar');
    assert.strictEqual(path.win32.dirname('\\'), '\\');
    assert.strictEqual(path.win32.dirname('\\foo'), '\\');
    assert.strictEqual(path.win32.dirname('\\foo\\'), '\\');
    assert.strictEqual(path.win32.dirname('\\foo\\bar'), '\\foo');
    assert.strictEqual(path.win32.dirname('\\foo\\bar\\'), '\\foo');
    assert.strictEqual(path.win32.dirname('\\foo\\bar\\baz'), '\\foo\\bar');
    assert.strictEqual(path.win32.dirname('\\foo bar\\baz'), '\\foo bar');
    assert.strictEqual(path.win32.dirname('c:'), 'c:');
    assert.strictEqual(path.win32.dirname('c:foo'), 'c:');
    assert.strictEqual(path.win32.dirname('c:foo\\'), 'c:');
    assert.strictEqual(path.win32.dirname('c:foo\\bar'), 'c:foo');
    assert.strictEqual(path.win32.dirname('c:foo\\bar\\'), 'c:foo');
    assert.strictEqual(path.win32.dirname('c:foo\\bar\\baz'), 'c:foo\\bar');
    assert.strictEqual(path.win32.dirname('c:foo bar\\baz'), 'c:foo bar');
    assert.strictEqual(path.win32.dirname('file:stream'), '.');
    assert.strictEqual(path.win32.dirname('dir\\file:stream'), 'dir');
    assert.strictEqual(path.win32.dirname('\\\\unc\\share'),
                       '\\\\unc\\share');
    assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo'),
                       '\\\\unc\\share\\');
    assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\'),
                       '\\\\unc\\share\\');
    assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\bar'),
                       '\\\\unc\\share\\foo');
    assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\bar\\'),
                       '\\\\unc\\share\\foo');
    assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\bar\\baz'),
                       '\\\\unc\\share\\foo\\bar');
    assert.strictEqual(path.win32.dirname('/a/b/'), '/a');
    assert.strictEqual(path.win32.dirname('/a/b'), '/a');
    assert.strictEqual(path.win32.dirname('/a'), '/');
    assert.strictEqual(path.win32.dirname(''), '.');
    assert.strictEqual(path.win32.dirname('/'), '/');
    assert.strictEqual(path.win32.dirname('////'), '/');
    assert.strictEqual(path.win32.dirname('foo'), '.');
  }
}

// Test isAbsolute().

{
  const isAbsoluteOriginalPosix = path.posix.isAbsolute;
  const isAbsoluteOriginalWin32 = path.win32.isAbsolute;
  for (const encoding of ['utf8', 'utf16le']) {
    path.posix.isAbsolute = (path) => {
      return isAbsoluteOriginalPosix(Buffer.from(path, encoding));
    }
    path.win32.isAbsolute = (path) => {
      return isAbsoluteOriginalWin32(Buffer.from(path, encoding));
    }
    assert.strictEqual(path.win32.isAbsolute('/'), true);
    assert.strictEqual(path.win32.isAbsolute('//'), true);
    assert.strictEqual(path.win32.isAbsolute('//server'), true);
    assert.strictEqual(path.win32.isAbsolute('//server/file'), true);
    assert.strictEqual(path.win32.isAbsolute('\\\\server\\file'), true);
    assert.strictEqual(path.win32.isAbsolute('\\\\server'), true);
    assert.strictEqual(path.win32.isAbsolute('\\\\'), true);
    assert.strictEqual(path.win32.isAbsolute('c'), false);
    assert.strictEqual(path.win32.isAbsolute('c:'), false);
    assert.strictEqual(path.win32.isAbsolute('c:\\'), true);
    assert.strictEqual(path.win32.isAbsolute('c:/'), true);
    assert.strictEqual(path.win32.isAbsolute('c://'), true);
    assert.strictEqual(path.win32.isAbsolute('C:/Users/'), true);
    assert.strictEqual(path.win32.isAbsolute('C:\\Users\\'), true);
    assert.strictEqual(path.win32.isAbsolute('C:cwd/another'), false);
    assert.strictEqual(path.win32.isAbsolute('C:cwd\\another'), false);
    assert.strictEqual(path.win32.isAbsolute('directory/directory'), false);
    assert.strictEqual(path.win32.isAbsolute('directory\\directory'), false);
    
    assert.strictEqual(path.posix.isAbsolute('/home/foo'), true);
    assert.strictEqual(path.posix.isAbsolute('/home/foo/..'), true);
    assert.strictEqual(path.posix.isAbsolute('bar/'), false);
    assert.strictEqual(path.posix.isAbsolute('./baz'), false);
  }
}

// Test join().

{
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
    for (const encoding of ['utf8', 'utf16le']) {
      test[0].forEach((join) => {
        test[1].forEach((test) => {
          const hasAnyPaths = test[0].join('') !== '';
          const t = test[0].map((p) => Buffer.from(p, encoding));
          const actual = join.apply(null, t).toString(hasAnyPaths ? encoding : undefined);
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
            throw Error(message);
          }
        });
      });
    }
  });
  assert.strictEqual(failures.length, 0, failures.join(''));
}

// Test normalize().

{
  const normalizeOriginalPosix = path.posix.normalize;
  const normalizeOriginalWin32 = path.win32.normalize;
  for (const encoding of ['utf8', 'utf16le']) {
    path.posix.normalize = (path) => {
      const p = normalizeOriginalPosix(Buffer.from(path, encoding));
      return p.toString(encoding);
    }
    path.win32.normalize = (path) => {
      const p = normalizeOriginalWin32(Buffer.from(path, encoding));
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

    assert.strictEqual(path.win32.normalize('./fixtures///b/../b/c.js'),
    'fixtures\\b\\c.js');
    assert.strictEqual(path.win32.normalize('/foo/../../../bar'), '\\bar');
    assert.strictEqual(path.win32.normalize('a//b//../b'), 'a\\b');
    assert.strictEqual(path.win32.normalize('a//b//./c'), 'a\\b\\c');
    assert.strictEqual(path.win32.normalize('a//b//.'), 'a\\b');
    assert.strictEqual(path.win32.normalize('//server/share/dir/file.ext'),
        '\\\\server\\share\\dir\\file.ext');
    assert.strictEqual(path.win32.normalize('/a/b/c/../../../x/y/z'), '\\x\\y\\z');
    assert.strictEqual(path.win32.normalize('C:'), 'C:.');
    assert.strictEqual(path.win32.normalize('C:..\\abc'), 'C:..\\abc');
    assert.strictEqual(path.win32.normalize('C:..\\..\\abc\\..\\def'),
        'C:..\\..\\def');
    assert.strictEqual(path.win32.normalize('C:\\.'), 'C:\\');
    assert.strictEqual(path.win32.normalize('file:stream'), 'file:stream');
    assert.strictEqual(path.win32.normalize('bar\\foo..\\..\\'), 'bar\\');
    assert.strictEqual(path.win32.normalize('bar\\foo..\\..'), 'bar');
    assert.strictEqual(path.win32.normalize('bar\\foo..\\..\\baz'), 'bar\\baz');
    assert.strictEqual(path.win32.normalize('bar\\foo..\\'), 'bar\\foo..\\');
    assert.strictEqual(path.win32.normalize('bar\\foo..'), 'bar\\foo..');
    assert.strictEqual(path.win32.normalize('..\\foo..\\..\\..\\bar'),
        '..\\..\\bar');
    assert.strictEqual(path.win32.normalize('..\\...\\..\\.\\...\\..\\..\\bar'),
        '..\\..\\bar');
    assert.strictEqual(path.win32.normalize('../../../foo/../../../bar'),
        '..\\..\\..\\..\\..\\bar');
    assert.strictEqual(path.win32.normalize('../../../foo/../../../bar/../../'),
        '..\\..\\..\\..\\..\\..\\');
    assert.strictEqual(
    path.win32.normalize('../foobar/barfoo/foo/../../../bar/../../'),
    '..\\..\\'
    );
    assert.strictEqual(
    path.win32.normalize('../.../../foobar/../../../bar/../../baz'),
    '..\\..\\..\\..\\baz'
    );
    assert.strictEqual(path.win32.normalize('foo/bar\\baz'), 'foo\\bar\\baz');
  }
}
