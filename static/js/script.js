const fileInputFiles = document.getElementById('fileInputFiles');
const fileInputFolder = document.getElementById('fileInputFolder');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const processButton = document.getElementById('processButton');
const messageArea = document.getElementById('messageArea');
const modelSelectionDiv = document.getElementById('modelSelection');
const selectedModelInput = document.getElementById('selectedModel');
const modelDisplay = document.getElementById('modelDisplay');
const loadingBarContainer = document.getElementById('loadingBarContainer');
const loadingBarFill = document.getElementById('loadingBarFill');
const loadingMessage = document.getElementById('loadingMessage');
const downloadLinksContainer = document.getElementById('downloadLinksContainer');
const downloadLinksList = document.getElementById('downloadLinksList');

const whisperModels = ['tiny', 'base', 'small', 'medium', 'large', 'turbo'];
let activeModelButton = null; // To keep track of the currently active button
let loadingInterval; // To control the simulated loading bar animation
let selectedFiles = []; // Array to store files selected for processing
let processedResults = []; // Array to store results for download

// Function to create and append model buttons
function createModelButtons() {
    whisperModels.forEach(model => {
        const button = document.createElement('button');
        button.textContent = model.charAt(0).toUpperCase() + model.slice(1); // Capitalize first letter
        button.classList.add('model-button');
        button.dataset.model = model; // Store the model name in a data attribute

        button.addEventListener('click', () => {
            // Remove active class from previous button
            if (activeModelButton) {
                activeModelButton.classList.remove('active');
            }
            // Add active class to clicked button
            button.classList.add('active');
            activeModelButton = button;

            selectedModelInput.value = model; // Update hidden input
            modelDisplay.textContent = `Selected Model: ${model.charAt(0).toUpperCase() + model.slice(1)}`;
            console.log('Selected Whisper Model:', model);
        });
        modelSelectionDiv.appendChild(button);
    });

    // Automatically select the first model on load
    if (whisperModels.length > 0) {
        modelSelectionDiv.firstElementChild.click();
    }
}

// --- Button State Management Functions ---
// These functions manage which event listener is active on the processButton

function setButtonToProcessState() {
    // Remove any existing download listener
    processButton.removeEventListener('click', handleDownloadClick);
    // Add the processing listener (ensures it's not added multiple times)
    processButton.addEventListener('click', handleProcessClick);
    processButton.textContent = 'Process File(s)';
    processButton.disabled = selectedFiles.length === 0; // Disable if no files selected
}

function setButtonToDownloadState() {
    // Remove the processing listener
    processButton.removeEventListener('click', handleProcessClick);
    // Add the download listener
    processButton.addEventListener('click', handleDownloadClick);

    if (processedResults.length === 1) {
        processButton.textContent = 'Download Subtitle';
    } else if (processedResults.length > 1) {
        processButton.textContent = 'Download All Subtitles';
    }
    processButton.disabled = false; // Always enable download button after processing
}

// --- Main Event Handlers for the Process/Download Button ---

async function handleProcessClick() {
    const selectedModel = selectedModelInput.value;

    if (selectedFiles.length === 0) {
        messageArea.textContent = 'No file(s) to process. Please select one or more first.';
        return;
    }
    if (!selectedModel) {
        messageArea.textContent = 'Please select a Whisper model.';
        return;
    }

    // Hide button, show loading bar
    processButton.classList.add('hidden');
    loadingBarContainer.classList.remove('hidden');
    loadingMessage.classList.remove('hidden');
    downloadLinksContainer.classList.add('hidden'); // Ensure download container is hidden
    downloadLinksList.innerHTML = ''; // Clear previous download links
    processedResults = []; // Clear previous results for a new run

    messageArea.textContent = `Starting processing for ${selectedFiles.length} file(s) with model "${selectedModel}"...`;

    // Simulate loading progress
    let progress = 0;
    loadingBarFill.style.width = '0%';
    loadingInterval = setInterval(() => {
        progress += 1;
        if (progress <= 95) { // Cap simulated progress before actual completion
            loadingBarFill.style.width = `${progress}%`;
        }
    }, 100); // Update every 100ms for a smoother simulation

    let filesProcessedCount = 0;

    for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('audioFile', file);
        formData.append('modelName', selectedModel);
        // Include relative path if it's a folder upload
        if (file.webkitRelativePath) {
            formData.append('relativePath', file.webkitRelativePath);
        } else {
            formData.append('relativePath', file.name); // For single file, use just the name
        }

        messageArea.textContent = `Processing file ${filesProcessedCount + 1} of ${selectedFiles.length}: "${file.name}"...`;
        loadingBarFill.style.width = `${(filesProcessedCount / selectedFiles.length) * 100}%`;

        try {
            const response = await fetch('http://127.0.0.1:5000/process_audio', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                processedResults.push({
                    originalFileName: file.name, // Store original file name
                    downloadPath: result.downloadPath
                });
                console.log(`Processed ${file.name}:`, result);
            } else {
                messageArea.textContent = `Error processing ${file.name}: ${result.error || 'Unknown error'}`;
                console.error(`Backend error for ${file.name}:`, result);
                clearInterval(loadingInterval);
                loadingBarFill.style.width = '0%';
                processButton.classList.remove('hidden');
                loadingBarContainer.classList.add('hidden');
                loadingMessage.classList.add('hidden');
                setButtonToProcessState(); // Reset button to process state on error
                return; // Exit if an error occurs
            }
        } catch (error) {
            clearInterval(loadingInterval);
            loadingBarFill.style.width = '0%';
            messageArea.textContent = `Network error for ${file.name}: ${error.message}. Ensure backend is running on http://127.0.0.1:5000`;
            console.error(`Fetch error for ${file.name}:`, error);
            processButton.classList.remove('hidden');
            loadingBarContainer.classList.add('hidden');
            loadingMessage.classList.add('hidden');
            setButtonToProcessState(); // Reset button to process state on error
            return; // Exit if an error occurs
        }
        filesProcessedCount++;
    }

    // All files processed successfully
    clearInterval(loadingInterval); // Stop simulated loading
    loadingBarFill.style.width = '100%'; // Complete loading bar
    loadingMessage.classList.add('hidden'); // Hide loading message
    loadingBarContainer.classList.add('hidden'); // Hide loading bar

    messageArea.textContent = `Successfully processed ${processedResults.length} file(s)!`;

    // Now, transition the button to its download state
    setButtonToDownloadState();
    processButton.classList.remove('hidden'); // Show the download button
}

function handleDownloadClick() {
    if (processedResults.length === 1) {
        if (processedResults[0] && processedResults[0].downloadPath) {
            window.open(`http://127.0.0.1:5000/download_file/${processedResults[0].downloadPath}`, '_blank');
        }
    } else if (processedResults.length > 1) {
        // Trigger multiple downloads by creating and clicking temporary links
        processedResults.forEach(res => {
            if (res.downloadPath) {
                const link = document.createElement('a');
                link.href = `http://127.0.0.1:5000/download_file/${res.downloadPath}`;
                link.download = res.downloadPath.split('/').pop(); // Suggest filename for download
                document.body.appendChild(link); // Append to body to make it clickable
                link.click(); // Programmatically click the link
                document.body.removeChild(link); // Remove it after clicking
            }
        });
        messageArea.textContent = 'Initiating downloads for all files...';
    }
}

// --- File Selection and UI Update Logic ---

// Function to update the UI based on selected files
function updateFileSelectionUI() {
    // Crucial: Always reset the button to its "Process" state when file selection changes
    setButtonToProcessState();

    if (selectedFiles.length > 0) {
        const totalSizeMB = selectedFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
        fileNameDisplay.textContent = `Selected ${selectedFiles.length} file(s) (Total: ${totalSizeMB.toFixed(2)} MB)`;
        // Button enablement is handled by setButtonToProcessState
        messageArea.textContent = ''; // Clear previous messages
        downloadLinksContainer.classList.add('hidden'); // Hide download container
        downloadLinksList.innerHTML = ''; // Clear previous download links
    } else {
        fileNameDisplay.textContent = 'No file(s) selected.';
        // Button disablement is handled by setButtonToProcessState
        messageArea.textContent = 'Please select file(s) or a folder.';
        downloadLinksContainer.classList.add('hidden'); // Hide download container
        downloadLinksList.innerHTML = ''; // Clear previous download links
    }
}

// Helper function to process files from a FileList
function processFileList(files) {
    selectedFiles = []; // Reset selected files for new selection
    processedResults = []; // Clear previous processed results
    if (files.length > 0) {
        const allowedExtensions = [
    '.mp4',
    '.mkv',
    '.avi',
    '.mov',
    '.webm',
    '.flv',
    '.wmv',
    '.mpg',
    '.mpeg',
    '.3gp',
    '.mp3',
    '.wav',
    '.aac',
    '.flac',
    '.ogg',
    '.wma',
    '.m4a',
    '.aiff',
]
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = file.name;
            const fileExtension = '.' + fileName.split('.').pop().toLowerCase();

            if (allowedExtensions.includes(fileExtension)) {
                selectedFiles.push(file);
            } else {
                console.warn(`Skipping unsupported file: ${fileName}`);
            }
        }
    }
    updateFileSelectionUI(); // Update UI and button state based on new selection
}

// Event listener for individual file selection
fileInputFiles.addEventListener('change', (event) => {
    processFileList(event.target.files);
});

// Event listener for folder selection
fileInputFolder.addEventListener('change', (event) => {
    processFileList(event.target.files);
});


// --- Canvas Music Wave Animation (remains unchanged) ---
const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');
let animationFrameId;

// Function to resize canvas
function resizeCanvas() {
    canvas.width = Math.max(1, window.innerWidth);
    canvas.height = Math.max(1, window.innerHeight);
}

// Initial resize and resize on window change
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let waveOffset = 0; // To animate the wave movement

function drawWave() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas for redraw
    ctx.save(); // Save the current canvas state before applying transformations

    // The speed at which the wave and colors move horizontally
    const waveSpeedFactor = 0.05;
    const horizontalOffset = (waveOffset * waveSpeedFactor) % canvas.width;
    ctx.translate(-horizontalOffset, 0);

    const baseAmplitude = 50;
    const finalAmplitude = baseAmplitude;
    const dynamicFrequency = 0.01;
    const numWaves = 3;

    const waveColors = [
        'rgba(255, 0, 0, 1.0)', 'rgba(255, 127, 0, 1.0)', 'rgba(255, 255, 0, 1.0)',
        'rgba(0, 255, 0, 1.0)', 'rgba(0, 0, 255, 1.0)', 'rgba(75, 0, 130, 1.0)',
        'rgba(148, 0, 211, 1.0)'
    ];
    const numWaveColors = waveColors.length;

    for (let drawPass = 0; drawPass < 2; drawPass++) { // Draw twice to create seamless loop
        const currentDrawX = drawPass * canvas.width;
        const gradient = ctx.createLinearGradient(currentDrawX, 0, currentDrawX + canvas.width, 0);
        waveColors.forEach((color, index) => {
            gradient.addColorStop(index / (numWaveColors - 1), color);
        });

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;

        for (let i = 0; i < numWaves; i++) {
            ctx.beginPath();
            ctx.moveTo(currentDrawX, canvas.height / 2);
            for (let x = currentDrawX; x <= currentDrawX + canvas.width; x++) {
                const y = canvas.height / 2 +
                    finalAmplitude * Math.sin(x * dynamicFrequency + waveOffset + i * Math.PI / numWaves) +
                    (finalAmplitude / 2) * Math.sin(x * dynamicFrequency * 2 + waveOffset * 1.5 + i * Math.PI / (numWaves * 0.5));
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
    ctx.restore();
    waveOffset += 0.02; // Animate wave movement
    animationFrameId = requestAnimationFrame(drawWave);
}

// --- Initialization on page load ---
document.addEventListener('DOMContentLoaded', () => {
    createModelButtons(); // Initialize model selection buttons
    updateFileSelectionUI(); // Set initial UI state (including button)
    drawWave(); // Start background animation
});