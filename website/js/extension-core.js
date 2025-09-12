// Core extension functionality adapted for web
class ExtensionCore {
    constructor() {
        this.userPreferences = new UserPreferences();
        this.errorLog = new ErrorLog();
        this.progressBar = new ProgressBar();
        this.chapterUrlsUI = new ChapterUrlsUI();
        this.coverImageUI = new CoverImageUI();
        this.defaultParserUI = new DefaultParserUI();
    }

    async initialize() {
        this.loadUserPreferences();
        this.setupEventHandlers();
        this.localizeUI();
    }

    loadUserPreferences() {
        this.userPreferences.readFromLocalStorage();
        this.userPreferences.writeToUI();
        this.userPreferences.hookupUI();
    }

    setupEventHandlers() {
        // Advanced options toggle
        document.getElementById('advancedOptionsToggle').onclick = () => {
            this.toggleAdvancedOptions();
        };

        // Chapter controls
        document.getElementById('selectAllBtn').onclick = () => {
            this.chapterUrlsUI.selectAll();
        };

        document.getElementById('selectNoneBtn').onclick = () => {
            this.chapterUrlsUI.selectNone();
        };

        document.getElementById('reverseOrderBtn').onclick = () => {
            this.chapterUrlsUI.reverseOrder();
        };

        document.getElementById('editChaptersBtn').onclick = () => {
            this.chapterUrlsUI.showEditMode();
        };

        // Default parser
        document.getElementById('testDefaultParser').onclick = () => {
            this.defaultParserUI.testConfiguration();
        };

        // Error handling
        document.getElementById('errorButtonRetry').onclick = () => {
            this.errorLog.retry();
        };

        document.getElementById('errorButtonCancel').onclick = () => {
            this.errorLog.cancel();
        };

        // Stylesheet reset
        document.getElementById('resetStylesheetBtn').onclick = () => {
            this.resetStylesheet();
        };
    }

    toggleAdvancedOptions() {
        const content = document.getElementById('advancedOptionsContent');
        const button = document.getElementById('advancedOptionsToggle');
        
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            button.textContent = 'Hide Options';
        } else {
            content.classList.add('hidden');
            button.textContent = 'Show Options';
        }
    }

    resetStylesheet() {
        const defaultCSS = `
body {
    font-family: Georgia, serif;
    line-height: 1.6;
    margin: 1em;
    color: #333;
}

h1, h2, h3, h4, h5, h6 {
    color: #2c3e50;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}

h1 {
    font-size: 1.8em;
    border-bottom: 2px solid #3498db;
    padding-bottom: 0.3em;
}

p {
    margin: 1em 0;
    text-align: justify;
}

img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
}
        `.trim();
        
        document.getElementById('stylesheetInput').value = defaultCSS;
    }

    localizeUI() {
        // Placeholder for UI localization
        // In the extension, this handles multiple languages
    }
}

// User Preferences Management
class UserPreferences {
    constructor() {
        this.preferences = {
            skipImages: false,
            compressImages: false,
            removeDuplicateImages: true,
            includeImageSourceUrl: false,
            compressImagesMaxResolution: 1080,
            removeNextPrevLinks: true,
            addInformationPage: true,
            skipFailedChapters: false,
            createEpub3: true,
            manualDelayPerChapter: 2000,
            maxChaptersPerEpub: 1000,
            manuallySelectParser: '',
            stylesheet: ''
        };
    }

    readFromLocalStorage() {
        try {
            const stored = localStorage.getItem('webtoepub-preferences');
            if (stored) {
                this.preferences = { ...this.preferences, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.warn('Failed to load preferences:', error);
        }
    }

    writeToLocalStorage() {
        try {
            localStorage.setItem('webtoepub-preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.warn('Failed to save preferences:', error);
        }
    }

    writeToUI() {
        for (const [key, value] of Object.entries(this.preferences)) {
            const element = document.getElementById(key) || document.getElementById(key + 'Checkbox');
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        }
    }

    readFromUI() {
        for (const key of Object.keys(this.preferences)) {
            const element = document.getElementById(key) || document.getElementById(key + 'Checkbox');
            if (element) {
                if (element.type === 'checkbox') {
                    this.preferences[key] = element.checked;
                } else {
                    this.preferences[key] = element.value;
                }
            }
        }
        this.writeToLocalStorage();
    }

    hookupUI() {
        for (const key of Object.keys(this.preferences)) {
            const element = document.getElementById(key) || document.getElementById(key + 'Checkbox');
            if (element) {
                element.addEventListener('change', () => {
                    this.readFromUI();
                });
            }
        }
    }
}

// Error Log Management
class ErrorLog {
    constructor() {
        this.errors = [];
        this.currentError = null;
    }

    showErrorMessage(error) {
        this.currentError = error;
        
        let message = error;
        if (error instanceof Error) {
            message = error.message;
        }
        
        document.getElementById('errorMessage').textContent = message;
        
        // Show/hide action buttons based on error type
        const retryBtn = document.getElementById('errorButtonRetry');
        const cancelBtn = document.getElementById('errorButtonCancel');
        const openUrlBtn = document.getElementById('errorButtonOpenURL');
        
        if (error.retryAction) {
            retryBtn.classList.remove('hidden');
            retryBtn.onclick = error.retryAction;
        } else {
            retryBtn.classList.add('hidden');
        }
        
        if (error.cancelAction) {
            cancelBtn.classList.remove('hidden');
            cancelBtn.onclick = error.cancelAction;
        } else {
            cancelBtn.classList.add('hidden');
        }
        
        if (error.openurl) {
            openUrlBtn.classList.remove('hidden');
            openUrlBtn.onclick = () => window.open(error.openurl, '_blank');
        } else {
            openUrlBtn.classList.add('hidden');
        }
        
        document.getElementById('errorModal').classList.remove('hidden');
        this.log(error);
    }

    log(error) {
        this.errors.push({
            timestamp: new Date().toISOString(),
            message: error.toString(),
            stack: error.stack
        });
    }

    clearHistory() {
        this.errors = [];
    }

    dumpHistory() {
        return this.errors.map(e => `${e.timestamp}: ${e.message}`).join('\n');
    }

    retry() {
        if (this.currentError && this.currentError.retryAction) {
            this.currentError.retryAction();
        }
        this.hideError();
    }

    cancel() {
        if (this.currentError && this.currentError.cancelAction) {
            this.currentError.cancelAction();
        }
        this.hideError();
    }

    hideError() {
        document.getElementById('errorModal').classList.add('hidden');
        this.currentError = null;
    }
}

// Progress Bar Management
class ProgressBar {
    constructor() {
        this.progressElement = document.getElementById('progressFill');
        this.textElement = document.getElementById('progressText');
        this.detailsElement = document.getElementById('progressDetails');
    }

    setValue(percent) {
        if (this.progressElement) {
            this.progressElement.style.width = `${percent}%`;
        }
    }

    updateValue(increment) {
        const current = parseFloat(this.progressElement.style.width) || 0;
        this.setValue(current + increment);
    }

    setMax(max) {
        this.maxValue = max;
    }

    setText(text) {
        if (this.textElement) {
            this.textElement.textContent = text;
        }
    }

    setDetails(details) {
        if (this.detailsElement) {
            this.detailsElement.textContent = details;
        }
    }
}

// Chapter URLs UI Management
class ChapterUrlsUI {
    constructor() {
        this.chapters = [];
        this.editMode = false;
    }

    populateChapterUrlsTable(chapters) {
        this.chapters = chapters;
        const container = document.getElementById('chapterList');
        container.innerHTML = '';

        chapters.forEach((chapter, index) => {
            const item = document.createElement('div');
            item.className = 'chapter-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `chapter-${index}`;
            checkbox.checked = chapter.isIncludeable !== false;
            checkbox.addEventListener('change', () => {
                chapter.isIncludeable = checkbox.checked;
                this.updateChapterCount();
            });

            const label = document.createElement('label');
            label.htmlFor = `chapter-${index}`;
            label.className = 'chapter-title';
            label.textContent = chapter.title;

            const url = document.createElement('span');
            url.className = 'chapter-url';
            url.textContent = chapter.sourceUrl;
            url.style.display = document.getElementById('showChapterUrls')?.checked ? 'inline' : 'none';

            item.appendChild(checkbox);
            item.appendChild(label);
            item.appendChild(url);
            container.appendChild(item);
        });

        this.populateRangeSelectors();
        this.updateChapterCount();
    }

    populateRangeSelectors() {
        const startSelect = document.getElementById('rangeStartChapter');
        const endSelect = document.getElementById('rangeEndChapter');
        
        if (!startSelect || !endSelect) return;

        startSelect.innerHTML = '';
        endSelect.innerHTML = '';

        this.chapters.forEach((chapter, index) => {
            const startOption = new Option(chapter.title, index);
            const endOption = new Option(chapter.title, index);
            
            startSelect.add(startOption);
            endSelect.add(endOption);
        });

        if (this.chapters.length > 0) {
            startSelect.selectedIndex = 0;
            endSelect.selectedIndex = this.chapters.length - 1;
        }
    }

    selectAll() {
        document.querySelectorAll('#chapterList input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
            cb.dispatchEvent(new Event('change'));
        });
    }

    selectNone() {
        document.querySelectorAll('#chapterList input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            cb.dispatchEvent(new Event('change'));
        });
    }

    reverseOrder() {
        this.chapters.reverse();
        this.populateChapterUrlsTable(this.chapters);
    }

    showEditMode() {
        const editSection = document.getElementById('editChaptersSection');
        const chapterList = document.getElementById('chapterList');
        const editInput = document.getElementById('editChaptersInput');

        if (this.editMode) {
            // Exit edit mode
            editSection.classList.add('hidden');
            chapterList.classList.remove('hidden');
            this.editMode = false;
            document.getElementById('editChaptersBtn').textContent = 'Edit URLs';
        } else {
            // Enter edit mode
            const urls = this.chapters.map(ch => ch.sourceUrl).join('\n');
            editInput.value = urls;
            editSection.classList.remove('hidden');
            chapterList.classList.add('hidden');
            this.editMode = true;
            document.getElementById('editChaptersBtn').textContent = 'Cancel Edit';
        }
    }

    updateChapterCount() {
        const selected = this.chapters.filter(ch => ch.isIncludeable !== false).length;
        const total = this.chapters.length;
        
        const countElement = document.getElementById('chapterCount');
        if (countElement) {
            countElement.textContent = `${selected}/${total}`;
        }
    }

    showDownloadState(row, state) {
        // Update chapter status during download
        if (row && row.querySelector) {
            let statusElement = row.querySelector('.chapter-status');
            if (!statusElement) {
                statusElement = document.createElement('span');
                statusElement.className = 'chapter-status';
                row.appendChild(statusElement);
            }

            switch (state) {
                case 'sleeping':
                    statusElement.textContent = 'Waiting...';
                    statusElement.className = 'chapter-status loading';
                    break;
                case 'downloading':
                    statusElement.textContent = 'Downloading...';
                    statusElement.className = 'chapter-status loading';
                    break;
                case 'loaded':
                    statusElement.textContent = 'Complete';
                    statusElement.className = 'chapter-status success';
                    break;
                case 'error':
                    statusElement.textContent = 'Error';
                    statusElement.className = 'chapter-status error';
                    break;
            }
        }
    }
}

// Cover Image UI Management
class CoverImageUI {
    static setCoverImageUrl(url) {
        const coverImg = document.getElementById('coverImage');
        const urlInput = document.getElementById('coverImageUrlInput');
        
        if (url) {
            if (coverImg) {
                coverImg.src = url;
                coverImg.style.display = 'block';
            }
            if (urlInput) {
                urlInput.value = url;
            }
        } else {
            if (coverImg) {
                coverImg.style.display = 'none';
            }
            if (urlInput) {
                urlInput.value = '';
            }
        }
    }

    static getCoverImageUrl() {
        const urlInput = document.getElementById('coverImageUrlInput');
        return urlInput ? urlInput.value : null;
    }

    static clearUI() {
        this.setCoverImageUrl(null);
    }
}

// Default Parser UI Management
class DefaultParserUI {
    constructor() {
        this.testResult = null;
    }

    show() {
        document.getElementById('defaultParserModal').classList.remove('hidden');
    }

    hide() {
        document.getElementById('defaultParserModal').classList.add('hidden');
    }

    async testConfiguration() {
        const contentCss = document.getElementById('defaultParserContentCss').value;
        const titleCss = document.getElementById('defaultParserTitleCss').value;
        const unwantedCss = document.getElementById('defaultParserUnwantedCss').value;
        const testUrl = document.getElementById('defaultParserTestUrl').value;

        if (!testUrl) {
            alert('Please provide a test URL');
            return;
        }

        try {
            const response = await fetch('/api/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: testUrl })
            });

            const data = await response.json();
            const dom = new DOMParser().parseFromString(data.html, 'text/html');

            // Test the selectors
            let content = null;
            if (contentCss) {
                content = dom.querySelector(contentCss);
            }

            if (content) {
                // Remove unwanted elements
                if (unwantedCss) {
                    const unwanted = content.querySelectorAll(unwantedCss);
                    unwanted.forEach(el => el.remove());
                }

                // Show preview
                const preview = document.getElementById('defaultParserPreview');
                preview.innerHTML = content.innerHTML.substring(0, 2000) + '...';
                document.getElementById('defaultParserResult').classList.remove('hidden');
                
                this.testResult = { contentCss, titleCss, unwantedCss };
            } else {
                alert('No content found with the specified selector');
            }
        } catch (error) {
            alert(`Test failed: ${error.message}`);
        }
    }

    getConfiguration() {
        return this.testResult;
    }
}

// Global instances
window.extensionCore = new ExtensionCore();
window.userPreferences = new UserPreferences();
window.errorLog = new ErrorLog();
window.progressBar = new ProgressBar();
window.chapterUrlsUI = new ChapterUrlsUI();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.extensionCore.initialize();
});