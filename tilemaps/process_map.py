import json
import sys

GROUND_INDEXES = list(range(1, 14)) + list(range(15, 22)) + list(range(23, 28)) + list(range(33, 36))
GRASS_INDEXES = [1, 2, 3, 7, 16, 25, 26, 27]


def parse_file(filename):
    scene_data = json.loads(open(filename).read())
    layer = next((l for l in scene_data['layers'] if l['name'] == 'main'), None)
    if layer is None:
        return None
    return [layer['data'][i: i + layer['width']] for i in range(0, len(layer['data']), layer['height'])]


def make_borders(grid):
    local_rule = {
        0b0000: (24, 16),
        0b0001: (35, 27),
        0b0010: (8, 7),
        0b0011: (6, 3),
        0b0100: (33, 25),
        0b0101: (34, 26),
        0b0110: (4, 1),
        0b0111: (5, 2),
        0b1000: 23,
        0b1001: 19,
        0b1010: 15,
        0b1011: 11,
        0b1100: 17,
        0b1101: 18,
        0b1110: 9,
        0b1111: 10,
    }
    shadow = [[v in GROUND_INDEXES for v in line] for line in grid]
    height = len(grid)
    width = len(grid[0])
    for i in range(height):
        for j in range(width):
            if shadow[i][j]:
                n = 0
                if i <= 0 or shadow[i-1][j]:
                    n += 8
                if j >= width - 1 or shadow[i][j+1]:
                    n += 4
                if i >= height - 1 or shadow[i+1][j]:
                    n += 2
                if j <= 0 or shadow[i][j-1]:
                    n += 1
                if isinstance(local_rule[n], tuple):
                    if grid[i][j] in GRASS_INDEXES:
                        grid[i][j] = local_rule[n][1]
                    else:
                        grid[i][j] = local_rule[n][0]
                else:
                    grid[i][j] = local_rule[n]

    for i in range(height):
        for j in range(width):
            if grid[i][j] == 10:
                if i > 0 and j < width - 1 and not shadow[i-1][j+1]:
                    grid[i][j] = 20
                elif i > 0 and j > 0 and not shadow[i-1][j-1]:
                    grid[i][j] = 21
                elif i < height - 1 and j < width - 1 and not shadow[i+1][j+1]:
                    grid[i][j] = 12
                elif i < height - 1 and j > 0 and not shadow[i+1][j-1]:
                    grid[i][j] = 13


if __name__ == '__main__':
    if len(sys.argv) > 1:
        with open(sys.argv[1]) as f_in:
            scene_data = json.loads(f_in.read())
        layer = next((l for l in scene_data['layers'] if l['name'] == 'main'), None)
        if layer is not None:
            grid = [layer['data'][i: i + layer['width']] for i in range(0, len(layer['data']), layer['width'])]
            make_borders(grid)
            layer['data'] = sum(grid, [])
            filename_out = sys.argv[2] if len(sys.argv) > 2 else sys.argv[1]
            with open(filename_out, 'w') as f_out:
                f_out.write(json.dumps(scene_data))
