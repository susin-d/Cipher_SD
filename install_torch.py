import subprocess
import sys

def has_gpu():
    try:
        # Check if 'nvidia-smi' command is available (works on systems with NVIDIA GPUs)
        result = subprocess.run(['nvidia-smi'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return result.returncode == 0
    except Exception:
        return False

if has_gpu():
    subprocess.check_call([sys.executable, "-m", "pip", "install", "torch", "torchvision", "torchaudio", "--index-url", "https://download.pytorch.org/whl/cu121"])
    print("Installed PyTorch GPU version")
else:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "torch", "torchvision", "torchaudio"])
    print("Installed PyTorch CPU version")
