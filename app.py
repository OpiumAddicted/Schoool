import re
import modules.meals
from pathlib import Path
from flask import Flask, render_template, url_for

app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent
TIMETABLES_DIR = BASE_DIR / "static" / "timetables"
CLASS_STEM_PATTERN = re.compile(r"^class(\d+)$", re.IGNORECASE)

def getTimetables():
    if not TIMETABLES_DIR.exists():
        return []

    entries = []
    for timetablesPath in TIMETABLES_DIR.glob("*.md"):
        stem = timetablesPath.stem
        matched = CLASS_STEM_PATTERN.match(stem)

        if matched:
            classNumber = int(matched.group(1))
            entry = {
                "id": f"class{classNumber}",
                "label": f"{classNumber}반",
                "filename": timetablesPath.name,
                "sort_key": (0, classNumber),
            }
        else:
            entry = {
                "id": stem.lower(),
                "label": stem,
                "filename": timetablesPath.name,
                "sort_key": (1, stem.lower()),
            }

        entries.append(entry)

    return sorted(entries, key=lambda item: item["sort_key"])

@app.route("/", methods=["GET"])
def timetable():
    try:
        mealType = modules.meals.getMealType()
        meal = modules.meals.getMeal().replace("*", "").replace("#", "").replace("-", "")
    except Exception:
        mealType, meal = "급식", "급식 정보를 불러오지 못했습니다."

    timetables = getTimetables()
    timetable_options = [
        {
            "id": entry["id"],
            "label": entry["label"],
            "url": url_for("static", filename=f"timetables/{entry['filename']}"),
        }
        for entry in timetables
    ]

    return render_template(
        "dashboard.html",
        mealType=mealType,
        meal=meal,
        timetableOptions=timetable_options,
        defaultTimetableId=timetables[0]["id"] if timetables else "",
    )

@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404

if __name__ == "__main__":
    app.run(debug=True) # host="0.0.0.0", port=8080
