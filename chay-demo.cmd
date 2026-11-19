@echo off
setlocal
set "CLINIC_DEMO_PROJECT=clinic-telehealth-integration"
set "CLINIC_DEMO_RESULT=1"
set "CLINIC_DEMO_PUSHED="
set "CLINIC_DEMO_FRONTEND="
set "CLINIC_DEMO_PATIENT_FRONTEND="

pushd "%~dp0" || goto finish
set "CLINIC_DEMO_PUSHED=1"

where.exe /q python.exe
if errorlevel 1 (
    echo Can cai Python 3.10 tro len va them python.exe vao PATH.
    goto finish
)
docker info --format "{{.ServerVersion}}" >nul
if errorlevel 1 (
    echo Mo Docker Desktop, doi Docker san sang, roi chay lai.
    goto finish
)

if /i "%~1"=="--fresh" (
    echo Dang xoa du lieu demo cu de nap lai bo moi...
    docker compose -p %CLINIC_DEMO_PROJECT% down -v
    if errorlevel 1 goto finish
    shift
)

if not exist ".env" (
    docker volume inspect "%CLINIC_DEMO_PROJECT%_mysql-data" >nul 2>&1
    if not errorlevel 1 (
        echo Da co volume demo nhung thieu .env. Khoi phuc dung .env cua volume roi chay lai.
        goto finish
    )
    goto setup
)
if exist "infra\runtime\clinic-realm.json" goto start_stack

:setup
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\setup-local.ps1"
if errorlevel 1 goto finish

:start_stack
for /f "delims=" %%S in ('docker compose -p %CLINIC_DEMO_PROJECT% config --services') do (
    if "%%S"=="frontend" set "CLINIC_DEMO_FRONTEND=frontend"
    if "%%S"=="patient-frontend" set "CLINIC_DEMO_PATIENT_FRONTEND=patient-frontend"
)
if not defined CLINIC_DEMO_FRONTEND set "CLINIC_DEMO_FRONTEND=%CLINIC_DEMO_PATIENT_FRONTEND%"
if not defined CLINIC_DEMO_FRONTEND (
    echo Khong tim thay service frontend trong compose.yaml.
    goto finish
)

docker compose -p %CLINIC_DEMO_PROJECT% up -d --no-recreate keycloak
if errorlevel 1 goto finish
python.exe -B "%~dp0scripts\setup-staff-provisioning.py"
if errorlevel 1 goto finish
docker compose -p %CLINIC_DEMO_PROJECT% up -d --wait --wait-timeout 150 %CLINIC_DEMO_FRONTEND% backend
if errorlevel 1 goto finish
python.exe -B "%~dp0data_demo\load_local_demo.py" --apply %1 %2 %3 %4 %5 %6
set "CLINIC_DEMO_RESULT=%ERRORLEVEL%"

:finish
if defined CLINIC_DEMO_PUSHED popd
echo.
if "%CLINIC_DEMO_RESULT%"=="0" (
    echo Mo http://localhost:5173/
    echo Tai khoan mac dinh: admin, doctor, patient, receptionist, auditor.
    echo Tai khoan demo bo sung: patient3, doctor2..doctor8 ^(mat khau DEMO_PASSWORD trong .env^).
    echo Muon xoa du lieu cu va nap lai bo demo moi: chay-demo.cmd --fresh
) else (
    echo Chay demo that bai. Xem loi phia tren va huong dan data_demo\README.md.
)
if "%~1"=="" pause
exit /b %CLINIC_DEMO_RESULT%
