// Main application logic
class WebToEpubApp {
    constructor() {
        this.currentStory = null;
        this.chapters = [];
        this.selectedChapters = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.showSection('url-section');
        
        window.userPreferences.readFromLocalStorage();
        window.userPreferences.writeToUI();
    }

    async configureDefaultParser(url, dom) {
        return new Promise((resolve) => {
            const modal = document.getElementById('defaultParserModal');
            const saveBtn = document.getElementById('saveDefaultParser');
            const cancelBtn = document.getElementById('cancelDefaultParser');
            
            document.getElementById('defaultParserTestUrl').value = url;
            modal.classList.remove('hidden');
            
            const cleanup = () => {
                modal.classList.add('hidden');
                saveBtn.onclick = null;
                cancelBtn.onclick = null;
            };
            
            saveBtn.onclick = () => {
                const config = window.extensionCore.defaultParserUI.getConfiguration();
                if (config) {
                    const parser = window.parserFactory.getParser(url, dom);
                    parser.configured = true;
                    parser.contentSelector = config.contentCss;
                    parser.titleSelector = config.titleCss;
                    parser.unwantedSelector = config.unwantedCss;
                    
                    cleanup();
                    resolve(true);
                } else {
                    alert('Please test the configuration first');
                }
            };
            
            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };
        });
    }

    bindEvents() {
        // Main analyze button
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.analyzeUrl();
        });

        // Enter key in URL input
        document.getElementById('urlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzeUrl();
            }
        });

        // Chapter selection buttons
        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.selectAllChapters(true);
        });

        document.getElementById('selectNoneBtn').addEventListener('click', () => {
            this.selectAllChapters(false);
        });

        // Generate EPUB button
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateEpub();
        });

        // Modal close
        document.querySelector('.modal-close').addEventListener('click', () => {
            Utils.hideError();
        });

        // Click outside modal to close
        document.getElementById('errorModal').addEventListener('click', (e) => {
            if (e.target.id === 'errorModal') {
                Utils.hideError();
            }
        });
    }

    showSection(sectionId) {
        const sections = [
            'loadingState', 'storyInfo', 'chapterSection', 
            'advancedOptionsSection', 'generateSection', 'progressSection'
        ];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
            }
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
    }

    async analyzeUrl() {
        const url = document.getElementById('urlInput').value.trim();
        
        if (!url) {
            Utils.showError('Please enter a valid URL');
            return;
        }

        if (!this.isValidUrl(url)) {
            Utils.showError('Please enter a valid HTTP/HTTPS URL');
            return;
        }

        try {
            this.showSection('loadingState');
            await this.fetchAndAnalyzeStory(url);
        } catch (error) {
            console.error('Analysis error:', error);
            Utils.showError(`Failed to analyze story: ${error.message}`);
            this.showSection('url-section');
        }
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    async fetchAndAnalyzeStory(url) {
        try {
            // Fetch the main page
            const response = await fetch('/api/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            const dom = new DOMParser().parseFromString(data.html, 'text/html');
            
            // Set base URI for proper URL resolution
            util.setBaseTag(data.url, dom);

            // Get appropriate parser using extension parser factory
            if (!window.parserFactory) {
                throw new Error('Parser factory not initialized. Please refresh the page.');
            }
            const parser = window.parserFactory.fetch(url, dom);
            
            // Extract story metadata
            const story = {
                url: data.url,
                title: parser.extractTitle ? parser.extractTitle(dom) : this.extractTitleFallback(dom),
                author: parser.extractAuthor ? parser.extractAuthor(dom) : this.extractAuthorFallback(dom),
                language: parser.extractLanguage ? parser.extractLanguage(dom) : 'en',
                coverUrl: parser.findCoverImageUrl ? parser.findCoverImageUrl(dom) : null,
                chapters: await parser.getChapterUrls(dom)
            };

            this.currentStory = story;
            this.chapters = story.chapters;
            this.parser = parser;
            
            this.populateStoryInfo(story);
            this.populateChapterList(story.chapters);
            
            this.showSection('storyInfo');
            
            // Only show sections if chapters are present
            if (story.chapters && story.chapters.length > 0) {
                const sectionsToShow = ['chapterSection', 'advancedOptionsSection', 'generateSection'];
                sectionsToShow.forEach(sectionId => {
                    const section = document.getElementById(sectionId);
                    if (section) {
                        section.classList.remove('hidden');
                        section.classList.add('show');
                    }
                });
            }
            
            // Ensure advanced options toggle is properly initialized
            if (window.extensionCore && window.extensionCore.setupEventHandlers) {
                window.extensionCore.setupEventHandlers();
            }

        } catch (error) {
            console.error('Story analysis failed:', error);
            window.errorLog.showErrorMessage(error);
            throw error;
        }
    }



    populateStoryInfo(story) {
        document.getElementById('storyTitle').textContent = story.title;
        document.getElementById('storyAuthor').textContent = story.author;
        document.getElementById('chapterCount').textContent = story.chapters.length;
        document.getElementById('storyLanguage').textContent = story.language;
        
        // Populate form fields
        document.getElementById('titleInput').value = story.title;
        document.getElementById('authorInput').value = story.author;
        document.getElementById('languageInput').value = story.language;
        document.getElementById('filenameInput').value = Utils.safeForFileName(story.title);
        
        // Set cover image
        const coverImg = document.getElementById('coverImage');
        if (story.coverUrl) {
            coverImg.src = story.coverUrl;
            coverImg.style.display = 'block';
        } else {
            coverImg.style.display = 'none';
        }
    }

    populateChapterList(chapters) {
        // Create extension-style chapter UI
        this.extensionChapterUI = new ExtensionChapterUI(this.parser);
        this.extensionChapterUI.populateChapterUrlsTable(chapters);
        this.extensionChapterUI.connectButtonHandlers();
        
        // Store reference globally for compatibility
        window.extensionChapterUI = this.extensionChapterUI;
        
        this.updateSelectedChapters();
    }

    selectAllChapters(select) {
        if (this.extensionChapterUI) {
            if (select) {
                this.extensionChapterUI.selectAll();
            } else {
                this.extensionChapterUI.selectNone();
            }
            // Add a small delay to ensure DOM is updated
            setTimeout(() => {
                this.updateSelectedChapters();
            }, 10);
        } else {
            // Fallback if extensionChapterUI is not available
            const checkboxes = document.querySelectorAll('#chapterUrlsTable input[type="checkbox"], #chapterList input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = select;
                cb.dispatchEvent(new Event('change'));
            });
            this.updateSelectedChapters();
        }
    }

    updateSelectedChapters() {
        if (this.chapters) {
            // Get currently checked chapters from the UI
            const checkboxes = document.querySelectorAll('#chapterUrlsTable input[type="checkbox"]');
            this.selectedChapters = [];
            
            checkboxes.forEach((checkbox, index) => {
                if (checkbox.checked && this.chapters[index]) {
                    this.chapters[index].isIncludeable = true;
                    // Ensure chapter has reference to its row for progress tracking
                    this.chapters[index].row = checkbox.closest('tr');
                    this.selectedChapters.push(this.chapters[index]);
                } else if (this.chapters[index]) {
                    this.chapters[index].isIncludeable = false;
                }
            });
            
            // Update generate button state
            const generateBtn = document.getElementById('generateBtn');
            if (generateBtn) {
                generateBtn.disabled = this.selectedChapters.length === 0;
            }
            
            // Update chapter count display
            const countElement = document.getElementById('chapterCount');
            if (countElement) {
                countElement.textContent = `${this.selectedChapters.length}/${this.chapters.length}`;
            }
            
            // Update global reference for progress tracking
            if (window.app) {
                window.app.selectedChapters = this.selectedChapters;
            }
        }
    }

    async generateEpub() {
        // Update selected chapters before generating
        this.updateSelectedChapters();
        
        if (this.selectedChapters.length === 0) {
            Utils.showError('Please select at least one chapter');
            return;
        }

        try {
            // Show progress section but keep chapter section visible
            document.getElementById('progressSection').classList.remove('hidden');
            document.getElementById('generateSection').classList.add('hidden');
            
            const metaInfo = {
                uuid: this.currentStory.url,
                title: document.getElementById('titleInput').value || this.currentStory.title,
                author: document.getElementById('authorInput').value || this.currentStory.author,
                language: document.getElementById('languageInput').value || 'en',
                fileName: document.getElementById('filenameInput').value || 'story',
                subject: document.getElementById('subjectInput')?.value || '',
                description: document.getElementById('descriptionInput')?.value || '',
                seriesName: document.getElementById('seriesNameInput')?.value || null,
                seriesIndex: document.getElementById('seriesIndexInput')?.value || null,
                styleSheet: document.getElementById('stylesheetInput')?.value || ''
            };
            
            window.userPreferences.readFromUI();
            
            const delay = parseInt(document.getElementById('manualDelayPerChapter')?.value) || 2000;
            const maxChapters = parseInt(document.getElementById('maxChaptersPerEpub')?.value) || 1000;
            
            if (this.selectedChapters.length > maxChapters) {
                throw new Error(`Too many chapters selected. Maximum allowed: ${maxChapters}`);
            }
            
            Utils.updateProgress(5, 'Fetching chapter content...');
            
            // Fetch all chapter content with progress tracking
            const processedChapters = [];
            
            for (let i = 0; i < this.selectedChapters.length; i++) {
                const chapter = this.selectedChapters[i];
                const progress = 5 + (i / this.selectedChapters.length) * 60;
                
                Utils.updateProgress(progress, `Fetching chapter ${i + 1}/${this.selectedChapters.length}: ${chapter.title}`);
                
                // Update chapter state to downloading
                if (window.updateChapterProgress) {
                    window.updateChapterProgress(i, 'downloading', 'Downloading...');
                }
                
                try {
                    const response = await fetch('/api/fetch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: chapter.sourceUrl })
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok && result.html) {
                        const dom = new DOMParser().parseFromString(result.html, 'text/html');
                        util.setBaseTag(result.url, dom);
                        
                        const content = this.parser.findContent(dom);
                        const title = this.parser.findChapterTitle ? 
                            this.parser.findChapterTitle(dom) || chapter.title :
                            chapter.title;
                        
                        processedChapters.push({
                            title: title,
                            content: content.innerHTML,
                            sourceUrl: result.url
                        });
                        
                        // Update chapter state to loaded
                        if (window.updateChapterProgress) {
                            window.updateChapterProgress(i, 'loaded', 'Complete');
                        }
                    } else {
                        throw new Error(result.error || 'Failed to fetch chapter');
                    }
                } catch (error) {
                    console.error(`Error fetching chapter ${i + 1}:`, error);
                    
                    processedChapters.push({
                        title: chapter.title,
                        content: `<p>Error loading chapter: ${error.message}</p>`,
                        sourceUrl: chapter.sourceUrl
                    });
                    
                    // Update chapter state to error
                    if (window.updateChapterProgress) {
                        window.updateChapterProgress(i, 'error', 'Error');
                    }
                }
                
                // Rate limiting
                if (i < this.selectedChapters.length - 1) {
                    await Utils.sleep(delay);
                }
            }
            
            Utils.updateProgress(70, 'Processing content...');
            await Utils.sleep(500);
            
            Utils.updateProgress(85, 'Generating EPUB file...');
            const epubPacker = new EnhancedEpubPacker(metaInfo);
            const epubBlob = await epubPacker.assemble(processedChapters);
            
            Utils.updateProgress(100, 'Complete!');
            
            const filename = `${metaInfo.fileName}.epub`;
            Utils.downloadBlob(epubBlob, filename);
            
            setTimeout(() => {
                alert(`EPUB generated successfully! File: ${filename}`);
                document.getElementById('progressSection').classList.add('hidden');
                document.getElementById('generateSection').classList.remove('hidden');
            }, 1000);
            
        } catch (error) {
            console.error('EPUB generation error:', error);
            window.errorLog.showErrorMessage(error);
            document.getElementById('progressSection').classList.add('hidden');
            document.getElementById('generateSection').classList.remove('hidden');
        }
    }

    extractTitleFallback(dom) {
        const titleSources = [
            () => dom.querySelector('meta[property="og:title"]')?.getAttribute('content'),
            () => dom.querySelector('h1')?.textContent,
            () => dom.querySelector('.title')?.textContent,
            () => dom.title
        ];

        for (const source of titleSources) {
            try {
                const title = source();
                if (title && title.trim()) {
                    return title.trim();
                }
            } catch (e) {
                continue;
            }
        }
        
        return 'Untitled Story';
    }

    extractAuthorFallback(dom) {
        const authorSources = [
            () => dom.querySelector('meta[name="author"]')?.getAttribute('content'),
            () => dom.querySelector('.author')?.textContent,
            () => dom.querySelector('[rel="author"]')?.textContent
        ];

        for (const source of authorSources) {
            try {
                const author = source();
                if (author && author.trim()) {
                    return author.trim();
                }
            } catch (e) {
                continue;
            }
        }
        
        return 'Unknown Author';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WebToEpubApp();
});

// Add some demo functionality
document.addEventListener('DOMContentLoaded', () => {
    // Add demo URLs for testing
    const urlInput = document.getElementById('urlInput');
    const demoUrls = [
        'https://www.royalroad.com/fiction/demo-story',
        'https://archiveofourown.org/works/demo-work',
        'https://www.fanfiction.net/s/demo-story',
        'https://www.wuxiaworld.com/novel/demo-novel'
    ];
    
    // Add placeholder with random demo URL
    const randomUrl = demoUrls[Math.floor(Math.random() * demoUrls.length)];
    urlInput.placeholder = `Enter story URL (e.g., ${randomUrl})`;
});