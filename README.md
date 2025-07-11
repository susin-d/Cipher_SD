## Whisper ASR

This is a Flask-based web application that leverages OpenAI's Whisper model to transcribe audio and video files into SRT (SubRip Subtitle) format. It supports various audio and video file types and allows users to specify the Whisper model and target language for transcription.

## Setup
To install the package to the latest version of this repository, please run:

    pip install git+https://github.com/susin-d/whisper-ASR.git 

Now run the webui.bat file and wait for all dependencies to be installed 

## Available models and languages

![Image of webui](path/to/your/image.png)

There are six model sizes offering speed and accuracy tradeoffs.
Below are the names of the available models and their approximate memory requirements and inference speed relative to the large model.
The relative speeds below are measured by transcribing English speech on a A100, and the real-world speed may vary significantly depending on many factors including the language, the speaking speed, and the available hardware.

|  Size  | Parameters | Multilingual model | Required VRAM | Relative speed |
|:------:|:----------:|:------------------:|:-------------:|:--------------:|
|  tiny  |    39 M    |       `tiny`       |     ~1 GB     |      ~10x      |
|  base  |    74 M    |       `base`       |     ~1 GB     |      ~7x       |
| small  |   244 M    |      `small`       |     ~2 GB     |      ~4x       |
| medium |   769 M    |      `medium`      |     ~5 GB     |      ~2x       |
| large  |   1550 M   |      `large`       |    ~10 GB     |       1x       |
| turbo  |   809 M    |     `turbo`        |     ~6 GB     |      ~8x       |

