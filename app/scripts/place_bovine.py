#!/usr/bin/env python3
"""
Pulisce i comuni e assegna a ogni bovina coordinate reali (lat/lng) nella zona
corretta della Valle d'Aosta, con jitter deterministico per spargere le bovine
attorno al comune (lungo pascoli/sentieri). Riscrive app/src/data/vatsadex.json.
"""
import json
import os
import hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "data", "vatsadex.json")

# Coordinate (lat, lng) dei comuni / zone della Valle d'Aosta
COMUNI = {
    "Aosta": (45.7373, 7.3206),
    "Gressan": (45.7100, 7.2870),
    "Nus": (45.7176, 7.4530),
    "Donnas": (45.6030, 7.7700),
    "Brissogne": (45.7240, 7.4030),
    "Pollein": (45.7270, 7.3640),
    "Pré-Saint-Didier": (45.7650, 6.9840),
    "Verrès": (45.6660, 7.6920),
    "Saint-Christophe": (45.7470, 7.3560),
    "Quart": (45.7370, 7.3880),
    "Perloz": (45.6030, 7.7900),
    "Verrayes": (45.7560, 7.5260),
    "Cogne": (45.6080, 7.3550),
    "Morgex": (45.7590, 7.0380),
    "Jovençan": (45.7080, 7.2760),
    "Antey-Saint-André": (45.8060, 7.5910),
    "Challand-Saint-Anselme": (45.6840, 7.7160),
    "Valpelline": (45.8170, 7.3270),
    "Pontey": (45.7340, 7.5520),
    "Aymavilles": (45.7030, 7.2470),
    "Châtillon": (45.7490, 7.6070),
    "Valtournenche": (45.8780, 7.6280),
    "Fontainemore": (45.6490, 7.8500),
    "Pont-Saint-Martin": (45.5990, 7.7940),
    "Arvier": (45.6840, 7.1680),
    "Saint-Vincent": (45.7510, 7.6480),
    "Saint-Marcel": (45.7350, 7.4490),
    "Pontboset": (45.6090, 7.6960),
    "Champdepraz": (45.6900, 7.6500),
}

# Normalizzazione delle voci sporche -> (comune pulito, coord)
ALIAS = {
    "": None,  # gestito a parte
    "Aoste": "Aosta",
    "Valle d'Aosta": "Aosta",
    "Valle d’Aosta": "Aosta",
    "Mont Emilius": ("Charvensod (Mont Emilius)", (45.6950, 7.3700)),
    "Grand Combin": ("Valpelline (Grand Combin)", (45.8300, 7.3100)),
    "Evançon": ("Brusson (Evançon)", (45.7600, 7.7300)),
    "Pont": "Pont-Saint-Martin",
    "Saint": "Saint-Vincent",
    "Challand": "Challand-Saint-Anselme",
    "Challand-St-Anselme": "Challand-Saint-Anselme",
}

# Alpeggi reali per le bovine senza comune (zone di alta quota = pascolo)
ALPEGGI = [
    ("Alpeggi di Cogne", (45.5900, 7.3300)),
    ("Alpeggi di Valtournenche", (45.8900, 7.6500)),
    ("Alpeggi di Valpelline", (45.8400, 7.3100)),
    ("Alpeggi di Ollomont", (45.8800, 7.3150)),
    ("Alpeggi di Rhêmes", (45.6200, 7.1500)),
    ("Alpeggi di Gressoney", (45.7700, 7.8300)),
]

VDA_BOUNDS = (45.46, 45.99, 6.80, 7.95)  # latmin, latmax, lngmin, lngmax


def hjitter(seed: str, scale_lat=0.014, scale_lng=0.018):
    """Offset deterministico (in gradi) a partire da una stringa."""
    h = hashlib.md5(seed.encode()).digest()
    fx = (h[0] / 255.0) * 2 - 1  # -1..1
    fy = (h[1] / 255.0) * 2 - 1
    return fx * scale_lat, fy * scale_lng


def resolve(comune: str, bid: str):
    c = (comune or "").strip()
    if c in ALIAS:
        a = ALIAS[c]
        if a is None:
            # senza comune -> alpeggio deterministico
            idx = int(hashlib.md5(bid.encode()).hexdigest(), 16) % len(ALPEGGI)
            nome, base = ALPEGGI[idx]
            return nome, base, "alpeggio"
        if isinstance(a, tuple):
            nome, base = a
            return nome, base, "zona"
        c = a  # alias semplice -> nome comune
    if c in COMUNI:
        return c, COMUNI[c], "comune"
    # comune non in tabella: fallback su alpeggio, ma conserva il nome
    idx = int(hashlib.md5((bid + c).encode()).hexdigest(), 16) % len(ALPEGGI)
    _, base = ALPEGGI[idx]
    return c, base, "zona"


def main():
    d = json.load(open(SRC, encoding="utf-8"))
    out_of_bounds = 0
    zone = {}
    for b in d["bovine"]:
        nome_zona, (blat, blng), kind = resolve(b.get("comune", ""), b["id"])
        dlat, dlng = hjitter(b["id"])
        lat = round(blat + dlat, 5)
        lng = round(blng + dlng, 5)
        latmin, latmax, lngmin, lngmax = VDA_BOUNDS
        if not (latmin <= lat <= latmax and lngmin <= lng <= lngmax):
            out_of_bounds += 1
        b["comune"] = nome_zona
        b["zona_tipo"] = kind
        b["lat"] = lat
        b["lng"] = lng
        zone[nome_zona] = zone.get(nome_zona, 0) + 1

    d["meta"]["geocoding"] = (
        "Coordinate assegnate per comune VdA + jitter deterministico (demo). "
        "Bovine senza comune piazzate negli alpeggi di alta quota."
    )
    json.dump(d, open(SRC, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"OK: {len(d['bovine'])} bovine geocodate")
    print(f"fuori dai confini VdA: {out_of_bounds}")
    print("distribuzione per zona:")
    for z, n in sorted(zone.items(), key=lambda x: -x[1]):
        print(f"  {n:2d}  {z}")


if __name__ == "__main__":
    main()
