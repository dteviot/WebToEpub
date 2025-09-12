// Extension-style Chapter URLs UI for website
class ExtensionChapterUI {
    constructor(parser) {
        this.parser = parser;
        this.chapters = [];
        this.usingTable = true;
    }

    populateChapterUrlsTable(chapters) {
        this.chapters = chapters;
        this.clearChapterUrlsTable();
        
        const container = document.getElementById('chapterList');
        container.innerHTML = '';
        
        // Create table structure like extension
        const table = document.createElement('table');
        table.className = 'chapterlist';
        table.id = 'chapterUrlsTable';
        
        // Header row
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th align="left">Include</th>
            <th align="left">Title</th>
            <th align="left" class="url-column">URL</th>
        `;
        table.appendChild(headerRow);
        
        // Chapter rows
        chapters.forEach((chapter, index) => {
            const row = this.createChapterRow(chapter, index);
            chapter.row = row;
            table.appendChild(row);
        });
        
        container.appendChild(table);
        
        // Update range selectors
        this.populateRangeSelectors();
        this.updateChapterCount();
        this.showHideUrlColumn();
    }

    createChapterRow(chapter, index) {
        const row = document.createElement('tr');
        
        // Checkbox column
        const checkboxCol = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = chapter.isIncludeable !== false;
        checkbox.addEventListener('change', () => {
            chapter.isIncludeable = checkbox.checked;
            this.updateChapterCount();
            
            // Notify the main app to update selected chapters
            if (window.app && window.app.updateSelectedChapters) {
                window.app.updateSelectedChapters();
            }
        });
        
        // Add download state indicator
        const stateDiv = document.createElement('div');
        stateDiv.className = 'download-state';
        stateDiv.innerHTML = '○'; // Circle indicator
        
        checkboxCol.appendChild(checkbox);
        checkboxCol.appendChild(stateDiv);
        row.appendChild(checkboxCol);
        
        // Title column
        const titleCol = document.createElement('td');
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = chapter.title;
        titleInput.className = 'chapter-title-input';
        titleInput.addEventListener('blur', () => {
            chapter.title = titleInput.value;
        });
        titleCol.appendChild(titleInput);
        row.appendChild(titleCol);
        
        // URL column
        const urlCol = document.createElement('td');
        urlCol.className = 'url-column';
        urlCol.textContent = chapter.sourceUrl;
        urlCol.style.whiteSpace = 'nowrap';
        row.appendChild(urlCol);
        
        return row;
    }

    populateRangeSelectors() {
        const startSelect = document.getElementById('rangeStartChapter');
        const endSelect = document.getElementById('rangeEndChapter');
        
        if (!startSelect || !endSelect) return;

        // Clear existing options
        startSelect.innerHTML = '';
        endSelect.innerHTML = '';

        // Add options for each chapter
        this.chapters.forEach((chapter, index) => {
            const startOption = new Option(chapter.title, index);
            const endOption = new Option(chapter.title, index);
            
            startSelect.add(startOption);
            endSelect.add(endOption);
        });

        // Set default range
        if (this.chapters.length > 0) {
            startSelect.selectedIndex = 0;
            endSelect.selectedIndex = this.chapters.length - 1;
        }

        // Add event listeners for range changes
        startSelect.addEventListener('change', () => this.onRangeChanged());
        endSelect.addEventListener('change', () => this.onRangeChanged());
    }

    onRangeChanged() {
        const startIndex = parseInt(document.getElementById('rangeStartChapter').value);
        const endIndex = parseInt(document.getElementById('rangeEndChapter').value);
        
        const table = document.getElementById('chapterUrlsTable');
        const rows = table.querySelectorAll('tr:not(:first-child)'); // Skip header
        
        rows.forEach((row, index) => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            const inRange = index >= startIndex && index <= endIndex;
            
            checkbox.checked = inRange;
            checkbox.dispatchEvent(new Event('change'));
            row.style.display = inRange ? '' : 'none';
        });
        
        this.updateChapterCount();
    }

    selectAll() {
        const checkboxes = document.querySelectorAll('#chapterUrlsTable input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = true;
            cb.dispatchEvent(new Event('change'));
        });
        this.updateChapterCount();
    }

    selectNone() {
        const checkboxes = document.querySelectorAll('#chapterUrlsTable input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = false;
            cb.dispatchEvent(new Event('change'));
        });
        this.updateChapterCount();
    }

    reverseOrder() {
        this.chapters.reverse();
        this.populateChapterUrlsTable(this.chapters);
    }

    showEditMode() {
        const editSection = document.getElementById('editChaptersSection');
        const chapterList = document.getElementById('chapterList');
        const editInput = document.getElementById('editChaptersInput');
        const editBtn = document.getElementById('editChaptersBtn');

        if (this.usingTable) {
            // Switch to edit mode
            const urls = this.chapters.map(ch => ch.sourceUrl).join('\n');
            editInput.value = urls;
            editSection.classList.remove('hidden');
            chapterList.classList.add('hidden');
            editBtn.textContent = 'Cancel Edit';
            this.usingTable = false;
        } else {
            // Switch back to table mode
            this.applyEdits();
            editSection.classList.add('hidden');
            chapterList.classList.remove('hidden');
            editBtn.textContent = 'Edit URLs';
            this.usingTable = true;
        }
    }

    applyEdits() {
        try {
            const editInput = document.getElementById('editChaptersInput');
            const lines = editInput.value.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            const newChapters = lines.map((url, index) => ({
                sourceUrl: url,
                title: `Chapter ${index + 1}`,
                isIncludeable: true
            }));
            
            this.chapters = newChapters;
            this.populateChapterUrlsTable(newChapters);
            
            // Update parser state if available
            if (this.parser && this.parser.setPagesToFetch) {
                this.parser.setPagesToFetch(newChapters);
            }
        } catch (error) {
            console.error('Error applying chapter edits:', error);
            alert('Error applying changes: ' + error.message);
        }
    }

    updateChapterCount() {
        // Count checked checkboxes instead of relying on isIncludeable property
        const checkboxes = document.querySelectorAll('#chapterUrlsTable input[type="checkbox"]');
        const selected = Array.from(checkboxes).filter(cb => cb.checked).length;
        const total = this.chapters.length;
        
        const countElement = document.getElementById('chapterCount');
        if (countElement) {
            countElement.textContent = `${selected}/${total}`;
        }
        
        // Update the isIncludeable property based on checkbox state
        checkboxes.forEach((checkbox, index) => {
            if (this.chapters[index]) {
                this.chapters[index].isIncludeable = checkbox.checked;
            }
        });
        
        // Update enhanced statistics if available
        if (window.updateChapterStats) {
            window.updateChapterStats();
        }
        
        // Notify the main app to update selected chapters
        if (window.app && window.app.updateSelectedChapters) {
            setTimeout(() => window.app.updateSelectedChapters(), 0);
        }
    }

    showHideUrlColumn() {
        const showUrls = document.getElementById('showChapterUrls')?.checked;
        const urlColumns = document.querySelectorAll('.url-column');
        
        urlColumns.forEach(col => {
            col.style.display = showUrls ? '' : 'none';
        });
    }

    clearChapterUrlsTable() {
        const container = document.getElementById('chapterList');
        if (container) {
            container.innerHTML = '';
        }
    }

    showDownloadState(row, state) {
        if (!row) return;
        
        const stateDiv = row.querySelector('.download-state');
        if (stateDiv) {
            const stateMap = {
                0: { icon: '○', title: '' },
                1: { icon: '⬇️', title: 'Downloading...' },
                2: { icon: '✅', title: 'Complete' },
                3: { icon: '⏳', title: 'Waiting...' },
                4: { icon: '❌', title: 'Error' },
                'sleeping': { icon: '⏳', title: 'Waiting...' },
                'downloading': { icon: '⬇️', title: 'Downloading...' },
                'loaded': { icon: '✅', title: 'Complete' },
                'error': { icon: '❌', title: 'Error' }
            };
            
            const stateInfo = stateMap[state] || stateMap[0];
            stateDiv.innerHTML = stateInfo.icon;
            stateDiv.title = stateInfo.title;
        }
        
        if (window.updateChapterStats) {
            window.updateChapterStats();
        }
    }

    connectButtonHandlers() {
        // Select All button
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAll());
        }

        // Select None button
        const selectNoneBtn = document.getElementById('selectNoneBtn');
        if (selectNoneBtn) {
            selectNoneBtn.addEventListener('click', () => this.selectNone());
        }

        // Reverse Order button
        const reverseBtn = document.getElementById('reverseOrderBtn');
        if (reverseBtn) {
            reverseBtn.addEventListener('click', () => this.reverseOrder());
        }

        // Edit Chapters button
        const editBtn = document.getElementById('editChaptersBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.showEditMode());
        }

        // Apply Changes button
        const applyBtn = document.getElementById('applyChapterEdits');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyEdits());
        }

        // Cancel Edit button
        const cancelBtn = document.getElementById('cancelChapterEdits');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.showEditMode());
        }

        // Show URLs checkbox
        const showUrlsCheckbox = document.getElementById('showChapterUrls');
        if (showUrlsCheckbox) {
            showUrlsCheckbox.addEventListener('change', () => this.showHideUrlColumn());
        }
    }

    // Extension compatibility methods
    static showDownloadState(row, state) {
        const ui = window.extensionChapterUI;
        if (ui) {
            ui.showDownloadState(row, state);
        }
    }

    static clearChapterUrlsTable() {
        const ui = window.extensionChapterUI;
        if (ui) {
            ui.clearChapterUrlsTable();
        }
    }
}

// Constants for download states (matching extension)
ExtensionChapterUI.DOWNLOAD_STATE_NONE = 0;
ExtensionChapterUI.DOWNLOAD_STATE_DOWNLOADING = 1;
ExtensionChapterUI.DOWNLOAD_STATE_LOADED = 2;
ExtensionChapterUI.DOWNLOAD_STATE_SLEEPING = 3;

// Export for global use
window.ExtensionChapterUI = ExtensionChapterUI;