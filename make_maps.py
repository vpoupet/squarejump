import re
import subprocess

with open("maps.js", "r") as f_in:
    with open("maps_.js", "w") as f_out:
        for line in f_in:
            if re.match(r'\s*//', line):
                f_out.write(line)
            else:
                try:
                    name = re.findall(r'{{(\w+)}}', line)[0]
                    data_lines = open(f'tilemaps/{name}.json').readlines()
                    f_out.write('    const s = scene.Scene.fromJSON(\n')
                    for data_line in data_lines:
                        f_out.write('        ')
                        f_out.write(data_line)
                    f_out.write('    );\n')
                    f_out.write(f'    scenes.{name} = s;\n')
                except IndexError:
                    f_out.write(line)

subprocess.run(['browserify', 'main.js', '--debug', '-o', 'bundle.js'])
