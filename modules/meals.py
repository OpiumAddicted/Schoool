import re
import requests
from datetime import datetime, time

KEY = ""

mealType = {"조식": "1", "중식": "2", "석식": "3"}

def getMealType():
    josikTime = time(7, 40)
    joongsikTime = time(12, 50)

    currentTime = datetime.now().time()

    if currentTime < josikTime:
        return "조식"
    if currentTime <= joongsikTime:
        return "중식"
    return "석식"

def getMeal():
    params = {
        "KEY": KEY,
        "Type": "json",
        "pIndex": 1,
        "pSize": 5,
        "ATPT_OFCDC_SC_CODE": "D10",
        "SD_SCHUL_CODE": "7240454",
        "MMEAL_SC_CODE": mealType[getMealType()],
        "MLSV_YMD": str(datetime.now().strftime("%Y%m%d")),
    }

    res = requests.get(
        "https://open.neis.go.kr/hub/mealServiceDietInfo",
        params=params,
        timeout=5,
    )
    res.raise_for_status()

    mealRaw = res.json()["mealServiceDietInfo"][1]["row"][0]["DDISH_NM"]
    mealLines = mealRaw.replace("<br/>", "\n").splitlines()
    cleanedLines = [re.sub(r"\([^)]*\)", "", line).strip() for line in mealLines]
    meal = "\n".join(line for line in cleanedLines if line)

    return meal

if __name__ == "__main__":
    print(getMeal())
