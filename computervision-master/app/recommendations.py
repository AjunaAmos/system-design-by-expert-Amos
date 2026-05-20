from __future__ import annotations

from .labels import LABEL_ALIASES

DISEASE_GUIDANCE: dict[str, list[str]] = {
    "Coffee Leaf Rust": [
        "Remove heavily infected leaves and dispose of them away from the field.",
        "Prune to improve airflow and reduce humidity around the canopy.",
        "Prioritize resistant varieties and balanced nutrition where possible.",
        "Consult a local agronomist for region-appropriate fungicide timing if outbreaks are severe.",
    ],
    "Cercospora Leaf Spot": [
        "Reduce water stress and keep nutrition balanced to limit susceptibility.",
        "Manage shade to avoid long periods of leaf wetness.",
        "Remove infected leaves and fallen debris to slow spread.",
    ],
    "Phoma Leaf Spot": [
        "Avoid overhead irrigation and reduce canopy humidity.",
        "Remove infected tissue and sanitize tools between plants.",
        "Monitor cool, shaded sections where symptoms intensify.",
    ],
    "Coffee Berry Disease": [
        "Remove infected berries and mummified fruit from trees and soil.",
        "Harvest regularly to reduce the time berries stay exposed.",
        "Handle berries carefully and sanitize tools to avoid new wounds.",
    ],
    "Healthy": [
        "No obvious disease detected. Continue routine monitoring.",
        "Maintain pruning, nutrition, and sanitation practices.",
        "Capture a new image if symptoms appear later.",
    ],
}

GENERAL_GUIDANCE = [
    "Improve airflow with pruning and spacing; avoid overhead irrigation.",
    "Use locally recommended disease control measures after consulting an agronomist.",
    "Log observations and re-check the same plant in 7 to 10 days.",
]


def _canonical_label(label: str) -> str:
    normalized = label.strip().lower()
    return LABEL_ALIASES.get(normalized, label)


def build_recommendations(
    *,
    sample_type: str,
    top_label: str,
    confidence: float,
) -> list[str]:
    recommendations: list[str] = []

    if confidence < 0.45:
        recommendations.append(
            "Capture a closer, well-lit image focused on the affected area."
        )

    canonical_label = _canonical_label(top_label) if top_label else ""
    is_healthy = canonical_label == "Healthy"

    if not is_healthy:
        normalized_sample = sample_type.lower()
        if normalized_sample == "leaf":
            recommendations.append(
                "Remove heavily affected leaves and avoid touching healthy foliage."
            )
        elif normalized_sample == "berry":
            recommendations.append(
                "Remove damaged berries and sanitize tools between plants."
            )
        else:
            recommendations.append(
                "Isolate the sample and avoid spreading symptoms between plants."
            )
    if canonical_label in DISEASE_GUIDANCE:
        recommendations.extend(DISEASE_GUIDANCE[canonical_label])
    elif canonical_label:
        recommendations.append(
            f'Review guidance for "{canonical_label}" with a local agronomist.'
        )

    recommendations.extend(GENERAL_GUIDANCE)

    if canonical_label and canonical_label != "Healthy":
        recommendations.append(
            f'Watch for recurring signs related to "{canonical_label}" in nearby plants.'
        )

    return recommendations
