@echo off
setlocal
set "LOADER=%~dp0load_local_demo.py"

if not exist "%LOADER%" (
    echo Khong tim thay trinh nap. Mo file nay trong thu muc demo cua du an.
    set "RESULT=1"
    goto finish
)

where.exe /q python.exe
if errorlevel 1 (
    echo Can cai Python 3.10 tro len va them python.exe vao PATH.
    set "RESULT=1"
    goto finish
)

python.exe -B "%LOADER%" --apply %*
set "RESULT=%ERRORLEVEL%"

:finish
echo.
if "%RESULT%"=="0" (
    if "%~1"=="" echo Nap xong. Mo http://localhost:5173/ de xem du lieu demo.
) else (
    echo Nap du lieu that bai. Xem loi phia tren va huong dan README.md.
)
if "%~1"=="" pause
exit /b %RESULT%
