# samuelstevens.github.io-src

This is the repo that stores the source code and build process for https://samuelstevens.me, which is also hosted at https://samuelstevens.github.io.

[Jinja](http://jinja.pocoo.org/) is used as a templating engine, and the `build.py` file translates the templates to static html, in a neighboring `dist` directory that is connected to the ["prod" repo](https://github.com/samuelstevens/samuelstevens.github.io).

## Usage
```bash
pip install -R requirements.txt # preferably in a virtualenv

python build.py # expects a sibling directory called 'dist'
```

## To Do

I've written this script in a very, _very_ hacky fashion, so there are some improvements I would like to make so that I can use it in other applications (namely [Salty Software's website](https://www.salty.software)).

 ✔ remove hardcoded `/essays` directory.
  - Now works with any subdirectory combination
- use path separators to strip the `pages/` from the page directories instead of subindexes.
- use python's `os` package for more checks when writing files.
- compare existing files vs the new files to see what needs to be written again.
- add a 'watch' functionality, such that I can use this as a development server.
- package this as a pip package.
