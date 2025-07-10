import os
import whisper
from audio_separator.separator import Separator
from datetime import timedelta
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask import Flask, render_template
os.environ["XDG_CACHE_HOME"] = r".cache/"
def load_model(model_name):
    model = whisper.load_model(model_name)
    print(f"Whisper model '{model_name}' loaded successfully.")
    return model
def audio_separator(audio_input_path, audio_output_path):
    audio_input_path = str(audio_input_path)  
    audio_output_path = str(audio_output_path)  
    separator = Separator(
        output_dir=audio_output_path,
        output_single_stem='vocals'
    )
    separator.load_model(model_filename="htdemucs_ft.yaml")
    output_names = {
        "Vocals": f"{audio_input_path}", 
    }
    output_files = separator.separate(audio_input_path, output_names)
    print(f"Audio separation completed. Output files: {output_files}")
    return output_files[0]
def audio_to_subtitle(model,audio_input_path):
    result = model.transcribe(audio_input_path)
    print(f"Transcription completed for {audio_input_path}. Result: {result}")
    return result
def format_timestamp(seconds):
    td = timedelta(seconds=seconds)
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds_part = total_seconds % 60
    milliseconds = int((seconds - total_seconds) * 1000)
    return f"{hours:02}:{minutes:02}:{seconds_part:02},{milliseconds:03}"
def subtitle_to_folder(result, base_output_path):
    output_dir = os.path.dirname(base_output_path)
    base_filename = os.path.basename(base_output_path)
    subtitle_folder_name = f"{base_filename}"
    full_output_directory = os.path.join(output_dir, subtitle_folder_name)
    if not os.path.exists(full_output_directory):
        os.makedirs(full_output_directory)
    if "segments" in result and result["segments"]:
        srt_file_path = os.path.join(full_output_directory, f"{base_filename}.srt")
        try:
            with open(srt_file_path, "w", encoding="utf-8") as f:
                for i, segment in enumerate(result["segments"]):
                    start_time = format_timestamp(segment["start"])
                    end_time = format_timestamp(segment["end"])
                    text = segment["text"].strip() 

                    f.write(f"{i + 1}\n") 
                    f.write(f"{start_time} --> {end_time}\n") 
                    f.write(f"{text}\n\n")
            print("subtitle written to file:", srt_file_path)
        except Exception as e:
            print(f"Error saving SRT subtitles: {e}")
    else:
        print("No 'segments' found in the result, skipping SRT file generation.")
def main(model,audio_input_path, audio_output_path,subtitle_output_path):
    audio_output_files = audio_separator(audio_input_path, audio_output_path)
    Vocals_path =f"output/{audio_output_files}"
    print(f"Vocals output path: {Vocals_path}")
    subtitle_result = audio_to_subtitle(model,Vocals_path)
    subtitle_to_folder(subtitle_result, subtitle_output_path)
app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
@app.route('/')
def index():
    return render_template('index.html')  # Must match file name exactly

@app.route('/process_audio', methods=['POST'])
def process_audio():
    if 'audioFile' not in request.files:
        return jsonify({'error': 'No audioFile part in the request'}), 400

    audio_file = request.files['audioFile']
    model_name = request.form.get('modelName')
    relative_path = request.form.get('relativePath', audio_file.filename)

    if audio_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not model_name:
        return jsonify({'error': 'No modelName provided'}), 400

    model = load_model(model_name)

    save_path = UPLOAD_FOLDER / relative_path
    save_path.parent.mkdir(parents=True, exist_ok=True)  # Ensure subfolders exist if any
    audio_file.save(save_path)

    print(f"Received audio file: {audio_file.filename}")
    print(f"Saved to: {save_path}")
    print(f"Relative path: {relative_path}")
    audio_output_path = r"output/"
    subtitle_output_path = rf"output/{audio_file.filename}"
    main(model,save_path, audio_output_path,subtitle_output_path)
    # Example response (modify as per your actual processing)
    return jsonify({
        'message': 'File processed successfully',
    }), 200
@app.route('/download_file/<filename>', methods=['GET'])
def download_file(srt_file_path):
    """
    Endpoint to serve the processed SRT files for download.
    """
    try:
        print(f"Attempting to send file: {srt_file_path} from {DOWNLOAD_FOLDER}")
        return send_from_directory(DOWNLOAD_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({'error': 'File not found.'}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'Error serving file: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True,port=5000)
