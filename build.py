import shutil, os, glob, sys, datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sh import git

def build():
    env = Environment(
        loader=FileSystemLoader(['templates', 'pages']),
        autoescape=select_autoescape(['html', 'xml'])
    )

    updated_files_list = []

    # TODO: this is bad f[:5]
    template_page_list = [f[6:] for f in glob.glob('pages/**/*.j2.html', recursive=True)]


    for template_file in template_page_list:
        html_file = template_file.replace('.j2', '')
        updated_files_list.append(html_file)

        # normalize the path and split it by the os separator
        path = os.path.normpath(html_file).split(os.sep)

        file = path[-1]
        path = path[:-1]

        # make folders that don't exist currently
        for i in range(len(path)):
            folder = os.sep.join(path[:i+1])
            if not os.path.isdir(folder):
                os.mkdir(folder)

        # get the template for the existing file
        template = env.get_template(template_file)

        # write the finished template to the file
        with open('./%s' % (html_file), 'w') as f:
            f.write(template.render())

    return updated_files_list

# make it run
def main():
    git('checkout', 'master')

    updated_files = build()

    if 'commit' in sys.argv:
        for file in updated_files:
            p = git('add', file)
        p = git('commit', '-m', '"Updated pages via build.py on %s"' % datetime.date.today())

    if 'push' in sys.argv:
        p = git('push')

if __name__ == '__main__':
    main()
