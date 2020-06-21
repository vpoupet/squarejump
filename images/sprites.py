from PIL import Image, ImageOps

light_color = (103, 143, 203, 255)
dark_color = (52, 92, 152, 255)

palette = {
    light_color: dark_color,
}


def get_palette(im):
    px = im.load()
    colors = set()
    for x in range(im.width):
        for y in range(im.height):
            colors.add(px[x, y])
    return colors


def swap_palette(im, palette):
    im2 = Image.new('RGBA', (im.width, 2 * im.height))

    for x in range(im.width // 16):
        for y in range(im.height // 16):
            tile = im.crop((16 * x, 16 * y, 16 * (x + 1), 16 * (y + 1)))
            im2.paste(tile, (16 * x, 32 * y))
            px = tile.load()
            for tx in range(tile.width):
                for ty in range(tile.height):
                    if px[tx, ty] in palette:
                        px[tx, ty] = palette[px[tx, ty]]
            im2.paste(tile, (16 * x, 32 * y + 16))
    return im2


def make_reverse(im):
    im2 = Image.new('RGBA', (im.width, 2 * im.height))

    for x in range(im.width // 16):
        for y in range(im.height // 16):
            tile = im.crop((16 * x, 16 * y, 16 * (x + 1), 16 * (y + 1)))
            im2.paste(tile, (16 * x, 32 * y))
            im2.paste(ImageOps.mirror(tile), (16 * x, 32 * y + 16))

    return im2


def cycle_colors(im):
    im2 = im.copy()
    px = im2.load()
    for x in range(im2.width):
        for y in range(im2.height):
            r, g, b, a = px[x, y]
            px[x, y] = (b, r, g, a)
    return im2


if __name__ == '__main__':
    im = Image.open("hero.png")
    im_blue = make_reverse(swap_palette(im, palette))
    im_red = cycle_colors(im_blue)
    im_green = cycle_colors(im_red)

    im_red.save("hero_red.png")
    im_green.save("hero_green.png")
    im_blue.save("hero_blue.png")
