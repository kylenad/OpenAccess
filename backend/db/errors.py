import re

def _extract_column(error_msg: str) -> str:
    match = re.search(r'column "([^"]+)"', error_msg)
    if match:
        return match.group(1)
    match = re.search(r"column '([^']+)'", error_msg)
    return match.group if match else "unknown"


def _translate_error(error: Exception) -> str | None:

