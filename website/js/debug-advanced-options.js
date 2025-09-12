// Debug script for advanced options functionality
(function() {
    'use strict';
    
    // Debug function to check advanced options state
    window.debugAdvancedOptions = function() {
        console.log('=== Advanced Options Debug ===');
        
        const toggle = document.getElementById('advancedOptionsToggle');
        const content = document.getElementById('advancedOptionsContent');
        const section = document.getElementById('advancedOptionsSection');
        
        console.log('Toggle button:', toggle);
        console.log('Content div:', content);
        console.log('Section:', section);
        
        if (toggle) {
            console.log('Toggle onclick:', toggle.onclick);
            console.log('Toggle event listeners:', getEventListeners ? getEventListeners(toggle) : 'getEventListeners not available');
        }
        
        if (content) {
            console.log('Content classes:', content.className);
            console.log('Content hidden:', content.classList.contains('hidden'));
        }
        
        if (section) {
            console.log('Section classes:', section.className);
            console.log('Section hidden:', section.classList.contains('hidden'));
        }
        
        console.log('Extension core:', window.extensionCore);
        console.log('=== End Debug ===');
    };
    
    // Auto-fix function for advanced options
    window.fixAdvancedOptions = function() {
        console.log('Attempting to fix advanced options...');
        
        const toggle = document.getElementById('advancedOptionsToggle');
        const content = document.getElementById('advancedOptionsContent');
        const section = document.getElementById('advancedOptionsSection');
        
        // Ensure section is visible
        if (section && section.classList.contains('hidden')) {
            section.classList.remove('hidden');
            console.log('Made advanced options section visible');
        }
        
        // Ensure content starts hidden
        if (content && !content.classList.contains('hidden')) {
            content.classList.add('hidden');
            console.log('Set advanced options content to hidden');
        }
        
        // Fix toggle button
        if (toggle) {
            // Remove existing handlers
            toggle.onclick = null;
            
            // Add new handler
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Advanced options toggle clicked');
                
                if (!content) {
                    console.error('Advanced options content not found');
                    return;
                }
                
                const isHidden = content.classList.contains('hidden');
                console.log('Current state - hidden:', isHidden);
                
                if (isHidden) {
                    content.classList.remove('hidden');
                    toggle.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Options';
                    console.log('Showed advanced options');
                } else {
                    content.classList.add('hidden');
                    toggle.innerHTML = '<i class="fas fa-cog"></i> Show Options';
                    console.log('Hid advanced options');
                }
            });
            
            console.log('Fixed advanced options toggle');
        }
        
        console.log('Advanced options fix complete');
    };
    
    // Auto-run fix when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(window.fixAdvancedOptions, 1000);
        });
    } else {
        setTimeout(window.fixAdvancedOptions, 1000);
    }
    
    console.log('Advanced options debug script loaded');
})();