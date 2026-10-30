import os
from decimal import Decimal
from typing import Dict, Set

# --- Feature Flags & General Configurations ---
GST_AGENT_ENABLED: bool = os.getenv("GST_AGENT_ENABLED", "True").lower() in ("true", "1", "yes")
DEFAULT_GST_TOLERANCE_INR: Decimal = Decimal(os.getenv("GST_TOLERANCE_INR", "0.05"))

# Standard statutory GST tax slabs in India
VALID_GST_RATES: Set[Decimal] = {
    Decimal("0.00"),
    Decimal("0.05"),
    Decimal("0.12"),
    Decimal("0.18"),
    Decimal("0.28")
}

# Statutory 2-digit Indian State and Union Territory Codes under GST Act
# Key: 2-digit string code, Value: (Name, is_union_territory_without_legislature)
STATE_CODE_MAPPING: Dict[str, Dict[str, object]] = {
    "01": {"name": "Jammu and Kashmir", "has_utgst": False},
    "02": {"name": "Himachal Pradesh", "has_utgst": False},
    "03": {"name": "Punjab", "has_utgst": False},
    "04": {"name": "Chandigarh", "has_utgst": True},  # UT without legislature -> UTGST applies
    "05": {"name": "Uttarakhand", "has_utgst": False},
    "06": {"name": "Haryana", "has_utgst": False},
    "07": {"name": "Delhi", "has_utgst": False},       # UT with legislature -> SGST applies
    "08": {"name": "Rajasthan", "has_utgst": False},
    "09": {"name": "Uttar Pradesh", "has_utgst": False},
    "10": {"name": "Bihar", "has_utgst": False},
    "11": {"name": "Sikkim", "has_utgst": False},
    "12": {"name": "Arunachal Pradesh", "has_utgst": False},
    "13": {"name": "Nagaland", "has_utgst": False},
    "14": {"name": "Manipur", "has_utgst": False},
    "15": {"name": "Mizoram", "has_utgst": False},
    "16": {"name": "Tripura", "has_utgst": False},
    "17": {"name": "Meghalaya", "has_utgst": False},
    "18": {"name": "Assam", "has_utgst": False},
    "19": {"name": "West Bengal", "has_utgst": False},
    "20": {"name": "Jharkhand", "has_utgst": False},
    "21": {"name": "Odisha", "has_utgst": False},
    "22": {"name": "Chhattisgarh", "has_utgst": False},
    "23": {"name": "Madhya Pradesh", "has_utgst": False},
    "24": {"name": "Gujarat", "has_utgst": False},
    "26": {"name": "Dadra and Nagar Haveli and Daman and Diu", "has_utgst": True},
    "27": {"name": "Maharashtra", "has_utgst": False},
    "28": {"name": "Andhra Pradesh (Old)", "has_utgst": False},
    "29": {"name": "Karnataka", "has_utgst": False},
    "30": {"name": "Goa", "has_utgst": False},
    "31": {"name": "Lakshadweep", "has_utgst": True},  # UT without legislature -> UTGST applies
    "32": {"name": "Kerala", "has_utgst": False},
    "33": {"name": "Tamil Nadu", "has_utgst": False},
    "34": {"name": "Puducherry", "has_utgst": False},  # UT with legislature -> SGST applies
    "35": {"name": "Andaman and Nicobar Islands", "has_utgst": True},
    "36": {"name": "Telangana", "has_utgst": False},
    "37": {"name": "Andhra Pradesh", "has_utgst": False},
    "38": {"name": "Ladakh", "has_utgst": True},       # UT without legislature -> UTGST applies
    "97": {"name": "Other Territory", "has_utgst": True},
}
