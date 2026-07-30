from __future__ import annotations

import argparse
from pathlib import Path
from urllib.parse import urlparse

import qrcode
import qrcode.image.svg

DEFAULT_TARGET_URL = "https://7fitment.com/t/qr_general"
DEFAULT_OUTPUT_NAME = "7fitment-qr-general"


def validate_target_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("The QR target must be an absolute HTTPS URL")
    return value


def generate_campaign_qr(
    target_url: str,
    output_dir: Path,
    output_name: str = DEFAULT_OUTPUT_NAME,
) -> tuple[Path, Path]:
    target_url = validate_target_url(target_url)
    output_dir.mkdir(parents=True, exist_ok=True)

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=16,
        border=4,
    )
    qr.add_data(target_url)
    qr.make(fit=True)

    png_path = output_dir / f"{output_name}.png"
    svg_path = output_dir / f"{output_name}.svg"

    png = qr.make_image(fill_color="black", back_color="white")
    png.save(png_path, optimize=True)

    svg = qr.make_image(
        image_factory=qrcode.image.svg.SvgPathFillImage,
        fill_color="#000000",
        back_color="#ffffff",
    )
    svg.save(svg_path)
    return png_path, svg_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate print-safe QR assets for a tracked 7Fitment campaign."
    )
    parser.add_argument("--url", default=DEFAULT_TARGET_URL)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[2]
        / "frontend"
        / "public"
        / "assets"
        / "qr",
    )
    parser.add_argument("--name", default=DEFAULT_OUTPUT_NAME)
    args = parser.parse_args()

    png_path, svg_path = generate_campaign_qr(args.url, args.output_dir, args.name)
    print(f"QR target: {args.url}")
    print(f"PNG: {png_path}")
    print(f"SVG: {svg_path}")


if __name__ == "__main__":
    main()
