from __future__ import annotations

BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"


def _is_valid_coordinate(latitude: float | None, longitude: float | None) -> bool:
    if latitude is None or longitude is None:
        return False
    return -90 <= latitude <= 90 and -180 <= longitude <= 180


def encode_geohash(latitude: float, longitude: float, precision: int = 7) -> str:
    lat_interval = [-90.0, 90.0]
    lng_interval = [-180.0, 180.0]
    geohash: list[str] = []
    bit = 0
    ch = 0
    even = True
    bits = [16, 8, 4, 2, 1]

    while len(geohash) < precision:
        if even:
            mid = (lng_interval[0] + lng_interval[1]) / 2
            if longitude >= mid:
                ch |= bits[bit]
                lng_interval[0] = mid
            else:
                lng_interval[1] = mid
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2
            if latitude >= mid:
                ch |= bits[bit]
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid

        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(BASE32[ch])
            bit = 0
            ch = 0

    return "".join(geohash)


def compute_scan_geohashes(
    latitude: float | None,
    longitude: float | None,
) -> tuple[str | None, str | None]:
    if not _is_valid_coordinate(latitude, longitude):
        return None, None
    geo_hash_7 = encode_geohash(float(latitude), float(longitude), precision=7)
    return geo_hash_7[:5], geo_hash_7
