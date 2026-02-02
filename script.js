const CLOUDFLARE_CONFIG = {
    accountId: localStorage.getItem('cf_accountId') || '',
    apiToken: localStorage.getItem('cf_apiToken') || '',
    modelId: localStorage.getItem('cf_modelId') || '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts',
    isConfigured: function () {
        return this.accountId && this.apiToken && this.modelId;
    }
};

const IMGBB_API_KEY = '37b3731b25e2d8999e45a12d76a73c9b';

// Current selections
let currentStyle = 'realistic';
let currentAspectRatio = '1:1';
let currentBatchSize = 1;
let isGenerating = false;
let totalGenerations = parseInt(localStorage.getItem('totalGenerations') || '24');
let savedImages = JSON.parse(localStorage.getItem('savedImages') || '[]');
let generationHistory = JSON.parse(localStorage.getItem('generationHistory') || '[]');

// Aspect ratio to dimensions mapping for Cloudflare API
const ASPECT_RATIO_MAP = {
    '1:1': { width: 1024, height: 1024 },
    '2:3': { width: 832, height: 1248 },
    '16:9': { width: 1216, height: 684 },
    '21:9': { width: 1344, height: 576 }
};

document.addEventListener('DOMContentLoaded', function () {
    // Load API configuration
    loadApiConfig();

    // Update UI with saved data
    updateStats();

    // Set up event listeners
    setupEventListeners();

    // Load a sample prompt
    loadTemplate('game ui concept');

    // Load saved history
    loadHistory();
});

// Load API configuration from localStorage
function loadApiConfig() {
    document.getElementById('accountId').value = CLOUDFLARE_CONFIG.accountId;
    document.getElementById('apiToken').value = CLOUDFLARE_CONFIG.apiToken;
    document.getElementById('modelSelect').value = CLOUDFLARE_CONFIG.modelId;
    document.getElementById('aiModel').value = CLOUDFLARE_CONFIG.modelId;

    updateApiStatus();
}

// Update API connection status
function updateApiStatus() {
    const statusDot = document.getElementById('apiStatus');
    const statusText = document.getElementById('apiStatusText');

    if (CLOUDFLARE_CONFIG.isConfigured()) {
        statusDot.className = 'status-dot';
        statusText.textContent = 'Connected';
        statusText.style.color = 'var(--success)';
    } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Not Configured';
        statusText.style.color = 'var(--danger)';
    }
}

// Show API configuration modal
function showApiConfig() {
    document.getElementById('apiConfigModal').style.display = 'flex';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Save API configuration
function saveApiConfig() {
    const accountId = document.getElementById('accountId').value.trim();
    const apiToken = document.getElementById('apiToken').value.trim();
    const modelId = document.getElementById('modelSelect').value;

    if (!accountId || !apiToken) {
        showToast('Please enter both Account ID and API Token', 'warning');
        return;
    }

    // Save to config object
    CLOUDFLARE_CONFIG.accountId = accountId;
    CLOUDFLARE_CONFIG.apiToken = apiToken;
    CLOUDFLARE_CONFIG.modelId = modelId;

    // Save to localStorage
    localStorage.setItem('cf_accountId', accountId);
    localStorage.setItem('cf_apiToken', apiToken);
    localStorage.setItem('cf_modelId', modelId);

    // Update UI
    document.getElementById('aiModel').value = modelId;
    updateApiStatus();

    // Close modal
    closeModal('apiConfigModal');

    // Test the connection
    testApiConnection();
}

// Test API connection
async function testApiConnection() {
    if (!CLOUDFLARE_CONFIG.isConfigured()) return;

    try {
        const response = await fetch(`${CLOUDFLARE_CONFIG.baseUrl}/${CLOUDFLARE_CONFIG.accountId}/ai/models`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showToast('Cloudflare API connection successful!', 'success');
        } else {
            showToast('Failed to connect to Cloudflare API. Please check your credentials.', 'error');
        }
    } catch (error) {
        console.error('API test error:', error);
        showToast('Error testing API connection. Please check your network.', 'error');
    }
}

// Load a template into the prompt
function loadTemplate(template) {
    const prompts = {
        'game ui concept': 'Futuristic game interface with holographic elements, neon blue and purple color scheme, cyberpunk aesthetic, clean UI design, digital art, 4k',
        'fantasy character': 'Elven warrior with glowing magical armor, intricate details, fantasy setting, dramatic lighting, character concept art, highly detailed',
        'environment art': 'Ancient ruins in a mystical forest with glowing mushrooms, moonlit night, magical atmosphere, environment concept art, wide angle shot',
        'logo design': 'Modern geometric logo for a tech startup, clean lines, gradient colors, professional design, vector art, minimalist',
        'wallpaper': 'Cosmic landscape with nebula and distant galaxies, vibrant colors, space art, ultra-wide aspect ratio, 4k resolution'
    };

    document.getElementById('mainPrompt').value = prompts[template] || template;

    // Visual feedback
    const chips = document.querySelectorAll('.template-chip');
    chips.forEach(chip => chip.style.backgroundColor = 'rgba(108, 92, 231, 0.1)');

    // Find and highlight the clicked chip
    event.target.style.backgroundColor = 'rgba(108, 92, 231, 0.3)';
}

// Select a style preset
function selectStyle(style) {
    currentStyle = style;

    // Update UI
    const presets = document.querySelectorAll('.style-preset');
    presets.forEach(preset => preset.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// Select aspect ratio
function selectAspectRatio(ratio) {
    currentAspectRatio = ratio;

    // Update UI
    const ratios = document.querySelectorAll('.aspect-ratio');
    ratios.forEach(r => r.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// Select batch size
function selectBatch(size) {
    currentBatchSize = size;

    // Update UI
    const batchOptions = document.querySelectorAll('.batch-option');
    batchOptions.forEach(option => option.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// Upload image to ImgBB
async function uploadToImgBB(base64Data) {
    try {
        // Remove prefix if present
        const base64Content = base64Data.split(',')[1] || base64Data;

        const formData = new FormData();
        formData.append('image', base64Content);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('ImgBB upload failed');
        }

        const data = await response.json();
        return data.data.display_url;
    } catch (error) {
        console.error('ImgBB upload error:', error);
        return null;
    }
}

// Load history from localStorage
function loadHistory() {
    const imageGrid = document.getElementById('imageGrid');
    imageGrid.innerHTML = '';

    generationHistory.forEach(item => {
        if (item.image) {
            addImageToGrid(item.prompt, item.image, item.style || 'realistic', item.aspectRatio || '1:1', false);
        }
    });

    updateStats();
}

// Generate image using Cloudflare AI
async function generateImage() {
    if (isGenerating) return;

    // Check API configuration
    if (!CLOUDFLARE_CONFIG.isConfigured()) {
        showToast('Please configure your Cloudflare API credentials first.', 'info');
        showApiConfig();
        return;
    }

    const prompt = document.getElementById('mainPrompt').value;
    const negativePrompt = document.getElementById('negativePrompt').value;
    const cfgScale = parseFloat(document.getElementById('cfgScale').value);
    const seed = document.getElementById('seedInput').value ? parseInt(document.getElementById('seedInput').value) : null;
    const modelId = document.getElementById('aiModel').value;

    if (!prompt.trim()) {
        showToast('Please enter a prompt first!', 'warning');
        return;
    }

    // Show generating state
    const generateBtn = document.getElementById('generateBtn');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<div class="spinner" style="margin-right: 10px;"></div> Generating...';
    generateBtn.disabled = true;
    isGenerating = true;

    // Get dimensions based on aspect ratio
    const dimensions = ASPECT_RATIO_MAP[currentAspectRatio];

    // Prepare request data for Cloudflare API
    const requestData = {
        prompt: prompt,
        negative_prompt: negativePrompt || undefined,
        num_steps: 20,
        cfg_scale: cfgScale,
        height: dimensions.height,
        width: dimensions.width,
        seed: seed || undefined
    };

    try {
        const startTime = Date.now();

        // Call Cloudflare AI API
        const response = await fetch(
            `${CLOUDFLARE_CONFIG.baseUrl}/${CLOUDFLARE_CONFIG.accountId}/ai/run/${modelId}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            }
        );

        const endTime = Date.now();
        const generationTime = (endTime - startTime) / 1000;

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Check if we have image data
        if (result.result && result.result.image) {
            // Convert base64 image to blob URL
            const base64Image = result.result.image;
            const imageUrlBlob = `data:image/png;base64,${base64Image}`;

            // Show immediate feedback with blob URL
            addImageToGrid(prompt, imageUrlBlob, currentStyle, currentAspectRatio);

            // Upload to ImgBB for persistence
            const persistentUrl = await uploadToImgBB(base64Image);
            const finalUrl = persistentUrl || imageUrlBlob;

            // Update the image in the grid with persistent URL if successful
            if (persistentUrl) {
                const firstCard = document.querySelector('.image-card img');
                if (firstCard) firstCard.src = persistentUrl;
            }

            // Update stats
            totalGenerations++;
            localStorage.setItem('totalGenerations', totalGenerations);
            updateStats();

            // Add to history
            generationHistory.unshift({
                prompt: prompt,
                image: finalUrl,
                timestamp: new Date().toISOString(),
                style: currentStyle,
                aspectRatio: currentAspectRatio,
                model: modelId
            });

            // Keep only last 50 items
            if (generationHistory.length > 50) {
                generationHistory = generationHistory.slice(0, 50);
            }

            localStorage.setItem('generationHistory', JSON.stringify(generationHistory));

            // Update average generation time
            updateGenerationTime(generationTime);

            showToast(`Successfully generated image in ${generationTime.toFixed(2)} seconds!`, 'success');
        } else {
            throw new Error('No image data in response');
        }

    } catch (error) {
        console.error('Generation error:', error);

        // Fallback to placeholder image if API fails
        const fallbackImages = [
            'https://images.unsplash.com/photo-1579546929662-711aa81148cf?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
            'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
            'https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
        ];

        const randomImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
        addImageToGrid(prompt, randomImage, currentStyle, currentAspectRatio);

        showToast('Demo mode: Using placeholder image', 'info');
    } finally {
        // Reset button
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
        isGenerating = false;
    }
}

// Add image to the grid
function addImageToGrid(prompt, imageUrl, style, aspectRatio, saveToLocalStorage = true) {
    const imageGrid = document.getElementById('imageGrid');
    const newImage = document.createElement('div');
    newImage.className = 'image-card';
    newImage.innerHTML = `
                <div class="image-placeholder">
                    <img src="${imageUrl}" alt="Generated image" class="generated-image">
                </div>
                <div class="image-info">
                    <div class="image-prompt">${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}</div>
                    <div class="image-meta">
                        <span>${style.charAt(0).toUpperCase() + style.slice(1)} • ${aspectRatio}</span>
                        <span>Just now</span>
                    </div>
                    <div class="image-actions">
                        <button class="icon-btn" title="Download" onclick="downloadImage(this)"><i class="fas fa-download"></i></button>
                        <button class="icon-btn" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn" title="Variations" onclick="createVariations(this)"><i class="fas fa-sync-alt"></i></button>
                        <button class="icon-btn" title="Save" onclick="saveImage(this)"><i class="fas fa-heart"></i></button>
                        <button class="icon-btn delete-btn" title="Delete" onclick="deleteImage(this)"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;

    // Add to the beginning of the grid
    imageGrid.insertBefore(newImage, imageGrid.firstChild);

    // Update image count
    updateImageCount();
}

// Delete image
function deleteImage(button) {
    showConfirm('Delete this image from history?', () => {
        const imageCard = button.closest('.image-card');
        const image = imageCard.querySelector('.generated-image');
        const imageUrl = image.src;

        // Animation
        imageCard.style.opacity = '0';
        imageCard.style.transform = 'scale(0.9)';
        imageCard.style.transition = 'all 0.3s ease';

        setTimeout(() => {
            // Remove from grid
            imageCard.remove();

            // Remove from localStorage
            let history = JSON.parse(localStorage.getItem('generationHistory') || '[]');
            history = history.filter(item => item.url !== imageUrl);
            localStorage.setItem('generationHistory', JSON.stringify(history));

            updateStats();
            updateImageCount();
            showToast('Image deleted', 'info');
        }, 300);
    });
}

// Download image
async function downloadImage(button) {
    const imageCard = button.closest('.image-card');
    const image = imageCard.querySelector('.generated-image');
    const prompt = imageCard.querySelector('.image-prompt').textContent;
    const url = image.src;

    try {
        showToast('Preparing download...', 'info');

        const filename = `imagera-ai-${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
        const proxyUrl = `http://localhost:3000/api/proxy-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Proxy download failed');

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        // Delay revocation to ensure browser has time to start the download
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        }, 1000);

        showToast('Download started!', 'success');
    } catch (err) {
        console.error('Download failed:', err);
        showToast('Direct download failed. Opening link instead...', 'warning');
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.click();
    }
}

// Download all images
function downloadAll() {
    const images = document.querySelectorAll('.generated-image');
    if (images.length === 0) {
        showToast('No images to download', 'info');
        return;
    }

    showToast(`Preparing to download ${images.length} images...`, 'info');
    // In a real implementation, you would zip and download all images
}

// Save image to favorites
function saveImage(button) {
    const imageCard = button.closest('.image-card');
    const image = imageCard.querySelector('.generated-image').src;
    const prompt = imageCard.querySelector('.image-prompt').textContent;

    // Toggle save state
    if (button.classList.contains('saved')) {
        button.classList.remove('saved');
        button.innerHTML = '<i class="fas fa-heart"></i>';

        // Remove from saved images
        savedImages = savedImages.filter(item => item.image !== image);
    } else {
        button.classList.add('saved');
        button.innerHTML = '<i class="fas fa-heart" style="color:#FF4757"></i>';

        // Add to saved images
        savedImages.push({
            image: image,
            prompt: prompt,
            timestamp: new Date().toISOString()
        });
    }

    localStorage.setItem('savedImages', JSON.stringify(savedImages));
    updateStats();
}

// Create variations of an image
function createVariations(button) {
    const imageCard = button.closest('.image-card');
    const prompt = imageCard.querySelector('.image-prompt').textContent;

    // Load the prompt into the input
    document.getElementById('mainPrompt').value = prompt;

    // Show message
    showToast('Prompt loaded. Adjust settings and click "Generate" to create variations.', 'info');
}

// Show generation history
function showHistory() {
    showToast(`You have generated ${totalGenerations} images total.`, 'info');
}

// Clear history
function clearHistory() {
    showConfirm('Are you sure you want to clear all generated images?', () => {
        const imageGrid = document.getElementById('imageGrid');
        imageGrid.innerHTML = '';
        updateImageCount();
    });
}

// Update stats
function updateStats() {
    document.getElementById('totalGenerations').textContent = totalGenerations;
    document.getElementById('remainingCredits').textContent = Math.max(0, 1247 - totalGenerations);
    document.getElementById('creditCount').textContent = Math.max(0, 1247 - totalGenerations);

    const imageCount = document.querySelectorAll('.image-card').length;
    document.getElementById('totalImages').textContent = imageCount;
    document.getElementById('storageUsed').textContent = `${(imageCount * 1.4).toFixed(1)} MB`;
    document.getElementById('savedImages').textContent = savedImages.length;
}

// Update image count
function updateImageCount() {
    const imageCount = document.querySelectorAll('.image-card').length;
    document.getElementById('totalImages').textContent = imageCount;
    document.getElementById('storageUsed').textContent = `${(imageCount * 1.4).toFixed(1)} MB`;
}

// Update average generation time
function updateGenerationTime(newTime) {
    const avgTimeElement = document.getElementById('avgTime');
    const currentAvg = parseFloat(avgTimeElement.textContent) || 2.3;
    const newAvg = (currentAvg + newTime) / 2;
    avgTimeElement.textContent = newAvg.toFixed(1) + 's';

    // Update latency stat
    document.getElementById('apiLatency').textContent = newAvg.toFixed(1) + 's';
}

// Set up event listeners
function setupEventListeners() {
    // CFG Scale slider
    const cfgSlider = document.getElementById('cfgScale');
    const cfgValue = document.getElementById('cfgValue');

    cfgSlider.addEventListener('input', function () {
        cfgValue.textContent = parseFloat(this.value).toFixed(1);
    });

    // Model selection
    const modelSelect = document.getElementById('aiModel');
    modelSelect.addEventListener('change', function () {
        CLOUDFLARE_CONFIG.modelId = this.value;
        localStorage.setItem('cf_modelId', this.value);
        document.getElementById('currentModel').textContent = this.options[this.selectedIndex].text;
    });

    // Tooltips
    const tooltipTriggers = document.querySelectorAll('.prompt-tips');
    tooltipTriggers.forEach(trigger => {
        trigger.addEventListener('mouseenter', function () {
            const tooltip = this.querySelector('.tooltip');
            tooltip.style.display = 'block';
        });

        trigger.addEventListener('mouseleave', function () {
            const tooltip = this.querySelector('.tooltip');
            tooltip.style.display = 'none';
        });
    });
}