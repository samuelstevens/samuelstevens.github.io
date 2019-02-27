import shutil, os, glob, sys
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sh import git

def build():
    env = Environment(
        loader=FileSystemLoader(['templates', 'pages']),
        autoescape=select_autoescape(['html', 'xml'])
    )

    # TODO: this is bad f[:5]
    pages = [f[6:] for f in glob.glob('pages/**/*.h2', recursive=True)]

    print(pages)

    for page in pages:
        template = env.get_template(page)

        with open('./%s' % (page), 'w') as f:
            f.write(template.render())


# make it run
def main():
    git('checkout', 'master')

    # TODO
    build()


    # throws error if nothing has been updated
    p = git('add', '.')
    p = git('commit', '-m', '"Updated pages via build.py"')

    if 'push' in sys.argv:
        p = git('push')

if __name__ == '__main__':
    main()
