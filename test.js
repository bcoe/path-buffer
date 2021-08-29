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
  const failures = [];
  const backslashRE = /\\/g;
  const originalJoinPosix = path.posix.join;
  const originalJoinWin32 = path.win32.join;
  for (const encoding of ['utf8', 'utf16le']) {
    path.posix.join = (...args) => {
      const hasAnyPaths = args.length && args[0] !== '';
      for (let i = 0; i < args.length; i++) {
        args[i] = Buffer.from(args[i], hasAnyPaths ? encoding : undefined);
      }
      return originalJoinPosix.apply(originalJoinPosix, args).toString(
        hasAnyPaths ? encoding : undefined
      );
    }
    path.win32.join = (...args) => {
      const hasAnyPaths = args.length && args[0] !== '';
      for (let i = 0; i < args.length; i++) {
        args[i] = Buffer.from(args[i], hasAnyPaths ? encoding : undefined);
      }
      return originalJoinWin32.apply(originalJoinWin32, args).toString(
        hasAnyPaths ? encoding : undefined
      );
    }
    const joinTests = [
      [ [path.posix.join, path.win32.join],
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
    
    // Windows-specific join tests
    joinTests.push([
      path.win32.join,
      joinTests[0][1].slice(0).concat(
        [// Arguments                     result
          // UNC path expected
          [['//foo/bar'], '\\\\foo\\bar\\'],
          [['\\/foo/bar'], '\\\\foo\\bar\\'],
          [['\\\\foo/bar'], '\\\\foo\\bar\\'],
          // UNC path expected - server and share separate
          [['//foo', 'bar'], '\\\\foo\\bar\\'],
          [['//foo/', 'bar'], '\\\\foo\\bar\\'],
          [['//foo', '/bar'], '\\\\foo\\bar\\'],
          // UNC path expected - questionable
          [['//foo', '', 'bar'], '\\\\foo\\bar\\'],
          [['//foo/', '', 'bar'], '\\\\foo\\bar\\'],
          [['//foo/', '', '/bar'], '\\\\foo\\bar\\'],
          // UNC path expected - even more questionable
          [['', '//foo', 'bar'], '\\\\foo\\bar\\'],
          [['', '//foo/', 'bar'], '\\\\foo\\bar\\'],
          [['', '//foo/', '/bar'], '\\\\foo\\bar\\'],
          // No UNC path expected (no double slash in first component)
          [['\\', 'foo/bar'], '\\foo\\bar'],
          [['\\', '/foo/bar'], '\\foo\\bar'],
          [['', '/', '/foo/bar'], '\\foo\\bar'],
          // No UNC path expected (no non-slashes in first component -
          // questionable)
          [['//', 'foo/bar'], '\\foo\\bar'],
          [['//', '/foo/bar'], '\\foo\\bar'],
          [['\\\\', '/', '/foo/bar'], '\\foo\\bar'],
          [['//'], '\\'],
          // No UNC path expected (share name missing - questionable).
          [['//foo'], '\\foo'],
          [['//foo/'], '\\foo\\'],
          [['//foo', '/'], '\\foo\\'],
          [['//foo', '', '/'], '\\foo\\'],
          // No UNC path expected (too many leading slashes - questionable)
          [['///foo/bar'], '\\foo\\bar'],
          [['////foo', 'bar'], '\\foo\\bar'],
          [['\\\\\\/foo/bar'], '\\foo\\bar'],
          // Drive-relative vs drive-absolute paths. This merely describes the
          // status quo, rather than being obviously right
          [['c:'], 'c:.'],
          [['c:.'], 'c:.'],
          [['c:', ''], 'c:.'],
          [['', 'c:'], 'c:.'],
          [['c:.', '/'], 'c:.\\'],
          [['c:.', 'file'], 'c:file'],
          [['c:', '/'], 'c:\\'],
          [['c:', 'file'], 'c:\\file'],
        ]
      ),
    ]);
    joinTests.forEach((test) => {
      if (!Array.isArray(test[0]))
        test[0] = [test[0]];
      test[0].forEach((join) => {
        test[1].forEach((test) => {
          const actual = join.apply(null, test[0]);
          const expected = test[1];
          // For non-Windows specific tests with the Windows join(), we need to try
          // replacing the slashes since the non-Windows specific tests' `expected`
          // use forward slashes
          let actualAlt;
          let os;
          if (join === path.win32.join) {
            actualAlt = actual.replace(backslashRE, '/');
            os = 'win32';
          } else {
            os = 'posix';
          }
          if (actual !== expected && actualAlt !== expected) {
            const delimiter = test[0].map(JSON.stringify).join(',');
            const message = `path.${os}.join(${delimiter})\n  expect=${
              JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
            failures.push(`\n${message}`);
          }
        });
      });
    });
    assert.strictEqual(failures.length, 0, failures.join(''));
  }
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
