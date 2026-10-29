"""
Generates every game graphic in public/img/ as SVG.

All artwork is original and drawn from code, so it's easy to tweak:
change a colour or a pixel map below and run

    npm run art      (or: python tools/generate-art.py)
"""

import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "img"

# ---------------------------------------------------------------- palette

FACE = "#c6c6c6"       # tile face
LIGHT = "#ffffff"      # bevel highlight
SHADOW = "#7f7f7f"     # bevel shadow
OPEN = "#bdbdbd"       # opened tile
GRID = "#8e8e8e"       # grid line on opened tiles
INK = "#1d1d1f"        # outlines

NUMBER_COLORS = {
    1: "#1d4ed8",  # blue
    2: "#15803d",  # green
    3: "#dc2626",  # red
    4: "#312e81",  # indigo
    5: "#9f1239",  # crimson
    6: "#0f766e",  # teal
    7: "#1f1f1f",  # black
    8: "#6b7280",  # grey
}

# Player colours (match the codes used by the game: LB, DB, G, R)
PLAYERS = {
    "lightBlue": ("#2563eb", "#1e3a8a"),
    "darkBlue": ("#1e2a78", "#0b1240"),
    "green": ("#16a34a", "#14532d"),
    "red": ("#e11d2e", "#7f1d1d"),
}

# ---------------------------------------------------------------- helpers


def svg(view_w, view_h, body, crisp=False, extra=""):
    rendering = ' shape-rendering="crispEdges"' if crisp else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_w} {view_h}"'
        f' width="{view_w * 4}" height="{view_h * 4}"{rendering}{extra}>\n{body}\n</svg>\n'
    )


def save(name, content):
    (OUT / name).write_text(content, encoding="utf-8")


def pixels(rows, x0, y0, color, size=1):
    """Turns a text pixel map ('#' = filled) into rects, merging runs per row."""
    rects = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            if row[x] == "#":
                start = x
                while x < len(row) and row[x] == "#":
                    x += 1
                rects.append(
                    f'<rect x="{x0 + start * size}" y="{y0 + y * size}" '
                    f'width="{(x - start) * size}" height="{size}"/>'
                )
            else:
                x += 1
    return f'<g fill="{color}">{"".join(rects)}</g>'


def raised(size=16, bevel=2, face=FACE):
    """A raised square (closed tile / button)."""
    s, b = size, bevel
    return (
        f'<rect width="{s}" height="{s}" fill="{face}"/>'
        f'<polygon points="0,0 {s},0 {s - b},{b} {b},{b} {b},{s - b} 0,{s}" fill="{LIGHT}"/>'
        f'<polygon points="{s},0 {s},{s} 0,{s} {b},{s - b} {s - b},{s - b} {s - b},{b}" fill="{SHADOW}"/>'
    )


def sunken(size=16, bevel=2, face=FACE):
    """A pressed-in square (pressed button)."""
    s, b = size, bevel
    return (
        f'<rect width="{s}" height="{s}" fill="{face}"/>'
        f'<polygon points="0,0 {s},0 {s - b},{b} {b},{b} {b},{s - b} 0,{s}" fill="{SHADOW}"/>'
        f'<polygon points="{s},0 {s},{s} 0,{s} {b},{s - b} {s - b},{s - b} {s - b},{b}" fill="{LIGHT}"/>'
    )


def opened(size=16, face=OPEN):
    return (
        f'<rect width="{size}" height="{size}" fill="{face}"/>'
        f'<rect width="{size}" height="1" fill="{GRID}"/>'
        f'<rect width="1" height="{size}" fill="{GRID}"/>'
    )


# ---------------------------------------------------------------- cell numbers
# 8 x 10 pixel glyphs with 2-pixel strokes.

DIGITS = {
    1: ["...##...", "..###...", ".####...", "...##...", "...##...",
        "...##...", "...##...", "...##...", ".######.", ".######."],
    2: ["..####..", ".######.", "##....##", ".....##.", "....##..",
        "...##...", "..##....", ".##.....", "########", "########"],
    3: [".######.", "########", "......##", "...####.", "...####.",
        "......##", "......##", "##....##", "########", ".######."],
    4: ["....###.", "...####.", "..##.##.", ".##..##.", "##...##.",
        "########", "########", ".....##.", ".....##.", ".....##."],
    5: ["########", "########", "##......", "#######.", "########",
        "......##", "......##", "##....##", "########", ".######."],
    6: ["..#####.", ".######.", "##......", "##......", "#######.",
        "########", "##....##", "##....##", "########", ".######."],
    7: ["########", "########", "......##", ".....##.", "....##..",
        "...##...", "...##...", "..##....", "..##....", "..##...."],
    8: [".######.", "########", "##....##", "##....##", ".######.",
        ".######.", "##....##", "##....##", "########", ".######."],
}


def number_tile(n):
    return svg(16, 16, opened() + pixels(DIGITS[n], 4, 3, NUMBER_COLORS[n]), crisp=True)


# ---------------------------------------------------------------- mine

def mine_body(cx=8.5, cy=8.5):
    spikes = []
    for angle in range(0, 360, 45):
        long = angle % 90 == 0
        length = 6.2 if long else 5.0
        width = 1.5 if long else 1.3
        spikes.append(
            f'<rect x="{cx - width / 2}" y="{cy - length}" width="{width}" height="{length}" '
            f'rx="0.4" transform="rotate({angle} {cx} {cy})"/>'
        )
    return (
        '<defs><radialGradient id="m" cx="0.35" cy="0.32" r="0.75">'
        '<stop offset="0" stop-color="#7a7f87"/><stop offset="0.45" stop-color="#2a2d33"/>'
        '<stop offset="1" stop-color="#0c0d10"/></radialGradient></defs>'
        f'<g fill="{INK}">{"".join(spikes)}</g>'
        f'<circle cx="{cx}" cy="{cy}" r="4.4" fill="url(#m)" stroke="{INK}" stroke-width="0.6"/>'
        f'<circle cx="{cx}" cy="{cy}" r="2.6" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="0.6"/>'
        f'<circle cx="{cx - 1.5}" cy="{cy - 1.6}" r="1.05" fill="#ffffff" fill-opacity="0.9"/>'
    )


def mine_tile(red=False):
    background = opened(face="#e5484d") if red else opened()
    return svg(16, 16, background + mine_body())


# ---------------------------------------------------------------- flags

def flag_tile(color, dark):
    flag = (
        # base
        f'<rect x="4.4" y="12" width="9.2" height="1.8" rx="0.3" fill="{INK}"/>'
        f'<rect x="6.2" y="10.6" width="5.6" height="1.6" rx="0.3" fill="{INK}"/>'
        # pole
        f'<rect x="8.3" y="2.2" width="1.4" height="9" fill="{INK}"/>'
        # swallow-tail pennant
        f'<path d="M9.6 2.4 H15.2 L12.9 5.3 L15.2 8.2 H9.6 Z" fill="{color}" stroke="{dark}" '
        f'stroke-width="0.5" stroke-linejoin="round"/>'
        f'<path d="M10 3.1 H13.4" stroke="#ffffff" stroke-opacity="0.45" stroke-width="0.6"/>'
    )
    return svg(16, 16, raised() + flag)


# ---------------------------------------------------------------- cursors

def cursor(color, dark):
    arrow = "M1.2 1 L1.2 13.2 L4.3 10.3 L6.6 15 L8.9 13.9 L6.7 9.4 L10.9 9.4 Z"
    return svg(
        12, 16,
        f'<path d="{arrow}" fill="{color}" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>'
        f'<path d="{arrow}" fill="{color}" stroke="{dark}" stroke-width="0.6" stroke-linejoin="round"/>'
        f'<path d="M2.4 3.4 L2.4 8.6" stroke="#ffffff" stroke-opacity="0.5" stroke-width="0.7" stroke-linecap="round"/>',
    )


# ---------------------------------------------------------------- smiley button
# A sweeper in a hard hat.

def hard_hat(cracked=False):
    hat = (
        '<path d="M5.4 12 C5.4 7.1 8.3 4.6 12 4.6 C15.7 4.6 18.6 7.1 18.6 12 Z" '
        f'fill="#ffb020" stroke="{INK}" stroke-width="0.8" stroke-linejoin="round"/>'
        '<path d="M11 4.8 C10.4 6.5 10.3 9.2 10.4 11.9 L13.6 11.9 C13.7 9.2 13.6 6.5 13 4.8 Z" fill="#ffd166"/>'
        '<path d="M7.3 8.2 C7.9 6.9 8.9 6 10 5.5" stroke="#fff3c4" stroke-width="0.8" stroke-linecap="round" fill="none"/>'
        f'<rect x="4" y="11.3" width="16" height="1.9" rx="0.95" fill="#e08a00" stroke="{INK}" stroke-width="0.8"/>'
    )
    if cracked:
        hat += f'<path d="M15.6 5.6 L14.8 7.4 L16.1 8.3 L15.2 10.2" stroke="{INK}" stroke-width="0.6" fill="none" stroke-linejoin="round"/>'
    return hat


def face_head(dy=0):
    return f'<circle cx="12" cy="{14.6 + dy}" r="6.6" fill="#ffd93b" stroke="{INK}" stroke-width="0.8"/>' \
           f'<ellipse cx="9.4" cy="{16.6 + dy}" rx="1" ry="0.6" fill="#ff8a65" fill-opacity="0.55"/>' \
           f'<ellipse cx="14.6" cy="{16.6 + dy}" rx="1" ry="0.6" fill="#ff8a65" fill-opacity="0.55"/>'


def face(kind):
    pressed = kind == "pressed"
    dy = 0.6 if pressed else 0
    button = sunken(24, 2) if pressed else raised(24, 2)
    parts = [button, face_head(dy)]

    if kind in ("unpressed", "pressed"):
        parts.append(f'<circle cx="9.7" cy="{14.3 + dy}" r="0.95" fill="{INK}"/>')
        parts.append(f'<circle cx="14.3" cy="{14.3 + dy}" r="0.95" fill="{INK}"/>')
    if kind == "unpressed":
        parts.append(f'<path d="M9.3 16.9 Q12 19.4 14.7 16.9" stroke="{INK}" stroke-width="0.9" fill="none" stroke-linecap="round"/>')
    if kind == "pressed":
        parts.append(f'<ellipse cx="12" cy="{17.6 + dy}" rx="1.1" ry="1.3" fill="{INK}"/>')
    if kind == "win":
        parts.append(
            f'<path d="M7.2 13.2 H16.8" stroke="{INK}" stroke-width="0.7"/>'
            f'<rect x="7.3" y="13" width="4" height="2.6" rx="1" fill="{INK}"/>'
            f'<rect x="12.7" y="13" width="4" height="2.6" rx="1" fill="{INK}"/>'
            '<path d="M8.1 13.7 L9.2 13.7" stroke="#ffffff" stroke-opacity="0.7" stroke-width="0.6" stroke-linecap="round"/>'
            '<path d="M13.5 13.7 L14.6 13.7" stroke="#ffffff" stroke-opacity="0.7" stroke-width="0.6" stroke-linecap="round"/>'
            f'<path d="M9 17 Q12 20.6 15 17 Z" fill="{INK}"/>'
            '<path d="M9.9 17.6 Q12 18.6 14.1 17.6" stroke="#ffffff" stroke-width="0.7" fill="none"/>'
        )
    if kind == "lose":
        for cx in (9.7, 14.3):
            parts.append(
                f'<path d="M{cx - 1} 13.3 L{cx + 1} 15.3 M{cx + 1} 13.3 L{cx - 1} 15.3" '
                f'stroke="{INK}" stroke-width="0.8" stroke-linecap="round"/>'
            )
        parts.append(f'<path d="M9.4 18.6 Q12 16.4 14.6 18.6" stroke="{INK}" stroke-width="0.9" fill="none" stroke-linecap="round"/>')

    parts.append(hard_hat(cracked=kind == "lose"))
    return svg(24, 24, "".join(parts))


# ---------------------------------------------------------------- seven-segment counter digits

ON = "#ff3b2f"
OFF = "#3a0b08"

SEGMENTS = {
    "a": ("h", 2.0, 2.4, 10.6), "g": ("h", 11.5, 2.4, 10.6), "d": ("h", 21.0, 2.4, 10.6),
    "f": ("v", 1.6, 2.4, 11.1), "b": ("v", 11.4, 2.4, 11.1),
    "e": ("v", 1.6, 11.9, 20.6), "c": ("v", 11.4, 11.9, 20.6),
}
DIGIT_SEGMENTS = {
    0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc",
    5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg",
}


def segment(kind, fixed, start, end, t=1.0):
    if kind == "h":
        y = fixed
        pts = [(start, y), (start + t, y - t), (end - t, y - t), (end, y), (end - t, y + t), (start + t, y + t)]
    else:
        x = fixed
        pts = [(x, start), (x + t, start + t), (x + t, end - t), (x, end), (x - t, end - t), (x - t, start + t)]
    return " ".join(f"{px:.2f},{py:.2f}" for px, py in pts)


def counter_digit(n):
    lit = DIGIT_SEGMENTS[n]
    off = "".join(f'<polygon points="{segment(*SEGMENTS[s])}"/>' for s in SEGMENTS if s not in lit)
    on = "".join(f'<polygon points="{segment(*SEGMENTS[s])}"/>' for s in SEGMENTS if s in lit)
    body = (
        '<defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%">'
        '<feGaussianBlur stdDeviation="0.45" result="b"/>'
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
        f'<rect width="13" height="23" fill="#0d0d0d"/>'
        f'<g fill="{OFF}">{off}</g><g fill="{ON}" filter="url(#glow)">{on}</g>'
    )
    return svg(13, 23, body)


def counter_panel():
    # Black display window with a sunken frame (three digits sit on top).
    return svg(
        41, 25,
        '<rect width="41" height="25" fill="#0d0d0d"/>'
        f'<polygon points="0,0 41,0 40,1 1,1 1,24 0,25" fill="{SHADOW}"/>'
        f'<polygon points="41,0 41,25 0,25 1,24 40,24 40,1" fill="{LIGHT}"/>',
        crisp=True,
    )


# ---------------------------------------------------------------- misc

def chevron():
    rows = ["#......#", "##....##", ".##..##.", "..####..", "...##..."]
    return svg(8, 5, pixels(rows, 0, 0, INK), crisp=True)


def background():
    """A mid-game co-op board, used blurred behind the menus."""
    rng = random.Random(7)
    w, h = 40, 26
    mines = {(x, y) for x in range(w) for y in range(h) if rng.random() < 0.16}
    near = lambda x, y: sum((x + dx, y + dy) in mines for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy)

    # Open a few blobs of safe cells so the board looks played:
    # clear the mines around each starting point, then flood-fill from it.
    opened_cells = set()
    for _ in range(8):
        sx, sy = rng.randrange(2, w - 2), rng.randrange(2, h - 2)
        mines -= {(sx + dx, sy + dy) for dx in range(-2, 3) for dy in range(-2, 3)}
        stack = [(sx, sy)]
        while stack and len(opened_cells) < 520:
            x, y = stack.pop()
            if (x, y) in opened_cells or not (0 <= x < w and 0 <= y < h) or (x, y) in mines:
                continue
            opened_cells.add((x, y))
            if near(x, y) == 0:
                stack += [(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)]

    flag_colors = [c for c, _ in PLAYERS.values()]
    defs = [
        f'<symbol id="c" viewBox="0 0 16 16">{raised()}</symbol>',
        f'<symbol id="o" viewBox="0 0 16 16">{opened()}</symbol>',
    ]
    for n in range(1, 9):
        defs.append(f'<symbol id="n{n}" viewBox="0 0 16 16">{opened()}{pixels(DIGITS[n], 4, 3, NUMBER_COLORS[n])}</symbol>')
    for i, (color, dark) in enumerate(PLAYERS.values()):
        defs.append(
            f'<symbol id="f{i}" viewBox="0 0 16 16">{raised()}'
            f'<rect x="5" y="12" width="8" height="1.6" fill="{INK}"/><rect x="6.5" y="10.8" width="5" height="1.4" fill="{INK}"/>'
            f'<rect x="8.3" y="2.2" width="1.4" height="9" fill="{INK}"/>'
            f'<path d="M9.6 2.4 H15.2 L12.9 5.3 L15.2 8.2 H9.6 Z" fill="{color}" stroke="{dark}" stroke-width="0.5"/></symbol>'
        )

    uses = []
    for y in range(h):
        for x in range(w):
            if (x, y) in opened_cells:
                n = near(x, y)
                ref = f"n{n}" if n else "o"
            elif (x, y) in mines and any((x + dx, y + dy) in opened_cells for dx in (-1, 0, 1) for dy in (-1, 0, 1)) and rng.random() < 0.7:
                ref = f"f{rng.randrange(len(flag_colors))}"
            else:
                ref = "c"
            uses.append(f'<use href="#{ref}" x="{x * 16}" y="{y * 16}" width="16" height="16"/>')

    return svg(w * 16, h * 16, f'<defs>{"".join(defs)}</defs>{"".join(uses)}', crisp=True).replace(
        f'width="{w * 64}" height="{h * 64}"', f'width="{w * 16}" height="{h * 16}"'
    )


# ---------------------------------------------------------------- write everything

def main():
    OUT.mkdir(parents=True, exist_ok=True)

    save("closed.svg", svg(16, 16, raised(), crisp=True))
    save("type0.svg", svg(16, 16, opened(), crisp=True))
    for n in range(1, 9):
        save(f"type{n}.svg", number_tile(n))
    save("mine.svg", mine_tile())
    save("redMine.svg", mine_tile(red=True))

    for name, (color, dark) in PLAYERS.items():
        save(f"{name}Flag.svg", flag_tile(color, dark))
        save(f"{name}Cursor.svg", cursor(color, dark))

    for kind in ("unpressed", "pressed", "win", "lose"):
        save(f"face_{kind}.svg", face(kind))

    for n in range(10):
        save(f"d{n}.svg", counter_digit(n))
    save("nums_background.svg", counter_panel())

    save("pixelChevron.svg", chevron())
    save("bg.svg", background())
    print(f"Wrote graphics to {OUT}")


if __name__ == "__main__":
    main()
