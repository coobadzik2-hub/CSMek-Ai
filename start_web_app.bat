@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
	echo Nie znaleziono lokalnego srodowiska Python: .venv
	echo Utworz srodowisko i zainstaluj zaleznosci z web_app\requirements.txt.
	pause
	exit /b 1
)
if "%OPENAI_API_KEY%"=="" (
	echo.
	echo ChatGPT dla pytan ogolnych wymaga klucza OpenAI.
	echo Klucz nie zostanie zapisany w plikach. Wpisz go bezposrednio ponizej.
	set /p "OPENAI_API_KEY=OPENAI_API_KEY: "
)
if "%OPENAI_API_KEY%"=="" (
	echo Nie podano klucza OpenAI. Agent pozostanie bez ChatGPT.
)
echo.
echo CSMek Clinical Console
echo Otworz w tej chwili: http://localhost:8001/
set "LAN_IP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /R /C:"IPv4"') do if not defined LAN_IP set "LAN_IP=%%A"
for /f "tokens=*" %%A in ("%LAN_IP%") do set "LAN_IP=%%A"
if "%LAN_IP%"=="" set "LAN_IP=localhost"
echo Dla innych komputerow w tej samej sieci uzyj: http://%LAN_IP%:8001/
echo Dostep z Internetu wymaga tunelu publicznego albo wdrozenia na serwerze.
echo.
powershell.exe -NoProfile -Command "$c=Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue; foreach($x in $c){$p=Get-Process -Id $x.OwningProcess -ErrorAction SilentlyContinue; if($p.ProcessName -eq 'python'){Stop-Process -Id $p.Id -Force}}"
start "CSMek Clinical Console" /b ".venv\Scripts\python.exe" -m uvicorn web_app.server:app --host 0.0.0.0 --port 8001
echo Czekam na uruchomienie strony...
powershell.exe -NoProfile -Command "$deadline = (Get-Date).AddSeconds(30); while ((Get-Date) -lt $deadline) { try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8001/' -TimeoutSec 1; if ($response.StatusCode -eq 200) { exit 0 } } catch { }; Start-Sleep -Milliseconds 250 }; exit 1"
if errorlevel 1 (
	echo Nie udalo sie uruchomic strony pod adresem http://127.0.0.1:8001/
	pause
	exit /b 1
)
start "" "http://127.0.0.1:8001/"
pause
