import os
import sys
import json
import re
import subprocess
import time

import sounddevice as sd
from vosk import Model, KaldiRecognizer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_RATE = 16000


def find_model_path():
    candidates = [
        os.path.join(BASE_DIR, "vosk-model-small-pl-0.22"),
        os.path.join(BASE_DIR, "..", "vosk-model-small-pl-0.22"),
        os.path.join(BASE_DIR, "jarvis", "vosk-model-small-pl-0.22"),
        r"C:\Users\Użytkownik\Desktop\jarvis\vosk-model-small-pl-0.22",
        r"C:\Users\Użytkownik\Desktop\jarvis\jarvis\vosk-model-small-pl-0.22",
    ]

    for path in candidates:
        abs_path = os.path.abspath(path)
        if os.path.isdir(abs_path):
            return abs_path

    return os.path.abspath(os.path.join(BASE_DIR, "vosk-model-small-pl-0.22"))


MODEL_PATH = find_model_path()


def normalize(tekst):
    if not tekst:
        return ""
    mapa = str.maketrans({
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
        'ó': 'o', 'ś': 's', 'ż': 'z', 'ź': 'z',
    })
    tekst = tekst.lower().translate(mapa)
    tekst = re.sub(r"[^a-z0-9\s]", " ", tekst)
    tekst = re.sub(r"\s+", " ", tekst).strip()
    return tekst


def jest_umbot_uruchomiony():
    for process in subprocess.check_output(["powershell", "Get-CimInstance Win32_Process | Select-Object -ExpandProperty Name"], text=True, stderr=subprocess.DEVNULL).splitlines():
        if process.strip().lower() == "python.exe":
            return True
    return False


def uruchom_umbot():
    try:
        subprocess.Popen([sys.executable, os.path.join(BASE_DIR, "jarvis.py")], cwd=BASE_DIR)
        print("[LAUNCHER] Uruchamiam Umbota...")
        return True
    except Exception as e:
        print(f"[LAUNCHER] Błąd uruchamiania: {e}")
        return False


def wybierz_urządzenie_mikrofonu(preferred_index=None):
    try:
        devices = sd.query_devices()
        print("[LAUNCHER] Dostępne urządzenia audio:")
        candidates = []

        for idx, device in enumerate(devices):
            if isinstance(device, dict):
                channels = device.get("max_input_channels", 0)
                name = device.get("name", "unknown")
            else:
                channels = 0
                name = str(device)

            print(f"[LAUNCHER] idx={idx}, wejście={channels}, nazwa={name}")
            if channels and channels > 0:
                lower_name = name.lower()
                if any(token in lower_name for token in ["microphone", "mic", "headset", "usb", "audio", "input"]) and not any(token in lower_name for token in ["mapping", "mapper", "virtual", "microsoft", "stereo"]):
                    candidates.append(idx)

        if preferred_index is not None:
            print(f"[LAUNCHER] Używam wskazany indeks: {preferred_index}")
            return preferred_index

        if candidates:
            selected = devices[candidates[0]]
            selected_name = selected.get("name", str(selected)) if isinstance(selected, dict) else str(selected)
            print(f"[LAUNCHER] Wybieram mikrofon: nazwa={selected_name}")
            return candidates[0]

        default_in = sd.default.device[0] if isinstance(sd.default.device, (tuple, list)) else None
        print(f"[LAUNCHER] Brak realnego wejścia; używam domyślne wejście: {default_in}")
        return default_in
    except Exception as e:
        print(f"[LAUNCHER] Nie mogę odczytać urządzeń: {e}")
        return None


def czy_to_aktywowanie(tekst):
    t = normalize(tekst)
    if not t:
        return False

    wzorce = [
        "wstawaj", "wstawaj umbot", "umbot", "ambot", "ombot", "embot",
        "um bot", "am bot", "om bot", "em bot",
        "hej umbot", "witaj umbot", "cześć umbot", "czesc umbot",
        "uruchom umbot", "start umbot", "aktywuj umbot",
        "hej", "halo", "elo", "siema", "siemka", "witaj"
    ]

    for wzorzec in wzorce:
        if wzorzec in t:
            return True

    return False


def oblicz_poziom_sygnalu(indata):
    data = np.frombuffer(indata, dtype=np.int16)
    if data.size == 0:
        return 0.0
    rms = np.sqrt(np.mean(np.square(data.astype(np.float32)))) / 32768.0
    peak = np.max(np.abs(data.astype(np.float32))) / 32768.0
    return float(max(rms, peak))


def callback(indata, frames, time, status):
    if status:
        print(status)

    poziom = oblicz_poziom_sygnalu(indata) if DEBUG_AUDIO else 0.0
    if DEBUG_AUDIO:
        print(f"[AUDIO] poziom={poziom:.4f}")

    if recognizer.AcceptWaveform(bytes(indata)):
        wynik = json.loads(recognizer.Result())
        tekst = wynik.get("text", "")
        if not tekst:
            return

        print(f"[LISTEN] {tekst}")
        if czy_to_aktywowanie(tekst):
            if not jest_umbot_uruchomiony():
                uruchom_umbot()
            else:
                print("[LAUNCHER] Umbot już działa.")


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

    print("[LAUNCHER] Startuję launcher Umbota...")
    print(f"[LAUNCHER] Ścieżka modelu: {MODEL_PATH}")

    if not os.path.isdir(MODEL_PATH):
        raise FileNotFoundError(f"Nie znaleziono modelu Vosk pod ścieżką: {MODEL_PATH}")

    model = Model(MODEL_PATH)
    recognizer = KaldiRecognizer(model, SAMPLE_RATE)

    device_id = wybierz_urządzenie_mikrofonu(preferred_device)
    print(f"[LAUNCHER] Używany mikrofon: {device_id}")

    with sd.RawInputStream(
        device=device_id,
        samplerate=SAMPLE_RATE,
        blocksize=8000,
        dtype="int16",
        channels=1,
        callback=callback
    ):
        print("[LAUNCHER] Czekam na komendę aktywacyjną: 'Wstawaj' lub 'Umbot'.")
        if DEBUG_AUDIO:
            print("[LAUNCHER] Tryb debug mikrofonu: włączony. Będą pokazywane poziomy sygnału i rozpoznawane słowa.")
        while True:
            sd.sleep(1000)
