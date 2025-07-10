@echo off
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
python install_torch.py
python -m pip install -r requirements.txt
start http://127.0.0.1:5000/
python main.py
pause
