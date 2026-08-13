#!/usr/bin/env python3
"""
DORMANT APPARATUS — Plate I
Six instruments observed at rest.

Every form is ACCUMULATED, never outlined: mass emerges from hundreds of
individual marks laid at counted intervals. Palette held to four values;
the ember appears once, so its appearance registers as an event.
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, Polygon
from matplotlib.collections import LineCollection
from matplotlib.font_manager import FontProperties
from matplotlib.path import Path
import matplotlib.patches as mpatches

FONTS = "/root/.claude/skills/synced/canvas-design/canvas-fonts/"
F_DISPLAY = FontProperties(fname=FONTS + "InstrumentSerif-Regular.ttf")
F_ITALIC  = FontProperties(fname=FONTS + "InstrumentSerif-Italic.ttf")
F_MONO    = FontProperties(fname=FONTS + "GeistMono-Regular.ttf")
F_THIN    = FontProperties(fname=FONTS + "Jura-Light.ttf")

# ── PALETTE ────────────────────────────────────────────────────────────
PAPER = "#EFEAE0"   # warm bone, never white — this must read as paper
INK   = "#191815"   # warm near-black
GREY  = "#8C877D"   # attenuated
FAINT = "#C6BFB2"   # registration hairlines
EMBER = "#B4471E"   # reserved. appears once.

W, H = 10.0, 14.0
DPI  = 300

fig = plt.figure(figsize=(W, H), dpi=DPI)
fig.patch.set_facecolor(PAPER)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, W); ax.set_ylim(0, H)
ax.axis("off")
ax.set_aspect("equal")

rng = np.random.default_rng(1129)

# ── GROUND: paper tooth ────────────────────────────────────────────────
# Low-amplitude grain. Must be felt, not seen.
gh, gw = 1400, 1000
grain = rng.normal(0, 1, (gh, gw))
grain = (grain - grain.min()) / np.ptp(grain)
yy = np.linspace(-1, 1, gh)[:, None]
xx = np.linspace(-1, 1, gw)[None, :]
vign = 1.0 - 0.055 * (xx**2 + yy**2)          # barely-there falloff
tone = np.clip(0.972 + 0.028 * grain, 0, 1) * vign
rgb = np.array([0.937, 0.918, 0.878])
img = np.clip(tone[..., None] * rgb[None, None, :], 0, 1)
ax.imshow(img, extent=[0, W, 0, H], origin="upper", zorder=0,
          interpolation="bilinear")

# ── LAYOUT ─────────────────────────────────────────────────────────────
ML, MR = 0.85, 0.85
MT, MB = 0.90, 1.00
X0, X1 = ML, W - MR
Y0, Y1 = MB, H - MT

def hair(x0, y0, x1, y1, c=FAINT, lw=0.35, z=2, alpha=1.0):
    ax.plot([x0, x1], [y0, y1], color=c, lw=lw, zorder=z, alpha=alpha,
            solid_capstyle="butt")

# Plate frame — ruled, hairline.
hair(X0, Y0, X1, Y0, INK, 0.55, 3)
hair(X0, Y1, X1, Y1, INK, 0.55, 3)
hair(X0, Y0, X0, Y1, INK, 0.55, 3)
hair(X1, Y0, X1, Y1, INK, 0.55, 3)

# Corner registration ticks — evidence of measurement.
t = 0.13
for (cx, cy, sx, sy) in [(X0, Y0, 1, 1), (X1, Y0, -1, 1),
                         (X0, Y1, 1, -1), (X1, Y1, -1, -1)]:
    hair(cx + sx * 0.055, cy + sy * 0.055, cx + sx * (0.055 + t),
         cy + sy * 0.055, INK, 0.5, 4)
    hair(cx + sx * 0.055, cy + sy * 0.055, cx + sx * 0.055,
         cy + sy * (0.055 + t), INK, 0.5, 4)

# Edge graduation — fine ticks down both sides.
for i in range(1, 40):
    yv = Y0 + (Y1 - Y0) * i / 40
    ln = 0.075 if i % 5 == 0 else 0.042
    hair(X0, yv, X0 + ln, yv, FAINT, 0.32, 2)
    hair(X1 - ln, yv, X1, yv, FAINT, 0.32, 2)


# ══════════════════════════════════════════════════════════════════════
# SPECIMEN CONSTRUCTIONS
# Each is accumulated from counted marks. None is an outline.
# ══════════════════════════════════════════════════════════════════════

def seg(segs, colors, lws, z=6):
    ax.add_collection(LineCollection(segs, colors=colors, linewidths=lws,
                                     zorder=z, capstyle="butt"))

def I_armature(cx, cy, R):
    """Two systems reaching toward each other across a gap they never close."""
    segs, cols, lws = [], [], []
    N = 108
    # Outer system: spokes inward from the rim, stopping short.
    for i in range(N):
        a = 2 * np.pi * i / N
        r0, r1 = R * 0.985, R * 0.545
        segs.append([(cx + r0 * np.cos(a), cy + r0 * np.sin(a)),
                     (cx + r1 * np.cos(a), cy + r1 * np.sin(a))])
        cols.append(INK); lws.append(0.34 if i % 3 else 0.62)
    # Inner system: spokes outward from the core, interleaved, also stopping.
    for i in range(N):
        a = 2 * np.pi * (i + 0.5) / N
        r0, r1 = R * 0.155, R * 0.455
        segs.append([(cx + r0 * np.cos(a), cy + r0 * np.sin(a)),
                     (cx + r1 * np.cos(a), cy + r1 * np.sin(a))])
        cols.append(GREY); lws.append(0.34)
    # Concentric rulings, stepping by a constant increment.
    for k in range(26):
        r = R * (0.60 + 0.0155 * k)
        th = np.linspace(0, 2 * np.pi, 400)
        pts = np.column_stack([cx + r * np.cos(th), cy + r * np.sin(th)])
        segs += [[pts[j], pts[j + 1]] for j in range(0, len(pts) - 1, 2)]
        cols += [INK] * len(range(0, len(pts) - 1, 2))
        lws += [0.20] * len(range(0, len(pts) - 1, 2))
    seg(segs, cols, lws)
    ax.add_patch(Circle((cx, cy), R * 0.145, fc=PAPER, ec=INK, lw=0.55, zorder=7))
    ax.add_patch(Circle((cx, cy), R * 0.048, fc=INK, ec="none", zorder=8))


def II_chroma(cx, cy, R):
    """Value travels the whole span; between neighbours the step is invisible."""
    segs, cols, lws = [], [], []
    RINGS = 44
    ink = np.array([0.082, 0.078, 0.068])
    pal = np.array([0.706, 0.682, 0.635])
    for k in range(RINGS):
        f = k / (RINGS - 1)
        r = R * (0.205 + 0.785 * f)
        # The span is carried across the whole form, never ring to ring.
        c = ink * (1 - f) + pal * f
        n = int(58 + 160 * f)
        off = 0.5 * (k % 2)
        # Dash occupancy opens as it travels out — density does the shading.
        occ = 0.46 - 0.19 * f
        for i in range(n):
            a = 2 * np.pi * (i + off) / n
            da = (2 * np.pi / n) * occ
            segs.append([(cx + r * np.cos(a - da), cy + r * np.sin(a - da)),
                         (cx + r * np.cos(a + da), cy + r * np.sin(a + da))])
            cols.append(tuple(c)); lws.append(0.60 - 0.28 * f)
    seg(segs, cols, lws)
    # A single meridian holds the wheel still.
    hair(cx, cy - R * 1.02, cx, cy + R * 1.02, INK, 0.4, 7)
    ax.add_patch(Circle((cx, cy), R * 0.145, fc=PAPER, ec=INK, lw=0.5, zorder=7))


def III_recursion(cx, cy, R, depth=4, rot=0.0, lw=0.70):
    """A form that contains its own kind, each generation turned by half a face.

    Each generation's bundle occupies ONLY the annulus its child does not:
    letting them overlap turned the figure into a tangle, and a tangle is not
    the same thing as density. Concentric bands, cleanly nested."""
    N = 6
    inr = np.cos(np.pi / N)                    # apothem / circumradius
    # The child sits well inside the apothem, not just under it: at 0.985·inr
    # each band was too thin to be a band, and the bundle read as stubble
    # around the rim rather than as a ruled annulus.
    Rc = R * 0.715
    ang = np.array([2 * np.pi * i / N + rot for i in range(N)])
    pts = np.column_stack([cx + R * np.cos(ang), cy + R * np.sin(ang)])
    ax.add_patch(Polygon(pts, closed=True, fill=False, ec=INK, lw=lw,
                         zorder=7, joinstyle="miter"))

    # Bundle from the child's rim out to this generation's own edge.
    segs, cols, lws = [], [], []
    n = {4: 138, 3: 102, 2: 72, 1: 48}[depth]
    for i in range(n):
        a = 2 * np.pi * i / n + rot
        r1 = R * 0.992 * (inr / np.cos(((a - rot) % (2 * np.pi / N)) - np.pi / N))
        segs.append([(cx + Rc * 1.005 * np.cos(a), cy + Rc * 1.005 * np.sin(a)),
                     (cx + r1 * np.cos(a), cy + r1 * np.sin(a))])
        cols.append(INK if i % 2 else GREY)
        lws.append(0.42 if i % 4 == 0 else 0.24)
    seg(segs, cols, lws)

    if depth == 1:
        # The last generation resolves, it does not stop.
        for k in range(9):
            rr = Rc * (0.94 - 0.104 * k)
            hp = np.column_stack([cx + rr * np.cos(ang), cy + rr * np.sin(ang)])
            hp = np.vstack([hp, hp[:1]])
            ax.add_patch(Polygon(hp[:-1], closed=True, fill=False,
                                 ec=INK if k % 2 else GREY, lw=0.30, zorder=8))
        ax.add_patch(Circle((cx, cy), Rc * 0.115, fc=INK, ec="none", zorder=9))
        return
    III_recursion(cx, cy, Rc, depth - 1, rot + np.pi / N, lw * 0.90)


def IV_module(cx, cy, R):
    """One module, repeated at counted intervals until it becomes a body.

    Tone is assigned by RING, never by (ring+index): the second reads as
    speckle, and speckle is the look of a pattern that was generated rather
    than counted."""
    segs, cols, lws = [], [], []
    RINGS = 17
    for k in range(RINGS):
        f = k / (RINGS - 1)
        r = R * (0.170 + 0.815 * f)
        n = 6 * (k + 2)
        s = R * 0.0255 * (1 + 0.22 * (1 - f))
        col = INK if k % 3 else GREY          # by ring. counted, not scattered.
        for i in range(n):
            a = 2 * np.pi * i / n + (np.pi / n) * (k % 2)
            px, py = cx + r * np.cos(a), cy + r * np.sin(a)
            ca, sa = np.cos(a), np.sin(a)
            # Lozenge module, oriented radially — identical everywhere.
            q = [(0, s), (s * 0.70, 0), (0, -s), (-s * 0.70, 0)]
            v = [(px + qx * ca - qy * sa, py + qx * sa + qy * ca) for qx, qy in q]
            ax.add_patch(Polygon(v, closed=True, fc=col, ec="none", zorder=6))
        th = np.linspace(0, 2 * np.pi, 300)
        pts = np.column_stack([cx + r * np.cos(th), cy + r * np.sin(th)])
        st = 4
        segs += [[pts[j], pts[j + 1]] for j in range(0, len(pts) - 1, st)]
        m = len(range(0, len(pts) - 1, st))
        cols += [FAINT] * m; lws += [0.16] * m
    seg(segs, cols, lws, z=5)
    ax.add_patch(Circle((cx, cy), R * 0.088, fc=PAPER, ec=INK, lw=0.5, zorder=8))


def V_speculum(cx, cy, R):
    """Perfectly bilateral: the form and its own reflection, with an aperture.

    No ember here. The ember is spent once, on VI — a second appearance
    would cost it the status of an event."""
    segs, cols, lws = [], [], []
    N = 168                                   # finer rule, lighter body
    for i in range(N):
        f = i / (N - 1)
        y = cy + R * (2 * f - 1) * 0.988
        half = np.sqrt(max(R * R - (y - cy) ** 2, 0))
        # Aperture: a narrow ellipse of void held on the axis.
        av = abs(y - cy) / (R * 0.375)
        inner = R * 0.235 * np.sqrt(max(1 - av * av, 0)) if av < 1 else 0.0
        d = abs(2 * f - 1)
        for s in (-1, 1):
            x_out, x_in = cx + s * half, cx + s * inner
            if half - inner < 1e-4:
                continue
            segs.append([(x_in, y), (x_out, y)])
            cols.append(INK if i % 3 else GREY)
            lws.append(0.42 - 0.24 * d)
    seg(segs, cols, lws)
    # The axis of reflection, and the rim that closes it.
    hair(cx, cy - R * 1.04, cx, cy + R * 1.04, INK, 0.42, 8)
    th = np.linspace(0, 2 * np.pi, 700)
    ax.plot(cx + R * np.cos(th), cy + R * np.sin(th), color=INK, lw=0.55, zorder=7)


def VI_aurora(cx, cy, R):
    """The single warm figure. Light arriving over a ruled horizon."""
    segs, cols, lws = [], [], []
    hz = cy - R * 0.30                      # horizon
    # Fan: rays from a source on the horizon, thinning as they rise.
    NR = 96
    for i in range(NR):
        a = np.pi * (i + 0.5) / NR
        f = np.sin(a)
        L = R * (0.28 + 0.70 * f)
        x1, y1 = cx + L * np.cos(a), hz + L * np.sin(a)
        if (x1 - cx) ** 2 + (y1 - cy) ** 2 > (R * 0.985) ** 2:
            k = R * 0.985 / np.hypot(x1 - cx, y1 - cy)
            x1, y1 = cx + (x1 - cx) * k, cy + (y1 - cy) * k
        segs.append([(cx, hz), (x1, y1)])
        cols.append(EMBER if i % 3 == 0 else INK)
        lws.append(0.44 - 0.20 * f)
    # Arcs stepping above the horizon at a constant increment.
    for k in range(20):
        r = R * (0.16 + 0.0435 * k)
        th = np.linspace(0, np.pi, 300)
        px, py = cx + r * np.cos(th), hz + r * np.sin(th)
        keep = (px - cx) ** 2 + (py - cy) ** 2 <= (R * 0.985) ** 2
        pts = np.column_stack([px, py])[keep]
        st = 2 if k % 2 == 0 else 3
        segs += [[pts[j], pts[j + 1]] for j in range(0, len(pts) - 1, st)]
        n = len(range(0, len(pts) - 1, st))
        cols += [EMBER if k % 5 == 0 else GREY] * n
        lws += [0.24] * n
    seg(segs, cols, lws)
    # Below the horizon: ruled, unlit. Hatching rather than scatter — random
    # stipple reads as noise, and noise is not the same thing as darkness.
    hsegs, hcols, hlws = [], [], []
    NH = 74
    for i in range(NH):
        f = (i + 0.5) / NH
        y = hz - (hz - (cy - R * 0.988)) * f
        half = np.sqrt(max(R * R - (y - cy) ** 2, 0)) * 0.995
        if half < 1e-3:
            continue
        hsegs.append([(cx - half, y), (cx + half, y)])
        hcols.append(INK if i % 4 else GREY)
        # Thickens with depth, but stops short of closing: past ~0.44 the
        # rules merge and the ground becomes a solid block instead of hatching.
        hlws.append(0.18 + 0.26 * f)
    seg(hsegs, hcols, hlws)
    hair(cx - R * 0.995, hz, cx + R * 0.995, hz, INK, 0.75, 8)
    th = np.linspace(0, 2 * np.pi, 700)
    ax.plot(cx + R * np.cos(th), cy + R * np.sin(th), color=INK, lw=0.55, zorder=7)


# ── SPECIMEN FIELD ─────────────────────────────────────────────────────
# Row centres set EXPLICITLY, not derived from a fraction: the derived
# version left the last caption 2mm from the footer rule. Every clearance
# below is asserted at the end of this file before the plate is written.
RAD     = 0.98
RING_F  = 1.135                      # registration ring / specimen radius
CAP_TOP = 1.40                       # caption origin, below centre
# Caption reads DOWNWARD: rule, numeral, name, note. Offsets from the origin,
# so the order can never invert by editing one number.
CAP_RULE, CAP_NUM, CAP_NAME, CAP_NOTE = +0.150, -0.020, -0.235, -0.418
CAP_BOT = RAD * CAP_TOP - CAP_NOTE + 0.055   # lowest ink, below centre

FIRST_RING_TOP = 11.46
LAST_NOTE_Y    = 1.86
_span   = (FIRST_RING_TOP - RAD * RING_F) - (LAST_NOTE_Y + CAP_BOT)
ROW_P   = _span / 2.0                # pitch between row centres
CY      = [FIRST_RING_TOP - RAD * RING_F - i * ROW_P for i in range(3)]
COL_X   = [X0 + (X1 - X0) * 0.25, X0 + (X1 - X0) * 0.75]

SPECS = [
    ("I",   "ARMATURE",  "reaches, does not close",  I_armature),
    ("II",  "CHROMA",    "one span, no steps",       II_chroma),
    ("III", "RECURSION", "contains its own kind",    III_recursion),
    ("IV",  "MODULE",    "one mark, counted",        IV_module),
    ("V",   "SPECULUM",  "an aperture, mirrored",    V_speculum),
    ("VI",  "AURORA",    "held before arrival",      VI_aurora),
]

for idx, (num, name, note, fn) in enumerate(SPECS):
    cx, cy = COL_X[idx % 2], CY[idx // 2]

    # Registration ring + cardinal ticks — the vitrine, not the specimen.
    th = np.linspace(0, 2 * np.pi, 500)
    ax.plot(cx + RAD * RING_F * np.cos(th), cy + RAD * RING_F * np.sin(th),
            color=FAINT, lw=0.32, zorder=2)
    for a in (0, np.pi / 2, np.pi, 3 * np.pi / 2):
        hair(cx + RAD * 1.088 * np.cos(a), cy + RAD * 1.088 * np.sin(a),
             cx + RAD * 1.185 * np.cos(a), cy + RAD * 1.185 * np.sin(a),
             GREY, 0.42, 3)

    fn(cx, cy, RAD)

    # Caption block — a curator's pencil, under the glass. Reads downward.
    ly = cy - RAD * CAP_TOP
    hair(cx - 0.285, ly + CAP_RULE, cx + 0.285, ly + CAP_RULE, INK, 0.45, 5)
    ax.text(cx, ly + CAP_NUM, num, ha="center", va="center",
            fontproperties=F_DISPLAY, fontsize=12.5, color=INK, zorder=6)
    ax.text(cx, ly + CAP_NAME, "  ".join(name), ha="center", va="center",
            fontproperties=F_MONO, fontsize=4.9, color=INK, zorder=6)
    ax.text(cx, ly + CAP_NOTE, note, ha="center", va="center",
            fontproperties=F_ITALIC, fontsize=7.4, color=GREY, zorder=6)


# ── HEADER ─────────────────────────────────────────────────────────────
# Marginalia is INSET from the rule, never hung on it: type touching a frame
# reads as a trimming error, and one such edge undoes the whole plate.
PAD = 0.115
ax.text(X0 + PAD, Y1 - 0.30, "P L .   I", ha="left", va="center",
        fontproperties=F_MONO, fontsize=5.2, color=GREY, zorder=6)
ax.text(X1 - PAD, Y1 - 0.30, "F I G .  I — V I", ha="right", va="center",
        fontproperties=F_MONO, fontsize=5.2, color=GREY, zorder=6)

ax.text(W / 2, Y1 - 0.72, "DORMANT APPARATUS", ha="center", va="center",
        fontproperties=F_DISPLAY, fontsize=35.5, color=INK, zorder=6)

# Rule beneath the title, graduated at the centre.
ry = Y1 - 1.055
hair(X0 + 1.05, ry, X1 - 1.05, ry, INK, 0.45, 5)
for i in range(-6, 7):
    xv = W / 2 + i * 0.155
    hair(xv, ry, xv, ry + (0.058 if i % 3 == 0 else 0.034), INK, 0.4, 5)

ax.text(W / 2, Y1 - 1.30, "A T L A S   O F   L A T E N T   F O R M",
        ha="center", va="center", fontproperties=F_THIN, fontsize=7.0,
        color=GREY, zorder=6)


# ── FOOTER ─────────────────────────────────────────────────────────────
fy = Y0 + 0.34
hair(X0, fy + 0.235, X1, fy + 0.235, FAINT, 0.35, 5)

ax.text(X0 + PAD, fy, "C R  ·  M M X X V I", ha="left", va="center",
        fontproperties=F_MONO, fontsize=5.0, color=GREY, zorder=6)

ax.text(W / 2, fy + 0.005, "each complete before it is asked",
        ha="center", va="center", fontproperties=F_ITALIC,
        fontsize=10.5, color=INK, zorder=6)

# Scale bar — the last piece of evidence that this was measured. Inset to the
# same margin as the marginalia opposite, so the footer reads as one line.
sb_w = 0.62
sb_x1 = X1 - PAD
sb_x0 = sb_x1 - sb_w
hair(sb_x0, fy - 0.052, sb_x1, fy - 0.052, INK, 0.5, 5)
for i in range(5):
    xv = sb_x0 + sb_w * i / 4
    hair(xv, fy - 0.052, xv, fy + 0.005, INK, 0.45, 5)
ax.text(sb_x1, fy + 0.098, "ø  1", ha="right", va="center",
        fontproperties=F_MONO, fontsize=4.6, color=GREY, zorder=6)

# ── CONTAINMENT ────────────────────────────────────────────────────────
# Asserted, not eyeballed. Nothing crowds a margin; nothing overlaps.
_MIN = 0.20
_checks = [
    ("ring I/II  ← subtitle rule",  (Y1 - 1.30) - 0.09 - (CY[0] + RAD * RING_F)),
    ("ring III/IV ← caption I/II",  (CY[0] - CAP_BOT) - 0.05 - (CY[1] + RAD * RING_F)),
    ("ring V/VI  ← caption III/IV", (CY[1] - CAP_BOT) - 0.05 - (CY[2] + RAD * RING_F)),
    ("footer rule ← caption V/VI",  (CY[2] - CAP_BOT) - 0.05 - (fy + 0.235)),
    ("plate rule  ← footer text",   (fy - 0.052) - Y0),
    ("column gutter",               (COL_X[1] - RAD * RING_F) - (COL_X[0] + RAD * RING_F)),
    ("side margin ← ring",          (COL_X[0] - RAD * RING_F) - X0),
]
# The caption rule must clear the registration ring, or the two read as one
# smudged edge. Held to a tighter minimum than the block clearances above.
_rule_gap = (RAD * CAP_TOP - CAP_RULE) - RAD * RING_F
print(f"    {'ok ' if _rule_gap >= 0.08 else 'TIGHT'} "
      f"{'caption rule ← ring':<30} {_rule_gap:+.3f}")
if _rule_gap < 0.08:
    raise SystemExit("containment failure — caption rule crowds the ring")
print("  clearance (in)")
_bad = False
for label, v in _checks:
    flag = "ok " if v >= _MIN else "TIGHT"
    if v < _MIN:
        _bad = True
    print(f"    {flag} {label:<30} {v:+.3f}")
if _bad:
    raise SystemExit("containment failure — plate not written")

OUT = "/home/user/Apresenta-o-Mensal-Megas-2026/design/"
fig.savefig(OUT + "dormant-apparatus-plate-I.pdf", facecolor=PAPER,
            edgecolor="none", format="pdf")
fig.savefig(OUT + "dormant-apparatus-plate-I.png", facecolor=PAPER,
            edgecolor="none", dpi=DPI)
print("saved")
