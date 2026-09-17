import numpy as np
import sounddevice as sd

SAMPLE_RATE = 16000
DURATION_SEC = 1.0
THRESHOLD = 0.01

print('=== TEST MIKROFONU ===')
print('DEFAULT_DEVICE', sd.default.device)
print('LISTA URZĄDZEŃ:')
for i, dev in enumerate(sd.query_devices()):
    if isinstance(dev, dict):
        name = dev.get('name', 'unknown')
        channels = dev.get('max_input_channels', 0)
    else:
        name = str(dev)
        channels = 0
    print(f'idx={i}, channels={channels}, name={name}')

print('\nPobieranie testowego sygnału przez 1 sekundę...')
recording = sd.rec(int(DURATION_SEC * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='float32')
sd.wait()
peak = float(np.abs(recording).max())
rms = float(np.sqrt(np.mean(np.square(recording))))
print(f'PEAK={peak}')
print(f'RMS={rms}')

if peak > THRESHOLD:
    print('WYNIK: mikrofon działa i rejestruje dźwięk.')
else:
    print('WYNIK: mikrofon nie rejestruje dźwięku lub nie jest podłączony.')
