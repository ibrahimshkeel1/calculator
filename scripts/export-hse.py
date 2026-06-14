#!/usr/bin/env python3
"""Export HSE statistics from Sheet 1 (UA/UC) and Sheet 2 (Good Obs) only."""
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from numbers_parser import Document

ROOT = Path(__file__).resolve().parent.parent
NUMBERS_FILE = ROOT / "sheet eni.numbers"
OUTPUT = ROOT / "hse-data.json"

HAZARD_THEMES = {
    "PPE Non-Compliance": [r"\bppe\b", r"safety glass", r"helmet", r"glove", r"safety shoe", r"not wearing", r"bare feet"],
    "Work at Height / Line of Fire": [r"height", r"scaffold", r"ladder", r"overhead", r"line of fire", r"barricad"],
    "Slip, Trip & Fall": [r"slip", r"trip", r"housekeeping", r"obstruct", r"hose.*way", r"spill", r"slippery"],
    "Driving / Road Safety": [r"vehicle", r"trailer", r"road", r"driving", r"speed", r"traffic"],
    "Process Safety / Isolation": [r"isolation", r"do not operate", r"valve", r"blinding", r"amine", r"compressor", r"pressure"],
    "Fire & Explosion": [r"fire", r"extinguisher", r"flammab", r"propane", r"fuel"],
    "Electrical / Energized": [r"electric", r"cable", r"energized", r"lockout", r"panel"],
    "Environmental / Spill": [r"spill", r"leak", r"drain", r"environment", r"waste"],
    "Emergency Preparedness": [r"emergency", r"wind sock", r"drill", r"alarm"],
}

AREA_GROUPS = {
    "Camp & Living Areas": ["Camp-", "Mess", "Kitchen", "Gym"],
    "Plant & Processing": ["Amine", "Compressor", "PV Plant", "Export", "Train", "STP", "Utilities", "Cooler"],
    "Wellheads / Production": ["Bhit-", "Badhra", "Wellhead", "Separator"],
    "Workshops & Yard": ["Workshop", "Yard", "Drilling", "Warehouse", "Parking"],
    "Roads & Transport": ["Road", "Gate", "Main Gate"],
}


def parse_register(doc, sheet_name):
    rows = list(doc.sheets[sheet_name].tables[0].iter_rows())
    header_idx = next(i for i, row in enumerate(rows[:5]) if any("Sr.No" in str(c.value or "") for c in row))
    headers = [str(c.value).strip().replace("\n", " ") if c.value else f"col_{i}" for i, c in enumerate(rows[header_idx])]
    data = []
    for row in rows[header_idx + 1:]:
        vals = [c.value for c in row]
        if not vals or vals[0] in (None, ""):
            continue
        data.append({headers[i]: vals[i] if i < len(headers) else None for i in range(len(headers))})
    return data


def nk(d, *keys):
    for k in keys:
        for key in d:
            if k.lower() in key.lower():
                return d[key]
    return None


def month_key(dt):
    return dt.strftime("%Y-%m") if isinstance(dt, datetime) else "Unknown"


def deep_analyze(records, label):
    counters = {f: Counter() for f in [
        "dept", "company", "field", "location", "type", "category", "monitoring",
        "golden", "psf", "status", "risk", "swa", "action_party", "reporter",
    ]}
    monthly = Counter()
    overdue_open = 0
    now = datetime.now()

    for r in records:
        counters["dept"][str(nk(r, "Dept") or "Unknown").strip()] += 1
        counters["company"][str(nk(r, "Company") or "Unknown").strip()] += 1
        counters["field"][str(nk(r, "Field") or "Unknown").strip()] += 1
        counters["location"][str(nk(r, "Location") or "Unknown").strip()] += 1
        counters["reporter"][str(nk(r, "Name") or "Unknown").strip()] += 1
        counters["type"][str(nk(r, "Unsafe Act", "Good Observation") or "Unknown").strip()] += 1
        counters["category"][str(nk(r, "Observation Category") or "Unknown").strip()] += 1
        counters["monitoring"][str(nk(r, "Monitoring Point") or "Unknown").strip()] += 1
        counters["golden"][str(nk(r, "HSE Golden", "Golden") or "N/A").strip()] += 1
        counters["psf"][str(nk(r, "Process Safety", "PSF") or "N/A").strip()] += 1
        counters["status"][str(nk(r, "Status") or "N/A").strip()] += 1
        counters["risk"][str(nk(r, "Risk") or "Unknown").strip()] += 1
        counters["swa"][str(nk(r, "SWA") or "N/A").strip()] += 1
        counters["action_party"][str(nk(r, "Action Responsibility", "Action Party") or "Unknown").strip()] += 1
        monthly[month_key(nk(r, "Date"))] += 1
        if str(nk(r, "Status") or "").strip().lower() == "open":
            dl = nk(r, "Deadline")
            if isinstance(dl, datetime) and dl < now:
                overdue_open += 1

    open_by_dept = Counter()
    for r in records:
        if str(nk(r, "Status") or "").strip().lower() == "open":
            open_by_dept[str(nk(r, "Dept") or "Unknown").strip()] += 1

    return {
        "label": label,
        "total": len(records),
        "columns": len(records[0]) if records else 0,
        "status": dict(counters["status"].most_common()),
        "type_breakdown": dict(counters["type"].most_common()),
        "risk": dict(counters["risk"].most_common()),
        "category": dict(counters["category"].most_common()),
        "department": dict(counters["dept"].most_common(15)),
        "company": dict(counters["company"].most_common(10)),
        "field": dict(counters["field"].most_common()),
        "top_locations": dict(counters["location"].most_common(15)),
        "top_reporters": dict(counters["reporter"].most_common(10)),
        "monitoring": dict(counters["monitoring"].most_common(10)),
        "golden_rules": dict(counters["golden"].most_common(12)),
        "psf": dict(counters["psf"].most_common()),
        "swa": dict(counters["swa"].most_common()),
        "action_party": dict(counters["action_party"].most_common(12)),
        "monthly": dict(sorted(monthly.items())),
        "open_by_department": dict(open_by_dept.most_common(15)),
        "overdue_open": overdue_open,
    }


def hazard_analysis(ua_records):
    theme_counts = Counter()
    location_risk = Counter()
    location_medium = Counter()
    open_by_location = Counter()
    open_by_golden = Counter()
    group_counts = Counter()
    group_medium = Counter()
    medium_samples = []
    open_concern = []
    now = datetime.now()

    for r in ua_records:
        desc = (str(nk(r, "Description") or "") + " " + str(nk(r, "Immediate Action") or "")).lower()
        loc = str(nk(r, "Location") or "Unknown").strip()
        golden = str(nk(r, "HSE Golden", "Golden") or "General").strip()
        risk = str(nk(r, "Risk") or "Low").strip()
        status = str(nk(r, "Status") or "").strip()

        location_risk[loc] += 1
        if risk.lower() == "medium":
            location_medium[loc] += 1
            medium_samples.append({
                "sr": nk(r, "Sr"), "loc": loc, "golden": golden, "risk": risk,
                "status": status, "desc": str(nk(r, "Description") or "")[:220],
            })

        grouped = "Other / General"
        for gname, keys in AREA_GROUPS.items():
            if any(k.lower() in loc.lower() for k in keys):
                grouped = gname
                break
        group_counts[grouped] += 1
        if risk.lower() == "medium":
            group_medium[grouped] += 1

        for theme, patterns in HAZARD_THEMES.items():
            if any(re.search(p, desc) for p in patterns):
                theme_counts[theme] += 1

        if status.lower() == "open":
            open_by_location[loc] += 1
            open_by_golden[golden] += 1
            dl = nk(r, "Deadline")
            overdue = isinstance(dl, datetime) and dl < now
            if risk.lower() == "medium" or overdue:
                open_concern.append({
                    "sr": nk(r, "Sr"), "loc": loc, "golden": golden, "risk": risk,
                    "overdue": overdue, "desc": str(nk(r, "Description") or "")[:200],
                })

    psf_yes = sum(1 for r in ua_records if str(nk(r, "Process Safety", "PSF") or "").upper().startswith("Y"))

    recs = []
    if theme_counts["PPE Non-Compliance"] > 100:
        recs.append({"priority": "High", "area": "PPE Compliance",
            "finding": f"{theme_counts['PPE Non-Compliance']} PPE-related events (Sheet 1)",
            "action": "PPE checkpoint at plant entry; toolbox talks on eye protection and footwear in camp/workshop areas."})
    if theme_counts["Process Safety / Isolation"] > 80:
        recs.append({"priority": "Critical", "area": "Process Safety",
            "finding": f"{theme_counts['Process Safety / Isolation']} process/isolation events; {psf_yes} PSF-flagged",
            "action": "Valve isolation tagging (DO NOT OPERATE); line-up verification; amine mothballing compliance."})
    if theme_counts["Work at Height / Line of Fire"] > 40:
        recs.append({"priority": "High", "area": "Work at Height",
            "finding": f"{theme_counts['Work at Height / Line of Fire']} height/line-of-fire events",
            "action": "100% tie-off above 1.8m; barricades for overhead work; SWA audit for contractors."})
    if theme_counts["Slip, Trip & Fall"] > 80:
        recs.append({"priority": "High", "area": "Housekeeping / STF",
            "finding": f"{theme_counts['Slip, Trip & Fall']} slip/trip events",
            "action": "Weekly housekeeping audits Camp-1/Camp-2; cable/hose routing in plant areas."})
    if theme_counts["Driving / Road Safety"] > 80:
        recs.append({"priority": "High", "area": "Driving Safety",
            "finding": f"{theme_counts['Driving / Road Safety']} vehicle/road events",
            "action": "Road repair CP-4/CP-5; speed enforcement; vehicle permit compliance at wellheads."})
    if group_counts["Camp & Living Areas"] > 300:
        recs.append({"priority": "Medium", "area": "Camp Areas",
            "finding": f"{group_counts['Camp & Living Areas']} events in camp zones",
            "action": "Camp HSE walkdowns; mess hall safety; illumination upgrades."})
    if group_counts["Plant & Processing"] > 150:
        recs.append({"priority": "Critical", "area": "Plant & Processing",
            "finding": f"{group_counts['Plant & Processing']} events in plant areas",
            "action": "Process safety inspections; amine drainage containment; SIMOPS review."})
    if open_by_location:
        recs.append({"priority": "Medium", "area": "Open Item Backlog",
            "finding": f"{sum(open_by_location.values())} open; {open_by_location.most_common(1)[0][0]} leads",
            "action": "Monthly open-item review; escalate overdue items to department heads."})

    return {
        "hazard_themes": dict(theme_counts.most_common()),
        "top_hazard_locations": dict(location_risk.most_common(20)),
        "medium_risk_by_location": dict(location_medium.most_common(15)),
        "open_by_location": dict(open_by_location.most_common(15)),
        "open_by_golden": dict(open_by_golden.most_common(10)),
        "area_groups": dict(group_counts.most_common()),
        "area_groups_medium": dict(group_medium.most_common()),
        "medium_risk_total": len(medium_samples),
        "medium_risk_samples": medium_samples[:15],
        "open_high_concern": open_concern[:20],
        "psf_applicable_count": psf_yes,
        "recommendations": recs,
    }


def main():
    if not NUMBERS_FILE.exists():
        print(f"Missing {NUMBERS_FILE}", file=sys.stderr)
        sys.exit(1)

    doc = Document(str(NUMBERS_FILE))
    ua = parse_register(doc, "UA UC 2025-2026")
    good = parse_register(doc, "Good Observations 2025-26 ")

    u = deep_analyze(ua, "UA/UC Register 2025-2026")
    g = deep_analyze(good, "Good Observations 2025-26")
    closed = sum(1 for r in ua if str(nk(r, "Status") or "").lower() == "closed")

    open_items = []
    for r in ua:
        if str(nk(r, "Status") or "").strip().lower() == "open":
            open_items.append({
                "sr": nk(r, "Sr"), "name": nk(r, "Name"), "dept": nk(r, "Dept"),
                "date": str(nk(r, "Date") or ""), "deadline": str(nk(r, "Deadline") or ""),
                "location": nk(r, "Location"), "type": nk(r, "Unsafe Act"),
                "risk": nk(r, "Risk"), "action": nk(r, "Action Responsibility"),
                "description": str(nk(r, "Description") or "")[:200],
            })

    result = {
        "source": "sheet eni.numbers",
        "title": "Bhit Gas Field — HSE Analysis",
        "period": "2025–2026",
        "field": "Kirthar / Tajjal (Bhit Gas Field)",
        "sheets_analyzed": ["UA UC 2025-2026", "Good Observations 2025-26"],
        "sheet1_ua_uc": u,
        "sheet2_good_obs": g,
        "closure_rate_pct": round(100 * closed / max(len(ua), 1), 1),
        "open_items": open_items[:30],
        "hazard_analysis": hazard_analysis(ua),
        "insights": [
            f"Sheet 1 — UA/UC: {u['total']} reports, {round(100*closed/max(len(ua),1),1)}% closed, {u['status'].get('Open',0)} open ({u['overdue_open']} overdue).",
            f"Sheet 2 — Good Obs: {g['total']} positive reports ({round(g['total']/u['total']*100)}% of UA/UC volume).",
            f"Unsafe Conditions ({u['type_breakdown'].get('Unsafe Condition',0)}) vs Acts ({u['type_breakdown'].get('Unsafe Act',0)}).",
            f"Top UA/UC dept: {next(iter(u['department']))} ({next(iter(u['department'].values()))}); top Good Obs dept: {next(iter(g['department']))}.",
            f"BBS monitoring: {u['monitoring'].get('BBS',0)} UA/UC, {g['monitoring'].get('BBS',0)} good obs.",
            f"SWA applied: {u['swa'].get('Yes',0)} ({round(u['swa'].get('Yes',0)/u['total']*100)}%).",
            f"Peak UA/UC month: {max(u['monthly'], key=u['monthly'].get)} ({u['monthly'][max(u['monthly'], key=u['monthly'].get)]}).",
        ],
    }

    OUTPUT.write_text(json.dumps(result, indent=2, default=str))
    print(f"Wrote {OUTPUT} — UA/UC: {u['total']}, Good Obs: {g['total']}")


if __name__ == "__main__":
    main()
