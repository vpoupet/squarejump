import sys
from PIL import Image

symbols = ' x-!BDS'


def to_string(filename):
    im = Image.open(filename)
    px = im.load()
    lines = []
    for i in range(im.size[1]):
        lines.append(''.join(symbols[px[j, i]] for j in range(im.size[0])))
    return '\n'.join(lines)


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        print(to_string(sys.argv[1]))
