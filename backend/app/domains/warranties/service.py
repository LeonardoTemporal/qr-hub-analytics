from __future__ import annotations

from copy import deepcopy


def build_policy_snapshot(
    *,
    template_code: str,
    template_version: int,
    coverage: list[str],
    exclusions: list[str],
    care_instructions: list[str],
    workmanship_warranty_years: int | None,
    manufacturer_warranty_years: int | None,
) -> dict:
    return {
        "template_code": template_code,
        "template_version": template_version,
        "currency": "MXN",
        "coverage": deepcopy(coverage),
        "exclusions": deepcopy(exclusions),
        "care_instructions": deepcopy(care_instructions),
        "workmanship_warranty_years": workmanship_warranty_years,
        "manufacturer_warranty_years": manufacturer_warranty_years,
    }
