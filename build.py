import shutil, os, glob, sys
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sh import git

def build():
    env = Environment(
        loader=FileSystemLoader(['templates', 'pages']),
        autoescape=select_autoescape(['html', 'xml'])
    )

    # TODO: this is bad f[:5]
    pages = [f[6:] for f in glob.glob('pages/**/*.html', recursive=True)]

    print(pages)

    for page in pages:
        template = env.get_template(page)

        with open('../dist/%s' % (page), 'w') as f:
            f.write(template.render())


# make it run
def main():
    my_git = git.bake('-C', '../dist')
    my_git('checkout', 'master')

    # delete the folder
    if os.path.isdir('../dist/'):
        shutil.rmtree('../dist')


    # copy the static folders over again
    shutil.copytree('./css', '../dist/css')
    shutil.copytree('./img', '../dist/img')

    # TODO
    os.mkdir('../dist/essays')
    build()




    # throws error if nothing has been updated
    p = my_git('add', '.')
    p = my_git('commit', '-m', '"Updated pages via build.py"')

    if 'push' in sys.argv:
        p = my_git('push')

if __name__ == '__main__':
    main()
