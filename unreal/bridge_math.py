"""Pure coordinate conversion, shared with tests. Three Y-up -> Unreal Z-up."""
def mul(a, b):
    x, y, z, w = a
    X, Y, Z, W = b
    return (w*X+x*W+y*Z-z*Y, w*Y-x*Z+y*W+z*X,
            w*Z+x*Y-y*X+z*W, w*W-x*X-y*Y-z*Z)


def rotate(q, v):
    return mul(mul(q, (*v, 0)), (-q[0], -q[1], -q[2], q[3]))[:3]


def convert(part, origin=(0, 0, 0), anchor_q=(0, 0, 0, 1), cm=35):
    x, y, z = part['p']
    p = rotate(anchor_q, (z*cm, x*cm, y*cm))
    qx, qy, qz, qw = part['q']
    q = mul(anchor_q, (qz, qx, qy, qw))
    sx, sy, sz = part['s']
    return tuple(p[i]+origin[i] for i in range(3)), q, (sz*cm/100, sx*cm/100, sy*cm/100)


def linear_color(hex_color):
    def linear(v):
        return v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4
    return tuple(linear(int(hex_color[i:i+2], 16)/255) for i in (1, 3, 5))
