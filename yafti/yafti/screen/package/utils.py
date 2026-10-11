import json
from hashlib import sha256
from typing import Any


def generate_fingerprint(obj: Any) -> str:
    return sha256(json.dumps(obj, sort_keys=True).encode()).hexdigest()


def parse_packages(packages: dict | list) -> dict[str, bool]:
    output = {}

    if isinstance(packages, dict):
        for group, value in packages.items():
            output[f"group:{group}"] = True
            output.update(parse_packages(value.get("packages", [])))
        return output

    for pkgcfg in packages:
        for package in pkgcfg.values():
            if isinstance(package, dict):
                package = json.dumps(package, sort_keys=True)
            output[f"pkg:{package}"] = True
    return output
