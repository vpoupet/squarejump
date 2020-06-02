import sys
from PIL import Image

symbols = {
    (0, 0, 0, 0): ' ',
    (0, 0, 0, 255): 'x',
    (171, 92, 28, 255): '-',
    (239, 58, 12, 255): '!',
    (239, 172, 40, 255): '@',
}


def to_string(filename):
    im = Image.open(filename)
    px = im.load()
    width = 0
    height = 0
    for i in range(im.size[1] - 1, -1, -1):
        if any(px[j, i] != (0, 0, 0, 0) for j in range(im.size[0])):
            height = im.size[1] - i
            width = max(width, max(j for j in range(im.size[0]) if px[j, i] != (0, 0, 0, 0)) + 1)
    print(width, height)
    lines = []
    for i in range(im.size[1] - height, im.size[1]):
        lines.append(''.join(symbols[px[j, i]] for j in range(width)))
    return '\n'.join(lines)


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        print(to_string(sys.argv[1]))
