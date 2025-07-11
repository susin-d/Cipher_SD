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

// New language selection elements
const languageDropdownButton = document.getElementById('languageDropdownButton');
const selectedLanguageText = document.getElementById('selectedLanguageText');
const languageDropdownList = document.getElementById('languageDropdownList');
const selectedLanguageInput = document.getElementById('selectedLanguage');
const languageDisplay = document.getElementById('languageDisplay'); // Still used for italic display below dropdown

const whisperModels = ['tiny', 'base', 'small', 'medium', 'large', 'turbo'];
let activeModelButton = null;
let loadingInterval;
let selectedFiles = [];
let processedResults = [];
const supportedLanguages = [    
    { name: 'English', code: 'en' },
    { name: 'Afrikaans', code: 'af' },
    { name: 'Albanian', code: 'sq' },
    { name: 'Amharic', code: 'am' },
    { name: 'Arabic', code: 'ar' },
    { name: 'Armenian', code: 'hy' },
    { name: 'Azerbaijani', code: 'az' },
    { name: 'Basque', code: 'eu' },
    { name: 'Bengali', code: 'bn' },
    { name: 'Bulgarian', code: 'bg' },
    { name: 'Burmese', code: 'my' },
    { name: 'Catalan', code: 'ca' },
    { name: 'Chinese', code: 'zh' },
    { name: 'Croatian', code: 'hr' },
    { name: 'Czech', code: 'cs' },
    { name: 'Danish', code: 'da' },
    { name: 'Dutch', code: 'nl' },
    { name: 'Estonian', code: 'et' },
    { name: 'Filipino', code: 'fil' },
    { name: 'Finnish', code: 'fi' },
    { name: 'French', code: 'fr' },
    { name: 'Galician', code: 'gl' },
    { name: 'Georgian', code: 'ka' },
    { name: 'German', code: 'de' },
    { name: 'Greek', code: 'el' },
    { name: 'Hausa', code: 'ha' },
    { name: 'Hawaiian', code: 'haw' },
    { name: 'Hebrew', code: 'he' },
    { name: 'Hindi', code: 'hi' },
    { name: 'Hungarian', code: 'hu' },
    { name: 'Icelandic', code: 'is' },
    { name: 'Igbo', code: 'ig' },
    { name: 'Indonesian', code: 'id' },
    { name: 'Irish', code: 'ga' },
    { name: 'Italian', code: 'it' },
    { name: 'Japanese', code: 'ja' },
    { name: 'Kannada', code: 'kn' },
    { name: 'Kazakh', code: 'kk' },
    { name: 'Khmer', code: 'km' },
    { name: 'Korean', code: 'ko' },
    { name: 'Kyrgyz', code: 'ky' },
    { name: 'Lao', code: 'lo' },
    { name: 'Latvian', code: 'lv' },
    { name: 'Lithuanian', code: 'lt' },
    { name: 'Luxembourgish', code: 'lb' },
    { name: 'Macedonian', code: 'mk' },
    { name: 'Malagasy', code: 'mg' },
    { name: 'Malay', code: 'ms' },
    { name: 'Malayalam', code: 'ml' },
    { name: 'Maltese', code: 'mt' },
    { name: 'Maori', code: 'mi' },
    { name: 'Marathi', code: 'mr' },
    { name: 'Mongolian', code: 'mn' },
    { name: 'Nepali', code: 'ne' },
    { name: 'Norwegian', code: 'no' },
    { name: 'Polish', code: 'pl' },
    { name: 'Portuguese', code: 'pt' },
    { name: 'Romanian', code: 'ro' },
    { name: 'Russian', code: 'ru' },
    { name: 'Samoan', code: 'sm' },
    { name: 'Serbian', code: 'sr' },
    { name: 'Sinhala', code: 'si' },
    { name: 'Slovak', code: 'sk' },
    { name: 'Slovenian', code: 'sl' },
    { name: 'Somali', code: 'so' },
    { name: 'Spanish', code: 'es' },
    { name: 'Swahili', code: 'sw' },
    { name: 'Swedish', code: 'sv' },
    { name: 'Tamil', code: 'ta' },
    { name: 'Telugu', code: 'te' },
    { name: 'Thai', code: 'th' },
    { name: 'Tongan', code: 'to' },
    { name: 'Turkish', code: 'tr' },
    { name: 'Turkmen', code: 'tk' },
    { name: 'Ukrainian', code: 'uk' },
    { name: 'Urdu', code: 'ur' }, // Optional: Add if you support Urdu
    { name: 'Uzbek', code: 'uz' },
    { name: 'Vietnamese', code: 'vi' },
    { name: 'Welsh', code: 'cy' },
    { name: 'Xhosa', code: 'xh' },
    { name: 'Yoruba', code: 'yo' },
    { name: 'Zulu', code: 'zu' }
];


let currentSelectedLanguage = ''; // Tracks the code of the currently selected language

function createModelButtons() {
    whisperModels.forEach(model => {
        const button = document.createElement('button');
        button.textContent = model.charAt(0).toUpperCase() + model.slice(1);
        button.classList.add('model-button'); // Tailwind classes are in CSS
        button.dataset.model = model;

        button.addEventListener('click', () => {
            if (activeModelButton) {
                activeModelButton.classList.remove('active');
            }
            button.classList.add('active');
            activeModelButton = button;

            selectedModelInput.value = model;
            modelDisplay.textContent = `Selected Model: ${model.charAt(0).toUpperCase() + model.slice(1)}`;
            checkAndEnableProcessButton();
        });
        modelSelectionDiv.appendChild(button);
    });

    if (whisperModels.length > 0) {
        modelSelectionDiv.firstElementChild.click();
    }
}

function createLanguageDropdownList() {
    console.log('Creating language dropdown list...');
    languageDropdownList.innerHTML = ''; // Clear previous items
    supportedLanguages.forEach(lang => {
        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add('language-item-button'); // Tailwind classes are in CSS
        button.textContent = lang.name;
        button.dataset.languageCode = lang.code;

        button.addEventListener('click', (event) => { // Added 'event' parameter
            event.stopPropagation(); // Stop propagation to prevent document click from interfering
            console.log(`Language item clicked: ${lang.name} (${lang.code})`);
            currentSelectedLanguage = lang.code;
            selectedLanguageInput.value = lang.code;
            selectedLanguageText.textContent = lang.name; // Update the main button's text
            languageDisplay.textContent = `Selected Language: ${lang.name}`; // Update the italic display
            languageDropdownList.classList.add('hidden'); // Hide the dropdown immediately after selection

            // Update active style for the selected item in the dropdown
            Array.from(languageDropdownList.children).forEach(item => {
                item.classList.remove('active');
            });
            button.classList.add('active');

            checkAndEnableProcessButton();
        });
        languageDropdownList.appendChild(button);
    });

    // Automatically select English as default if no language is selected
    if (!currentSelectedLanguage && supportedLanguages.length > 0) {
        const englishButton = Array.from(languageDropdownList.children).find(btn => btn.dataset.languageCode === 'en');
        if (englishButton) {
            englishButton.click(); // Simulate click to set default and update UI
            console.log('Default language set to English.');
        }
    }
    console.log('Language dropdown list created.');
}

// Toggle language dropdown visibility
languageDropdownButton.addEventListener('click', (event) => { // Added 'event' parameter
    event.stopPropagation(); // Stop propagation to prevent document click from interfering
    console.log('Language dropdown button clicked!'); // Added for debugging
    console.log('Current languageDropdownList classes before toggle:', languageDropdownList.classList);
    languageDropdownList.classList.toggle('hidden');
    console.log('Current languageDropdownList classes after toggle:', languageDropdownList.classList);
});

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    // Check if the click was outside the dropdown list AND outside the dropdown button
    if (!languageDropdownList.contains(event.target) && !languageDropdownButton.contains(event.target)) {
        if (!languageDropdownList.classList.contains('hidden')) { // Only hide if it's currently visible
            languageDropdownList.classList.add('hidden');
            console.log('Clicked outside, hiding dropdown.');
        }
    }
});


function setButtonToProcessState() {
    processButton.removeEventListener('click', handleDownloadClick);
    processButton.addEventListener('click', handleProcessClick);
    processButton.textContent = 'Process File(s)';
    checkAndEnableProcessButton();
}

function setButtonToDownloadState() {
    processButton.removeEventListener('click', handleProcessClick);
    processButton.addEventListener('click', handleDownloadClick);

    if (processedResults.length === 1) {
        processButton.textContent = 'Download Subtitle';
    } else if (processedResults.length > 1) {
        processButton.textContent = 'Download All Subtitles';
    }
    processButton.disabled = false;
}

function checkAndEnableProcessButton() {
    const fileSelected = (fileInputFiles.files.length > 0 || fileInputFolder.files.length > 0);
    const modelSelected = selectedModelInput.value !== '';
    const languageSelected = selectedLanguageInput.value !== '';

    if (fileSelected && modelSelected && languageSelected) {
        processButton.disabled = false;
    } else {
        processButton.disabled = true;
    }
}

async function handleProcessClick() {
    const selectedModel = selectedModelInput.value;
    const selectedLanguage = selectedLanguageInput.value;

    if (selectedFiles.length === 0) {
        messageArea.textContent = 'No file(s) to process. Please select one or more first.';
        return;
    }
    if (!selectedModel) {
        messageArea.textContent = 'Please select a Whisper model.';
        return;
    }
    if (!selectedLanguage) {
        messageArea.textContent = 'Please select a language.';
        return;
    }

    processButton.classList.add('hidden');
    loadingBarContainer.classList.remove('hidden');
    loadingMessage.classList.remove('hidden');
    downloadLinksContainer.classList.add('hidden');
    downloadLinksList.innerHTML = '';
    processedResults = [];

    messageArea.textContent = `Starting processing for ${selectedFiles.length} file(s) with model "${selectedModel}" and language "${supportedLanguages.find(l => l.code === selectedLanguage)?.name || selectedLanguage}"...`;

    let progress = 0;
    loadingBarFill.style.width = '0%';
    loadingInterval = setInterval(() => {
        progress += 1;
        if (progress <= 95) {
            loadingBarFill.style.width = `${progress}%`;
        }
    }, 100);

    let filesProcessedCount = 0;

    for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('audioFile', file);
        formData.append('modelName', selectedModel);
        formData.append('language', selectedLanguage);

        if (file.webkitRelativePath) {
            formData.append('relativePath', file.webkitRelativePath);
        } else {
            formData.append('relativePath', file.name);
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
                    originalFileName: file.name,
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
                setButtonToProcessState();
                return;
            }
        } catch (error) {
            clearInterval(loadingInterval);
            loadingBarFill.style.width = '0%';
            messageArea.textContent = `Network error for ${file.name}: ${error.message}. Ensure backend is running on http://127.0.0.1:5000`;
            console.error(`Fetch error for ${file.name}:`, error);
            processButton.classList.remove('hidden');
            loadingBarContainer.classList.add('hidden');
            loadingMessage.classList.add('hidden');
            setButtonToProcessState();
            return;
        }
        filesProcessedCount++;
    }

    clearInterval(loadingInterval);
    loadingBarFill.style.width = '100%';
    loadingMessage.classList.add('hidden');
    loadingBarContainer.classList.add('hidden');

    messageArea.textContent = `Successfully processed ${processedResults.length} file(s)!`;

    setButtonToDownloadState();
    processButton.classList.remove('hidden');
}

function handleDownloadClick() {
    if (processedResults.length === 1) {
        if (processedResults[0] && processedResults[0].downloadPath) {
            window.open(`http://127.0.0.1:5000/download_file/${processedResults[0].downloadPath}`, '_blank');
        }
    } else if (processedResults.length > 1) {
        processedResults.forEach(res => {
            if (res.downloadPath) {
                const link = document.createElement('a');
                link.href = `http://127.0.0.1:5000/download_file/${res.downloadPath}`;
                link.download = res.downloadPath.split('/').pop();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
        messageArea.textContent = 'Initiating downloads for all files...';
    }

    setButtonToProcessState();
    downloadLinksContainer.classList.add('hidden');
    downloadLinksList.innerHTML = '';
    processedResults = [];
    selectedFiles = [];
    fileNameDisplay.textContent = 'No file(s) selected.';

    fileInputFiles.value = '';
    fileInputFolder.value = '';
}

function updateFileSelectionUI() {
    setButtonToProcessState();

    if (selectedFiles.length > 0) {
        const totalSizeMB = selectedFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
        fileNameDisplay.textContent = `Selected ${selectedFiles.length} file(s) (Total: ${totalSizeMB.toFixed(2)} MB)`;
        messageArea.textContent = '';
        downloadLinksContainer.classList.add('hidden');
        downloadLinksList.innerHTML = '';
    } else {
        fileNameDisplay.textContent = 'No file(s) selected.';
        messageArea.textContent = 'Please select file(s) or a folder.';
        downloadLinksContainer.classList.add('hidden');
        downloadLinksList.innerHTML = '';
    }
}

function processFileList(files) {
    selectedFiles = [];
    processedResults = [];
    if (files.length > 0) {
        const allowedExtensions = [
            '.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.mpg', '.mpeg', '.3gp',
            '.mp3', '.wav', '.aac', '.flac', '.ogg', '.wma', '.m4a', '.aiff',
        ];
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
    updateFileSelectionUI();
    checkAndEnableProcessButton();
}

fileInputFiles.addEventListener('change', (event) => {
    processFileList(event.target.files);
});

fileInputFolder.addEventListener('change', (event) => {
    processFileList(event.target.files);
});

const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');
let animationFrameId;

function resizeCanvas() {
    canvas.width = Math.max(1, window.innerWidth);
    canvas.height = Math.max(1, window.innerHeight);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let waveOffset = 0;

function drawWave() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    const waveSpeedFactor = 0.05;
    const horizontalOffset = (waveOffset * waveSpeedFactor) % canvas.width;
    ctx.translate(-horizontalOffset, 0);

    const baseAmplitude = 50;
    const finalAmplitude = baseAmplitude;
    const dynamicFrequency = 0.01;
    const numWaves = 3;

    // Changed to light spectrum colors
    const waveColors = [
        'rgba(255, 102, 102, 1.0)', // Light Red
        'rgba(255, 178, 102, 1.0)', // Light Orange
        'rgba(255, 255, 102, 1.0)', // Light Yellow
        'rgba(178, 255, 102, 1.0)', // Light Green-Yellow
        'rgba(102, 255, 102, 1.0)', // Light Green
        'rgba(102, 255, 178, 1.0)', // Light Blue-Green
        'rgba(102, 255, 255, 1.0)', // Light Cyan
        'rgba(102, 178, 255, 1.0)', // Light Blue
        'rgba(102, 102, 255, 1.0)', // Light Blue-Violet
        'rgba(178, 102, 255, 1.0)', // Light Violet
        'rgba(255, 102, 255, 1.0)', // Light Magenta
        'rgba(255, 102, 178, 1.0)'  // Light Pink
    ];
    const numWaveColors = waveColors.length;

    for (let drawPass = 0; drawPass < 2; drawPass++) {
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
    waveOffset += 0.02;
    animationFrameId = requestAnimationFrame(drawWave);
}

document.addEventListener('DOMContentLoaded', () => {
    createModelButtons();
    createLanguageDropdownList();
    updateFileSelectionUI();
    drawWave();
    checkAndEnableProcessButton();
});
