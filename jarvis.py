import ast
try:
    import sounddevice as sd
except ImportError:
    sd = None
import json
import re
import sys
import requests
import os
try:
    import pyttsx3
except ImportError:
    pyttsx3 = None
import webbrowser
import subprocess
import threading
try:
    import numpy as np
except ImportError:
    np = None
import unicodedata
from functools import lru_cache
from pathlib import Path
from difflib import get_close_matches
try:
    from vosk import Model, KaldiRecognizer
except ImportError:
    Model = None
    KaldiRecognizer = None

MODEL_PATH = "vosk-model-small-pl-0.22"
SAMPLE_RATE = 16000
OLLAMA_MODEL = "gemma3"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
AI_SESSION = requests.Session()
AI_PROVIDER_STATUS = {"provider": "none", "error": ""}
BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_SOURCE = BASE_DIR / "um_bot_knowledge.md"
KNOWLEDGE_DIR = BASE_DIR / "knowledge"

# =========================
# GŁOS UMBOT
# =========================

import queue

try:
    mowa = pyttsx3.init(driverName="sapi5") if pyttsx3 and os.name == "nt" else None
    if mowa:
        mowa.setProperty("rate", 170)
        mowa.setProperty("volume", 1.0)
        mowa.startLoop(False)
except Exception:
    mowa = None
koljka_glosu = queue.Queue()


def _worker_glosu():
    while True:
        tekst = koljka_glosu.get()
        if tekst is None:
            koljka_glosu.task_done()
            break
        if mowa is None:
            koljka_glosu.task_done()
            continue
        if not tekst or not str(tekst).strip():
            koljka_glosu.task_done()
            continue

        tekst = str(tekst).strip()
        print(f"UMBOT: {tekst}")
        mowa.say(tekst)
        while mowa.isBusy():
            mowa.iterate()
        koljka_glosu.task_done()


worker_tts = threading.Thread(target=_worker_glosu, daemon=True)
worker_tts.start()


def powiedz(tekst):
    if mowa is None or not tekst or not str(tekst).strip():
        return
    koljka_glosu.put(str(tekst).strip())


# =========================
# TRYB UMBOT
# =========================

aktywny = False


def rozpoznaj_aktywator(tekst):
    if not tekst:
        return None, ""

    mapa = str.maketrans({
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
        'ó': 'o', 'ś': 's', 'ż': 'z', 'ź': 'z',
    })

    tekst = tekst.lower().translate(mapa)
    tekst = re.sub(r"[^a-z0-9\s]", " ", tekst)
    tekst = re.sub(r"\s+", " ", tekst).strip()

    if not tekst:
        return None, ""

    slowa = tekst.split()
    priorytet = [
        "wstawaj", "wstawaj umbot", "umbot", "ambot", "ombot", "embot", "am bot", "um bot", "om bot", "em bot",
        "witaj umbot", "hej umbot", "czesc umbot", "cześć umbot",
        "aktywuj", "wlacz", "włącz", "uruchom",
        "hej", "cześć", "czesc", "yo", "halo", "elo",
        "siema", "siemka", "witaj", "bot"
    ]
    fallback = [
        "wstawaj", "umbot", "ambot", "ombot", "embot", "um bot", "am bot", "om bot", "em bot",
        "aktywuj", "wlacz", "uruchom", "hej", "czesc", "yo", "halo", "elo",
        "siema", "siemka", "witaj", "bot"
    ]

    for i, slowo in enumerate(slowa):
        for wzorzec in priorytet:
            if slowo == wzorzec or slowo.startswith(wzorzec) or wzorzec.startswith(slowo):
                reszta = " ".join(slowa[:i] + slowa[i + 1:]).strip()
                return wzorzec, reszta

        dopasowanie = get_close_matches(slowo, fallback, n=1, cutoff=0.15)
        if dopasowanie:
            reszta = " ".join(slowa[:i] + slowa[i + 1:]).strip()
            return dopasowanie[0], reszta

    if any(w in tekst for w in ["wstawaj", "umbot", "ambot", "ombot", "embot", "um bot", "am bot", "om bot", "em bot"]):
        for wzorzec in ["wstawaj", "umbot", "ambot", "ombot", "embot", "um bot", "am bot", "om bot", "em bot"]:
            if wzorzec in tekst:
                reszta = tekst.replace(wzorzec, "", 1).strip()
                return wzorzec, reszta

    for wzorzec in priorytet:
        if wzorzec in tekst:
            reszta = tekst.replace(wzorzec, "", 1).strip()
            return wzorzec, reszta

    if "bot" in slowa and any(s in slowa for s in ["um", "am", "om", "em", "u", "a"]):
        idx_bot = next(i for i, s in enumerate(slowa) if s == "bot")
        reszta = " ".join(slowa[:idx_bot] + slowa[idx_bot + 1:]).strip()
        return "bot", reszta

    if len(slowa) >= 1 and any(s in slowa for s in ["um", "am", "om", "em"]) and "bot" in slowa:
        return "bot", ""

    return None, ""


def czy_to_komenda_glosowa(tekst):
    if not tekst:
        return False

    tekst = tekst.lower()
    wzorce = [
        "wstawaj", "umbot", "ambot", "ombot", "embot", "hej", "halo", "elo", "witaj",
        "otworz", "otwórz", "wlacz", "włącz", "uruchom", "znajdz", "znajdź",
        "pokaż", "pokaz", "wyszukaj", "kalkulator", "notatnik", "youtube",
        "google", "discord", "github", "explorer", "eksplorator", "folder",
        "policz", "oblicz", "licz", "dodaj", "odejmij", "pomnoz", "pomnóż",
        "podziel", "plus", "minus", "razy", "przez"
    ]

    return any(w in tekst for w in wzorce)


def zamien_liczby_slowne(tekst):
    zamiana = {
        "zero": "0", "0": "0",
        "jeden": "1", "jedna": "1", "jedno": "1", "1": "1",
        "dwa": "2", "2": "2",
        "trzy": "3", "3": "3",
        "cztery": "4", "4": "4",
        "piec": "5", "pięć": "5", "5": "5",
        "szesc": "6", "sześć": "6", "6": "6",
        "siedem": "7", "7": "7",
        "osiem": "8", "8": "8",
        "dziewiec": "9", "dziewięć": "9", "9": "9",
        "dziesiec": "10", "10": "10",
        "dwadziescia": "20", "dwadzieścia": "20",
        "trzydziesci": "30", "trzydzieści": "30",
        "czterdziesci": "40",
        "piecdziesiat": "50", "pięćdziesiąt": "50",
        "szescdziesiat": "60", "sześćdziesiąt": "60",
        "siedemdziesiat": "70",
        "osiemdziesiat": "80",
        "dziewiecdziesiat": "90"
    }

    for slowo, liczba in zamiana.items():
        tekst = re.sub(rf"\b{re.escape(slowo)}\b", liczba, tekst)

    return tekst


def policz_wyrazenie(tekst):
    if not re.search(r"(policz|oblicz|licz|dodaj|odejmij|pomnóż|pomnoz|podziel|razy|przez|plus|minus)", tekst):
        return None

    wyrazenie = tekst
    for fragment in [
        "policz", "oblicz", "licz", "wykonaj", "działanie", "dzialanie",
        "dodaj", "odejmij", "pomnóż", "pomnoz", "podziel", "razy", "przez",
        "plus", "minus", "i", "a"
    ]:
        wyrazenie = wyrazenie.replace(fragment, " ")

    wyrazenie = zamien_liczby_slowne(wyrazenie)
    wyrazenie = wyrazenie.replace("x", "*")
    wyrazenie = wyrazenie.replace("*", "*")
    wyrazenie = re.sub(r"[^0-9+\-*/().\s]", " ", wyrazenie)
    wyrazenie = re.sub(r"\s+", " ", wyrazenie).strip()

    if not wyrazenie or len(re.findall(r"\d", wyrazenie)) < 2:
        return None

    try:
        node = ast.parse(wyrazenie, mode='eval')
        wynik = eval(compile(node, '<calc>', 'eval'), {"__builtins__": {}}, {})
        if isinstance(wynik, float) and wynik.is_integer():
            return int(wynik)
        return wynik
    except Exception:
        return None


# =========================
# POLECENIA KOMPUTEROWE
# =========================

def wykonaj_polecenie(tekst):
    tekst = tekst.lower()

    wynik = policz_wyrazenie(tekst)
    if wynik is not None:
        return f"Wynik to: {wynik}"

    # =========================
    # ZNAJDŹ
    # =========================

    if "znajdź" in tekst or "znajdz" in tekst:
        if "znajdź" in tekst:
            zapytanie = tekst.split("znajdź", 1)[1]
        else:
            zapytanie = tekst.split("znajdz", 1)[1]

        zapytanie = zapytanie.replace("w google", "").strip()

        if zapytanie:
            url = "https://www.google.com/search?q=" + zapytanie.replace(" ", "+")
            webbrowser.open(url)
            return f"Wyszukuję: {zapytanie}"

    # =========================
    # STRONY
    # =========================

    if ("kanal" in tekst or "kanał" in tekst) and "youtube" in tekst:
        zapytanie = tekst
        for fragment in ["kanal", "kanał", "na youtube", "w youtube", "youtube", "otworz", "otwórz", "odpal", "pokaż", "pokaz", "uruchom"]:
            zapytanie = zapytanie.replace(fragment, " ", 1)
        zapytanie = zapytanie.strip()

        if zapytanie:
            url = "https://www.youtube.com/results?search_query=" + zapytanie.replace(" ", "+")
            webbrowser.open(url)
            return f"Otwieram kanał na YouTube: {zapytanie}"

    if "youtube" in tekst and "wyszukaj" not in tekst:
        webbrowser.open("https://www.youtube.com")
        return "Otwieram YouTube."

    if "google" in tekst and "wyszukaj" not in tekst:
        webbrowser.open("https://www.google.com")
        return "Otwieram Google."

    if "discord" in tekst:
        webbrowser.open("https://discord.com")
        return "Otwieram Discord."

    if "github" in tekst:
        webbrowser.open("https://github.com")
        return "Otwieram GitHub."

    # =========================
    # WYSZUKIWANIE GOOGLE
    # =========================

    if "wyszukaj" in tekst and "google" in tekst:
        zapytanie = tekst.split("wyszukaj", 1)[1]
        zapytanie = zapytanie.replace("w google", "").strip()

        if zapytanie:
            url = "https://www.google.com/search?q=" + zapytanie.replace(" ", "+")
            webbrowser.open(url)
            return f"Wyszukuję w Google: {zapytanie}"

    # =========================
    # WYSZUKIWANIE YOUTUBE
    # =========================

    if "wyszukaj" in tekst and "youtube" in tekst:
        zapytanie = tekst.split("wyszukaj", 1)[1]
        zapytanie = zapytanie.replace("na youtube", "")
        zapytanie = zapytanie.replace("w youtube", "")
        zapytanie = zapytanie.strip()

        if zapytanie:
            url = "https://www.youtube.com/results?search_query=" + zapytanie.replace(" ", "+")
            webbrowser.open(url)
            return f"Wyszukuję na YouTube: {zapytanie}"

    # =========================
    # PROGRAMY
    # =========================

    if "kalkulator" in tekst:
        subprocess.Popen("calc.exe")
        return "Otwieram kalkulator."

    if "notatnik" in tekst:
        subprocess.Popen("notepad.exe")
        return "Otwieram notatnik."

    if "eksplorator" in tekst or "folder" in tekst:
        subprocess.Popen("explorer.exe")
        return "Otwieram eksplorator plików."

    return None


# =========================
# AI - OLLAMA
# =========================

@lru_cache(maxsize=8)
def _wczytaj_wszystkie_zrodla(path: str | Path | None = None) -> tuple[str, ...]:
    if path is None:
        sciezki = [KNOWLEDGE_SOURCE]
        if KNOWLEDGE_DIR.exists():
            sciezki.extend(sorted(KNOWLEDGE_DIR.rglob("*.md")))
    else:
        lokalizacja = Path(path)
        if not lokalizacja.is_absolute():
            lokalizacja = BASE_DIR / lokalizacja
        sciezki = [lokalizacja]

    fragmenty = []
    widoczne = set()

    for lokalizacja in sciezki:
        if not lokalizacja.exists() or not lokalizacja.is_file():
            continue

        klucz = str(lokalizacja.resolve())
        if klucz in widoczne:
            continue
        widoczne.add(klucz)

        try:
            tekst = lokalizacja.read_text(encoding="utf-8")
        except Exception:
            continue

        if tekst.strip():
            fragmenty.append(f"## {lokalizacja.relative_to(BASE_DIR)}\n{tekst.strip()}")

    return tuple(fragmenty)


def wczytaj_zrodlo_wiedzy(path: str | Path | None = None, query: str = "", wymagaj_dopasowania: bool = False) -> str:
    fragmenty = list(_wczytaj_wszystkie_zrodla(path))
    if not fragmenty:
        return ""

    if not query.strip():
        return "\n\n".join(_usun_powtorzenia(fragmenty))[:26000]

    query_words = {
        word for word in re.findall(r"[a-ząćęłńóśźż0-9]+", query.lower())
        if len(word) > 2
    }
    scored_chunks = []
    for fragment in fragmenty:
        chunks = re.split(r"\n\s*\n", fragment)
        for chunk in chunks:
            normalized = chunk.lower()
            score = sum(normalized.count(word) for word in query_words)
            if score:
                scored_chunks.append((score, len(chunk), chunk.strip()))

    if not scored_chunks:
        if wymagaj_dopasowania:
            return ""
        return "\n\n".join(_usun_powtorzenia(fragmenty))[:9000]

    scored_chunks.sort(key=lambda item: (item[0], item[1]), reverse=True)
    selected = []
    total_length = 0
    for _, _, chunk in scored_chunks:
        if chunk in selected:
            continue
        if total_length + len(chunk) > 10000:
            continue
        selected.append(chunk)
        total_length += len(chunk)
        if len(selected) >= 10:
            break

    return "\n\n".join(_usun_powtorzenia(selected))


def _usun_powtorzenia(fragmenty: list[str]) -> list[str]:
    wynik = []
    widoczne = set()
    for fragment in fragmenty:
        zdania = re.split(r"(?<=[.!?])\s+", re.sub(r"\s+", " ", fragment.strip()))
        unikalne = []
        for zdanie in zdania:
            klucz = re.sub(r"[^a-ząćęłńóśźż0-9]", "", zdanie.casefold())
            if len(klucz) < 12 or klucz in widoczne:
                continue
            widoczne.add(klucz)
            unikalne.append(zdanie.strip())
        if unikalne:
            wynik.append(" ".join(unikalne))
    return wynik


def lokalna_odpowiedz(tekst: str, kontekst: str, medyczny: bool = False) -> str:
    if not kontekst.strip():
        return "Nie znalazłem pasującego materiału w lokalnej bazie wiedzy. Spróbuj sformułować pytanie bardziej szczegółowo."

    fragmenty = []
    for fragment in re.split(r"\n\s*\n", kontekst):
        fragment = re.sub(r"^##\s+[^\n]+\n", "", fragment.strip())
        if fragment and fragment not in fragmenty:
            fragmenty.append(fragment)
        if len(fragmenty) >= 3:
            break

    tresc = "\n\n".join(_usun_powtorzenia(fragmenty))
    if medyczny:
        return (
            "**Krótka definicja**\n"
            f"{tresc[:900]}\n\n"
            "**Mechanizm / Patofizjologia**\n"
            f"{tresc[900:1800] or 'W dostarczonym fragmencie nie ma dodatkowego opisu mechanizmu.'}\n\n"
            "**Kluczowe punkty do zapamiętania**\n"
            f"- {tresc[1800:2600] or tresc[:700]}\n\n"
            "**Bezpieczeństwo**\n"
            "To materiał edukacyjny i nie zastępuje profesjonalnej oceny medycznej."
        )
    return f"{tresc[:1800]}"


def analizuj_kontekst_pytania(tekst: str) -> dict[str, str]:
    translation = str.maketrans({"ą":"a", "ć":"c", "ę":"e", "ł":"l", "ń":"n", "ó":"o", "ś":"s", "ż":"z", "ź":"z"})
    normalized = unicodedata.normalize("NFKD", tekst).casefold().translate(translation)
    normalized = normalized.encode("ascii", "ignore").decode()
    dziedziny = {
        "anatomia": ("anatom", "narzad", "kosci", "miesni", "uklad"),
        "fizjologia": ("fizjolog", "homeostaz", "oddychan", "cisnienie", "serce"),
        "biochemia": ("biochem", "enzym", "biał", "bial", "metabol", "glukoz", "atp"),
        "genetyka": ("genety", "dna", "rna", "genom", "chromosom", "dziedzicz"),
        "patomorfologia": ("patomorf", "nowotwor", "zapaleni", "komork", "komór", "tkank"),
        "medycyna ratunkowa": ("triage", "abcde", "uraz", "krwotok", "resuscyt", "ratunk", "sor"),
        "zdrowie i bezpieczeństwo": ("objaw", "bol", "goraczk", "lek", "chorob", "diagnoz", "pacjent")
    }
    znalezione = [nazwa for nazwa, slowa in dziedziny.items() if any(slowo in normalized for slowo in slowa)]
    if len(znalezione) == 1:
        dziedzina = znalezione[0]
    elif znalezione:
        dziedzina = " i ".join(znalezione[:3])
    else:
        dziedzina = "wiedza ogólna"

    if any(zwrot in normalized for zwrot in ("jak zrobic", "co zrobic", "instrukcj", "krok po kroku", "jak wykonac")):
        intencja = "prośba o instrukcję lub procedurę"
    elif any(zwrot in normalized for zwrot in ("dlaczego", "jak dziala", "mechanizm", "wyjasnij")):
        intencja = "prośba o wyjaśnienie mechanizmu"
    elif any(zwrot in normalized for zwrot in ("czy", "prawda", "oznacza", "co to", "jaka jest")):
        intencja = "pytanie definicyjne lub weryfikujące"
    else:
        intencja = "prośba o informację"

    poziom = "edukacyjny"
    if any(zwrot in normalized for zwrot in ("u mnie", "mam", "moje objawy", "czy powinienem", "czy powinnam")):
        poziom = "indywidualny i potencjalnie medyczny"
    elif any(zwrot in normalized for zwrot in ("student", "egzamin", "nauka", "zaliczenie", "lek")):
        poziom = "edukacyjny dla studenta"

    return {"dziedzina": dziedzina, "intencja": intencja, "poziom": poziom}


def zapytaj_umbot(tekst, history=None):
    analiza = analizuj_kontekst_pytania(tekst)
    tryb_medyczny = analiza["dziedzina"] != "wiedza ogólna"
    kontekst = wczytaj_zrodlo_wiedzy(query=tekst, wymagaj_dopasowania=True) if tryb_medyczny else ""
    brak_materialu = tryb_medyczny and not kontekst.strip()
    system_content = (
        "Jesteś inteligentnym, wyrozumiałym i naturalnie komunikującym się mentorem akademickim dla studentów medycyny. "
        "Prowadzisz swobodną, płynną rozmowę i utrzymujesz wątek wcześniejszych wypowiedzi. "
        "Odpowiadasz po polsku, z poprawną ortografią, gramatyką i interpunkcją. "
        "Używaj polskich znaków diakrytycznych: ą, ć, ę, ł, ń, ó, ś, ż, ź. "
        "Przed wysłaniem wykonaj cichą korektę językową. "
        "Wytłuszczaj ważne pojęcia i terminy medyczne, używając składni Markdown **bold**. "
        "Mów naturalnie, bezpośrednio i po ludzku, dopasowując język do tonu użytkownika. "
        "Odpowiadaj dokładnie na to, co napisał rozmówca. "
        "Jeśli użytkownik mówi o emocjach, zmęczeniu lub trudnościach w nauce, najpierw krótko i empatycznie odnieś się do jego sytuacji, a dopiero potem przejdź do konkretu. "
        "Nie używaj botowych zwrotów, takich jak 'Jako model AI', 'Oczywiście, chętnie pomogę!' ani 'Oto odpowiedź na Twoje pytanie'. "
        "W zwykłej rozmowie, small talku i pytaniach organizacyjnych odpowiadaj swobodnie, ciepło i zwięźle. "
        "Gdy to uzasadnione, zakończ jedną krótką odpowiedzią lub pytaniem podtrzymującym dialog. "
        "Nie sterujesz komputerem, nie uruchamiasz programów, nie otwierasz stron i nie wykonujesz poleceń systemowych. "
        "Twoim zadaniem jest wyłącznie odpowiadać na pytania i polecenia informacyjne. "
        "Nie powtarzaj tej samej informacji w punktach, akapitach ani podsumowaniu. "
        " Najpierw wewnętrznie rozpoznaj dziedzinę, intencję i poziom pytania. "
        "Nie pokazuj technicznej analizy jako osobnej listy, ale użyj jej do doboru zakresu i poziomu odpowiedzi. "
        "Jeśli pytanie łączy dziedziny, wyjaśnij zależność między nimi i oddziel fakty od interpretacji. "
    )

    if tryb_medyczny:
        system_content += (
            " TRYB MEDYCZNY: odpowiadaj WYŁĄCZNIE na podstawie dostarczonej bazy wiedzy. "
            "Jeśli baza nie zawiera potrzebnych danych, odpowiedz dokładnie: "
            "'W moich materiałach nie mam tego zagadnienia. Zapewne znajdziesz je w podręczniku głównej katedry.' "
            "Dla złożonych zagadnień stosuj kolejność: **Krótka definicja**, "
            "**Mechanizm / Patofizjologia**, **Kluczowe punkty do zapamiętania**. "
            "Używaj precyzyjnego języka medycznego i objaśniaj terminy tak, aby ułatwiać zapamiętywanie. "
            "Nie diagnozuj ani nie zastępuj lekarza; przy sygnałach alarmowych dodaj krótką sekcję **Bezpieczeństwo**."
        )
    else:
        system_content += (
            " TRYB OGÓLNY: przy pytaniach studenckich i organizacyjnych bądź pomocny, "
            "wyrozumiały i przyjazny. Odpowiadaj zwięźle i natychmiast przechodź do sedna. "
            "Możesz korzystać z ogólnej wiedzy modelu także przy pytaniach o codzienne sytuacje, "
            "sprzęty domowe, organizację nauki i luźną rozmowę. Nie ograniczaj takich odpowiedzi "
            "do lokalnej bazy medycznej i nie udawaj, że pytanie ogólne jest pytaniem medycznym. "
            "Przy poradach dotyczących urządzeń podawaj podstawowe, bezpieczne kroki i zaznacz, "
            "kiedy należy odłączyć sprzęt od zasilania lub skontaktować się z serwisem."
        )

    system_content += (
        f"\n\nAnaliza kontekstu pytania: dziedzina={analiza['dziedzina']}; "
        f"intencja={analiza['intencja']}; poziom={analiza['poziom']}."
    )

    rozmowa = [
        item for item in (history or [])
        if isinstance(item, dict) and item.get("role") in {"user", "assistant"} and item.get("content")
    ][-6:]
    if rozmowa:
        system_content += "\n\nKontekst bieżącej rozmowy. Nawiązuj do niego, gdy użytkownik używa skrótów typu 'to', 'tamto' lub 'poprzednio':\n"
        system_content += "\n".join(f"{item['role']}: {item['content'][:1800]}" for item in rozmowa)

    if kontekst:
        system_content += "\n\nŹródło wiedzy:\n" + kontekst

    if brak_materialu:
        return "Brak tych danych w moich materiałach źródłowych. Nie chcę wprowadzić Cię w błąd."

    if OPENAI_API_KEY:
        try:
            messages = [{"role": "system", "content": system_content}]
            messages.extend({"role": item["role"], "content": item["content"]} for item in rozmowa)
            messages.append({"role": "user", "content": tekst})
            openai_response = AI_SESSION.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={
                    "model": OPENAI_MODEL,
                    "messages": messages,
                    "temperature": 0.2,
                    "max_tokens": 420
                },
                timeout=20
            )
            openai_response.raise_for_status()
            openai_data = openai_response.json()
            choices = openai_data.get("choices", [])
            if choices:
                answer = choices[0].get("message", {}).get("content", "").strip()
                if answer:
                    AI_PROVIDER_STATUS.update(provider="openai", error="")
                    return answer
        except (requests.RequestException, ValueError, KeyError, TypeError) as error:
            code = getattr(getattr(error, "response", None), "status_code", None)
            AI_PROVIDER_STATUS.update(provider="openai_error", error=f"HTTP {code}" if code else type(error).__name__)
            print(f"[AI] OpenAI niedostępne: {AI_PROVIDER_STATUS['error']}")

    if GEMINI_API_KEY:
        try:
            gemini_response = AI_SESSION.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
                headers={"x-goog-api-key": GEMINI_API_KEY},
                json={
                    "system_instruction": {"parts": [{"text": system_content}]},
                    "contents": [{"role": "user", "parts": [{"text": tekst}]}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": 420
                    }
                },
                timeout=20
            )
            gemini_response.raise_for_status()
            gemini_data = gemini_response.json()
            candidates = gemini_data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                answer = "\n".join(part.get("text", "") for part in parts if part.get("text"))
                if answer.strip():
                    return answer.strip()
        except (requests.RequestException, ValueError, KeyError):
            print("[AI] Gemini niedostępne, używam Ollama.")

    try:
        odpowiedz = AI_SESSION.post(
            "http://localhost:11434/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": tekst}
                ],
                "stream": False,
                "keep_alive": "10m",
                "options": {
                    "temperature": 0.2,
                    "num_predict": 420
                }
            },
            timeout=12
        )
        odpowiedz.raise_for_status()
        dane = odpowiedz.json()
        tresc = dane.get("message", {}).get("content", "").strip()
        if tresc:
            return tresc
    except (requests.RequestException, ValueError, KeyError, TypeError):
        print("[AI] Ollama niedostępna, używam lokalnej bazy wiedzy.")

    if not tryb_medyczny:
        if AI_PROVIDER_STATUS["error"] == "HTTP 429":
            return "OpenAI odrzuciło zapytanie z powodu limitu lub braku środków na koncie API. Sprawdź limity i rozliczenia projektu OpenAI."
        return "Nie mogę teraz skorzystać z dostawcy odpowiedzi ogólnych. Ustaw OPENAI_API_KEY i spróbuj ponownie."
    return lokalna_odpowiedz(tekst, kontekst, medyczny=True)


# =========================
# OBSŁUGA KOMENDY
# =========================

def obsluz_tekst(tekst):
    global aktywny

    tekst = tekst.strip().lower()
    if not tekst:
        return

    aktywny = True
    print(f"\nTY: {tekst}")

    if any(w in tekst for w in ["do widzenia", "zakończ rozmowę", "zakończ rozmowe", "wyłącz się", "wyłącz", "koniec", "do zobaczenia"]):
        aktywny = False
        powiedz("Do widzenia. W razie potrzeby wystarczy powiedzieć Umbot.")
        print("\n🎤 Czekam na słowo „UMBOT”...")
        return

    print("DEBUG: tryb informacyjny, wywołuję model AI")

    try:
        odpowiedz = zapytaj_umbot(tekst)
        print(f"DEBUG: Ollama -> {odpowiedz}")
        powiedz(odpowiedz)
        aktywny = False
        print("\n🎤 Czekam na słowo „UMBOT”...")

    except Exception as e:
        print(f"❌ Błąd Ollama: {e}")
        powiedz("Nie mogę teraz odpowiedzieć. Spróbuj ponownie.")
        aktywny = False
        print("\n🎤 Czekam na słowo „UMBOT”...")


# =========================
# ROZPOZNAWANIE MOWY
# =========================


def uruchom_testy():
    testy = [
        "umbot otworz kalkulator",
        "aktywuj otworz notatnik",
        "umbot znajdz google",
        "halo",
        "ambot włącz youtube",
    ]

    for tekst in testy:
        aktywator, reszta = rozpoznaj_aktywator(tekst)
        print(f"TEST: wejscie='{tekst}' | aktywator={aktywator} | reszta='{reszta}'")
        if aktywator:
            print(f"TEST: wykryto aktywator -> {aktywator}, komenda='{reszta}'")


def wybierz_urządzenie_mikrofonu(preferred_index=None):
    try:
        devices = sd.query_devices()
        print("[MIC] Dostępne urządzenia audio:")
        valid = []

        for idx, device in enumerate(devices):
            if isinstance(device, dict):
                channels = int(device.get("max_input_channels", 0) or 0)
                name = device.get("name", "unknown")
            elif isinstance(device, (list, tuple)) and len(device) >= 3:
                channels = int(device[2] or 0)
                name = device[0]
            else:
                channels = 0
                name = str(device)

            lower_name = name.lower()
            print(f"[MIC] idx={idx}, wejście={channels}, nazwa={name}")
            if channels > 0:
                valid.append((idx, lower_name, channels))

        if preferred_index is not None:
            try:
                preferred_index = int(preferred_index)
            except (TypeError, ValueError):
                preferred_index = None

        if preferred_index is not None and 0 <= preferred_index < len(devices):
            preferred_device = devices[preferred_index]
            preferred_channels = int(preferred_device.get("max_input_channels", 0) or 0) if isinstance(preferred_device, dict) else 0
            preferred_name = preferred_device.get("name", str(preferred_device)) if isinstance(preferred_device, dict) else str(preferred_device)
            preferred_name_lower = preferred_name.lower()
            if preferred_channels > 0 and all(token not in preferred_name_lower for token in ["mapping", "mapper", "microsoft", "virtual", "output", "speaker", "speakers"]):
                print(f"[MIC] Używam wskazany indeks: {preferred_index}")
                return preferred_index
            print(f"[MIC] Wskazany indeks {preferred_index} jest niepoprawny dla wejścia; wybieram poprawne urządzenie automatycznie.")

        candidates = []
        for idx, lower_name, channels in valid:
            score = channels
            if any(token in lower_name for token in ["microphone", "mic", "headset", "usb"]):
                score += 50
            if "realtek" in lower_name:
                score += 20
            if any(token in lower_name for token in ["input", "audio"]):
                score += 10
            if any(token in lower_name for token in ["mapping", "mapper", "microsoft", "virtual", "output", "speaker", "speakers"]):
                score -= 100
            if "stereo" in lower_name:
                score -= 10
            candidates.append((score, idx, lower_name))

        candidates.sort(reverse=True)

        for _, idx, lower_name in candidates:
            if all(token not in lower_name for token in ["mapping", "mapper", "microsoft", "virtual", "output", "speaker", "speakers"]) and any(token in lower_name for token in ["microphone", "mic", "headset", "realtek", "input"]):
                try:
                    with sd.InputStream(device=idx, samplerate=SAMPLE_RATE, channels=1, dtype="int16"):
                        print(f"[MIC] Wybieram działające realne wejście: indeks={idx}")
                        return idx
                except Exception:
                    continue

        for idx, lower_name, _ in valid:
            if all(token not in lower_name for token in ["mapping", "mapper", "microsoft", "virtual", "output", "speaker", "speakers"]):
                try:
                    with sd.InputStream(device=idx, samplerate=SAMPLE_RATE, channels=1, dtype="int16"):
                        print(f"[MIC] Wybieram działające wejście: indeks={idx}")
                        return idx
                except Exception:
                    continue

        print("[MIC] Żadne wejście nie otworzyło się poprawnie jako aktywny mikrofon.")
        return None
    except Exception as e:
        print(f"[MIC] Nie mogę odczytać urządzeń: {e}")
        return None


def oblicz_poziom_sygnalu(indata):
    data = np.frombuffer(indata, dtype=np.int16)
    if data.size == 0:
        return 0.0
    rms = np.sqrt(np.mean(np.square(data.astype(np.float32)))) / 32768.0
    peak = np.max(np.abs(data.astype(np.float32))) / 32768.0
    return float(max(rms, peak))


def callback(indata, frames, time, status):
    global aktywny

    if status:
        print(status)

    if DEBUG_AUDIO:
        poziom = oblicz_poziom_sygnalu(indata)
        print(f"[AUDIO] poziom={poziom:.4f}")

    if recognizer.AcceptWaveform(bytes(indata)):
        wynik = json.loads(recognizer.Result())
        tekst = wynik.get("text", "").lower()

        if not tekst:
            return

        print(f"ROZPOZNANO: {tekst}")

        if len(tekst.strip()) < 2:
            return

        if not aktywny:
            aktywator, reszta = rozpoznaj_aktywator(tekst)
            if DEBUG_AUDIO:
                print(f"DEBUG: tekst='{tekst}' | aktywator={aktywator} | reszta='{reszta}'")

            if aktywator:
                if DEBUG_AUDIO:
                    print(f"[AKTYWATOR] WYKRYTY: '{aktywator}' | komenda='{reszta}'")
                aktywny = True
                if reszta:
                    powiedz("Jasne, słucham.")
                    threading.Thread(target=obsluz_tekst, args=(reszta,), daemon=True).start()
                else:
                    powiedz("Cześć, jestem Umbot. Słucham, w czym mogę pomóc?")
                return

            if czy_to_komenda_glosowa(tekst):
                if DEBUG_AUDIO:
                    print(f"DEBUG: wykryto komendę głosową bez aktywatora: '{tekst}'")
                aktywny = True
                threading.Thread(target=obsluz_tekst, args=(tekst,), daemon=True).start()
                return

            if "wstawaj" in tekst or "umbot" in tekst or "hej" in tekst or "halo" in tekst:
                aktywny = True
                threading.Thread(target=obsluz_tekst, args=(tekst,), daemon=True).start()
                return

            return

        if len(tekst.strip()) >= 2:
            threading.Thread(target=obsluz_tekst, args=(tekst,), daemon=True).start()


# =========================
# MIKROFON
# =========================

if __name__ == "__main__":
    DEBUG_AUDIO = "--debug-audio" in sys.argv
    preferred_device = None
    if "--device" in sys.argv:
        idx = sys.argv.index("--device")
        if idx + 1 < len(sys.argv):
            try:
                preferred_device = int(sys.argv[idx + 1])
            except ValueError:
                preferred_device = None

    if preferred_device is None:
        preferred_device = wybierz_urządzenie_mikrofonu()

    if "--device-list" in sys.argv:
        print("[MIC] Lista urządzeń audio:")
        for idx, device in enumerate(sd.query_devices()):
            if isinstance(device, dict):
                name = device.get("name", "unknown")
                channels = device.get("max_input_channels", 0)
            else:
                name = str(device)
                channels = 0
            print(f"[MIC] idx={idx}, wejście={channels}, nazwa={name}")
        raise SystemExit(0)

    if "--test" in sys.argv[1:]:
        uruchom_testy()
        raise SystemExit(0)

    print("=" * 55)
    print("                  UMBOT 1.0")
    print("             AKTYWACJA GŁOSEM 🤖")
    print("=" * 55)

    print("\nŁadowanie polskiego modelu...")

    model = Model(MODEL_PATH)
    recognizer = KaldiRecognizer(model, SAMPLE_RATE)

    print("✅ Model załadowany!")
    print("🤖 Gemma 3 gotowa!")
    print("🔊 Głos gotowy!")
    powiedz("Uruchamiam asystenta. Jestem gotowy do pracy.")

    device_id = wybierz_urządzenie_mikrofonu(preferred_device)
    print(f"[MIC] Ustawiony mikrofon: {device_id}")
    if device_id is None:
        print("[MIC] Brak poprawnego urządzenia wejściowego. Sprawdź --device-list i wybierz realny mikrofon.")
        raise SystemExit(1)
    print("\n🎤 Czekam na słowo „WSTAWAJ”...")
    print("Powiedz np. „Wstawaj, otwórz kalkulator.”")
    print("Jeśli to nie działa, uruchom: python jarvis.py --device 0 lub --device 1")
    print("Dodatkowo: python jarvis.py --device-list i python jarvis.py --debug-audio")
    print("Naciśnij Ctrl+C, aby zakończyć.\n")

    with sd.RawInputStream(
        device=device_id if device_id is not None else None,
        samplerate=SAMPLE_RATE,
        blocksize=8000,
        dtype="int16",
        channels=1,
        callback=callback
    ):
        while True:
            sd.sleep(1000)