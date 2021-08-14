# path-buffer

Partial port of Node.js' path module, with support for manipulating buffers
rather than strings.

This work is in pursuit of moving [fs.cp](https://github.com/nodejs/node/pull/39372)
towards a stable implementation.

## API

* [dirname](https://nodejs.org/api/path.html#path_path_dirname_path) (posix).
* [isAbsolute](https://nodejs.org/api/path.html#path_path_isabsolute_path) (posix).
* [join](https://nodejs.org/api/path.html#path_path_join_paths) (posix).
* [normalize](https://nodejs.org/api/path.html#path_path_normalize_path) (posix).
