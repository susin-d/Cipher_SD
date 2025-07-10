import os
import whisper
from datetime import timedelta
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import traceback
from moviepy import VideoFileClip
import shutil
import webbrowser
from threading import Timer

os.environ["XDG_CACHE_HOME"] = r".cache/"

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = Path('uploads')
OUTPUT_FOLDER = Path('output')
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

allowedExtensions = [
    '.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.mpg', '.mpeg', '.3gp',
    '.mp3', '.wav', '.aac', '.flac', '.ogg', '.wma', '.m4a', '.aiff',
]

def is_video_file(filename):
    video_extensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.mpg', '.mpeg', '.3gp']
    ext = os.path.splitext(filename)[1].lower()
    return ext in video_extensions

def convert_video_to_mp3(video_path, output_dir):
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        file_name_without_ext = os.path.splitext(os.path.basename(video_path))[0]
        mp3_path = output_dir / f"{file_name_without_ext}.mp3"
        video_clip = VideoFileClip(str(video_path))
        audio_clip = video_clip.audio
        audio_clip.write_audiofile(str(mp3_path))
        audio_clip.close()
        video_clip.close()
        return mp3_path
    except Exception as e:
        print(f"Error converting video to MP3: {e}")
        raise

def load_model(model_name):
    model = whisper.load_model(model_name)
    print(f"Whisper model '{model_name}' loaded successfully.")
    return model

def audio_to_subtitle(model, audio_input_path):
    result = model.transcribe(str(audio_input_path))
    return result

def format_timestamp(seconds):
    td = timedelta(seconds=seconds)
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds_part = total_seconds % 60
    milliseconds = int((seconds - total_seconds) * 1000)
    return f"{hours:02}:{minutes:02}:{seconds_part:02},{milliseconds:03}"

def subtitle_to_folder(result, file_name):
    subtitle_folder = OUTPUT_FOLDER / file_name
    subtitle_folder.mkdir(parents=True, exist_ok=True)
    srt_file_path = subtitle_folder / f"{file_name}.srt"

    if "segments" in result and result["segments"]:
        with open(srt_file_path, "w", encoding="utf-8") as f:
            for i, segment in enumerate(result["segments"]):
                start_time = format_timestamp(segment["start"])
                end_time = format_timestamp(segment["end"])
                text = segment["text"].strip()
                f.write(f"{i + 1}\n{start_time} --> {end_time}\n{text}\n\n")
        return str(srt_file_path)
    else:
        raise Exception("No transcription segments found.")

def main(model, audio_input_path, file_name):
    vocals_path = audio_input_path
    subtitle_result = audio_to_subtitle(model, vocals_path)
    srt_path = subtitle_to_folder(subtitle_result, file_name)
    return srt_path

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process_audio', methods=['POST'])
def process_audio():
    if 'audioFile' not in request.files:
        return jsonify({'error': 'No audioFile part in the request'}), 400

    audio_file = request.files['audioFile']
    model_name = request.form.get('modelName')

    if audio_file.filename == '' or not model_name:
        return jsonify({'error': 'Missing file or model'}), 400

    file_name = os.path.splitext(audio_file.filename)[0]
    original_filename = audio_file.filename

    save_path = UPLOAD_FOLDER / original_filename
    save_path.parent.mkdir(parents=True, exist_ok=True)
    audio_file.save(save_path)

    audio_for_transcription_path = save_path
    temp_mp3_path = None

    if is_video_file(original_filename):
        try:
            temp_audio_output_dir = UPLOAD_FOLDER / "temp_converted_audio"
            temp_mp3_path = convert_video_to_mp3(save_path, temp_audio_output_dir)
            audio_for_transcription_path = temp_mp3_path
        except Exception as e:
            traceback.print_exc()
            return jsonify({'error': f'Failed to convert video to audio: {str(e)}'}), 500

    model = load_model(model_name)

    try:
        srt_path = main(model, audio_for_transcription_path, file_name)
        relative_srt = os.path.relpath(srt_path, OUTPUT_FOLDER)

        if temp_mp3_path and temp_mp3_path.exists():
            os.remove(temp_mp3_path)
            if not any(temp_mp3_path.parent.iterdir()):
                shutil.rmtree(temp_mp3_path.parent)

        if save_path.exists():
            os.remove(save_path)
            if not any(save_path.parent.iterdir()):
                shutil.rmtree(save_path.parent)

        return jsonify({
            'message': 'File processed successfully',
            'downloadPath': relative_srt.replace('\\', '/')
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/download_file/<path:filename>', methods=['GET'])
def download_file(filename):
    try:
        directory = os.path.join(OUTPUT_FOLDER, os.path.dirname(filename))
        file_only = os.path.basename(filename)
        return send_from_directory(directory, file_only, as_attachment=True)
    except FileNotFoundError:
        return jsonify({'error': 'File not found.'}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    """
    Timer(1.5, lambda: webbrowser.open('http://127.0.0.1:5000/')).start()
    """
    app.run(debug=True, port=5000)
