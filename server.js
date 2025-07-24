// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios'); // For making HTTP requests to the Colab backend

// Set the path to the ffmpeg binaries (important for Vercel or other environments)
// You might need to install 'ffmpeg-static' for this to work in production
// For local development, ensure ffmpeg is in your system's PATH
// If using 'ffmpeg-static', you can set:
// ffmpeg.setFfmpegPath(require('ffmpeg-static'));

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all origins (adjust for production if needed)
app.use(cors());
app.use(express.json()); // For parsing JSON request bodies

// Define upload and output folders
const UPLOAD_FOLDER = path.join(__dirname, 'uploads');
const OUTPUT_FOLDER = path.join(__dirname, 'output');

// Ensure directories exist
fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_FOLDER);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// List of common audio and video file extensions
const allowedExtensions = [
    '.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.mpg', '.mpeg', '.3gp',
    '.mp3', '.wav', '.aac', '.flac', '.ogg', '.wma', '.m4a', '.aiff',
];

// Helper function to determine if a file is a video based on its extension
function isVideoFile(filename) {
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.mpg', '.mpeg', '.3gp'];
    const ext = path.extname(filename).toLowerCase();
    return videoExtensions.includes(ext);
}

// Function to convert a video file to an MP3 audio file
function convertVideoToMp3(videoPath, outputDir, fileNameWithoutExt) {
    return new Promise((resolve, reject) => {
        const mp3Path = path.join(outputDir, `${fileNameWithoutExt}.mp3`);
        ffmpeg(videoPath)
            .noVideo() // Extract only audio
            .audioCodec('libmp3lame') // Specify MP3 codec
            .on('end', () => {
                console.log(`Converted video to MP3: ${mp3Path}`);
                resolve(mp3Path);
            })
            .on('error', (err) => {
                console.error(`Error converting video to MP3: ${err.message}`);
                reject(err);
            })
            .save(mp3Path);
    });
}

// Route for the main web page
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle audio/video file uploads and processing
app.post('/process_audio', upload.single('audioFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audioFile part in the request' });
    }

    const { modelName, language } = req.body;
    const originalFilename = req.file.originalname;
    const savePath = req.file.path; // Path where multer saved the file
    const fileBaseName = path.parse(originalFilename).name;

    if (!modelName || !language) {
        // Clean up the uploaded file if parameters are missing
        fs.unlinkSync(savePath);
        return res.status(400).json({ error: 'Missing model name or language' });
    }

    let audioForTranscriptionPath = savePath;
    let tempMp3Path = null;

    try {
        // Check if the uploaded file is a video and convert it to MP3 if necessary
        if (isVideoFile(originalFilename)) {
            const tempAudioOutputDir = path.join(UPLOAD_FOLDER, "temp_converted_audio");
            fs.mkdirSync(tempAudioOutputDir, { recursive: true });
            tempMp3Path = await convertVideoToMp3(savePath, tempAudioOutputDir, fileBaseName);
            audioForTranscriptionPath = tempMp3Path;
        }

        // --- Send audio file to Colab backend for transcription ---
        // IMPORTANT: Replace process.env.COLAB_API_URL with your actual Colab API URL
        // Make sure your Colab API is publicly accessible (e.g., via ngrok)
        const colabApiUrl = process.env.COLAB_API_URL;
        if (!colabApiUrl) {
            throw new Error('COLAB_API_URL environment variable is not set. Cannot connect to Whisper backend.');
        }

        const formData = new FormData();
        formData.append('audioFile', fs.createReadStream(audioForTranscriptionPath), path.basename(audioForTranscriptionPath));
        formData.append('modelName', modelName);
        formData.append('language', language);

        console.log(`Sending file to Colab backend: ${audioForTranscriptionPath}`);
        const colabResponse = await axios.post(colabApiUrl, formData, {
            headers: {
                ...formData.getHeaders(), // Important for multipart/form-data
            },
            maxBodyLength: Infinity, // Allow large file uploads
            maxContentLength: Infinity,
        });

        const srtContent = colabResponse.data.srtContent; // Assuming Colab returns SRT content directly
        if (!srtContent) {
            throw new Error('Colab backend did not return SRT content.');
        }

        // Save the received SRT content to a file
        const subtitleFolder = path.join(OUTPUT_FOLDER, fileBaseName);
        fs.mkdirSync(subtitleFolder, { recursive: true });
        const srtFilePath = path.join(subtitleFolder, `${fileBaseName}.srt`);
        fs.writeFileSync(srtFilePath, srtContent, 'utf-8');

        // Clean up temporary files
        if (tempMp3Path && fs.existsSync(tempMp3Path)) {
            fs.unlinkSync(tempMp3Path);
            // Optionally remove the temp_converted_audio directory if empty
            if (!fs.readdirSync(path.dirname(tempMp3Path)).length) {
                fs.rmdirSync(path.dirname(tempMp3Path));
            }
            console.log(`Cleaned up temporary MP3: ${tempMp3Path}`);
        }
        if (fs.existsSync(savePath)) {
            fs.unlinkSync(savePath);
            console.log(`Cleaned up original uploaded file: ${savePath}`);
        }

        const relativeSrtPath = path.relative(OUTPUT_FOLDER, srtFilePath).replace(/\\/g, '/');

        return res.status(200).json({
            message: 'File processed successfully',
            downloadPath: `/download_file/${relativeSrtPath}`
        });

    } catch (error) {
        console.error('Error during processing:', error.message);
        console.error(error.stack);

        // Attempt to clean up files in case of error
        if (tempMp3Path && fs.existsSync(tempMp3Path)) {
            fs.unlinkSync(tempMp3Path);
            if (!fs.readdirSync(path.dirname(tempMp3Path)).length) {
                fs.rmdirSync(path.dirname(tempMp3Path));
            }
        }
        if (fs.existsSync(savePath)) {
            fs.unlinkSync(savePath);
        }

        return res.status(500).json({ error: error.message });
    }
});

// Route to serve the generated SRT file for download
app.get('/download_file/:folder/:filename', (req, res) => {
    const { folder, filename } = req.params;
    const filePath = path.join(OUTPUT_FOLDER, folder, filename);

    if (fs.existsSync(filePath)) {
        return res.download(filePath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ error: 'Error downloading file.' });
            } else {
                console.log(`File downloaded: ${filePath}`);
                // Optional: Clean up the downloaded file and its folder after download
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting file after download:', unlinkErr);
                    else {
                        console.log(`Deleted file: ${filePath}`);
                        // Check if the folder is empty and delete it
                        fs.readdir(path.dirname(filePath), (readDirErr, files) => {
                            if (readDirErr) console.error('Error reading directory:', readDirErr);
                            else if (files.length === 0) {
                                fs.rmdir(path.dirname(filePath), (rmdirErr) => {
                                    if (rmdirErr) console.error('Error deleting directory:', rmdirErr);
                                    else console.log(`Deleted empty directory: ${path.dirname(filePath)}`);
                                });
                            }
                        });
                    }
                });
            }
        });
    } else {
        return res.status(404).json({ error: 'File not found.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
