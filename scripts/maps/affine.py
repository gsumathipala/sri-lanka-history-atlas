"""Affine-georeference a scanned map from control points and warp it to a north-up
equirectangular image suitable for a Leaflet ImageOverlay.
usage: affine.py in.jpg pts.json out.jpg  -> prints bounds JSON and residuals"""
import json, math, sys
from PIL import Image
src, ptsf, out = sys.argv[1:4]
pts = json.load(open(ptsf))
def solve(A, b):  # least squares via normal equations (3 unknowns)
    n = len(A[0]); M = [[sum(r[i] * r[j] for r in A) for j in range(n)] for i in range(n)]; v = [sum(r[i] * bb for r, bb in zip(A, b)) for i in range(n)]
    for i in range(n):  # gaussian elimination
        p = max(range(i, n), key=lambda k: abs(M[k][i])); M[i], M[p] = M[p], M[i]; v[i], v[p] = v[p], v[i]
        for k in range(i + 1, n):
            f = M[k][i] / M[i][i]; M[k] = [a - f * c for a, c in zip(M[k], M[i])]; v[k] -= f * v[i]
    x = [0] * n
    for i in reversed(range(n)): x[i] = (v[i] - sum(M[i][j] * x[j] for j in range(i + 1, n))) / M[i][i]
    return x
# pixel = f(lng, lat)
A = [[1, p[1], p[0]] for p in pts]
ax = solve(A, [p[2] for p in pts]); ay = solve(A, [p[3] for p in pts])
res = []
for lat, lng, x, y, nm in pts:
    px = ax[0] + ax[1] * lng + ax[2] * lat; py = ay[0] + ay[1] * lng + ay[2] * lat
    # convert pixel error to km using local scale
    kmx = (px - x); kmy = (py - y)
    s = 111 / math.hypot(ax[1], ay[1])  # km per pixel along lng (approx)
    res.append((nm, round(math.hypot(kmx, kmy) * s * math.cos(math.radians(lat)), 1)))
im = Image.open(src).convert('RGBA'); W, H = im.size
# output grid: choose bounds covering the image corners
inv = lambda x, y: None
corners = []
det = ax[1] * ay[2] - ax[2] * ay[1]
for x, y in [(0, 0), (W, 0), (0, H), (W, H)]:
    dx, dy = x - ax[0], y - ay[0]
    lng = (dx * ay[2] - dy * ax[2]) / det; lat = (ax[1] * dy - ay[1] * dx) / det
    corners.append((lat, lng))
S, N = min(c[0] for c in corners), max(c[0] for c in corners); Wl, E = min(c[1] for c in corners), max(c[1] for c in corners)
OW = 1400; OH = int(OW * (N - S) / ((E - Wl) * math.cos(math.radians((N + S) / 2))))
# output pixel (u,v) -> lng,lat -> source pixel: x = ax0 + ax1*lng + ax2*lat
k1 = (E - Wl) / OW; k2 = -(N - S) / OH
coeffs = (ax[1] * k1, ax[2] * k2, ax[0] + ax[1] * Wl + ax[2] * N, ay[1] * k1, ay[2] * k2, ay[0] + ay[1] * Wl + ay[2] * N)
warped = im.transform((OW, OH), Image.AFFINE, coeffs, resample=Image.BICUBIC, fillcolor=(0, 0, 0, 0))
# make out-of-map area transparent-ish by saving as JPEG with black fill (overlay uses opacity); also write PNG mask? keep JPEG.
warped.save(out, quality=80)
print(json.dumps({'bounds': [[round(S, 4), round(Wl, 4)], [round(N, 4), round(E, 4)]], 'rms_km': round(math.sqrt(sum(r * r for _, r in res) / len(res)), 1), 'residual_km': res}))
