// Define sunrise & sunset times
let currentSettings = {
    mode: 'auto_sunset',
    sunriseTime: '06:00',
    sunsetTime: '18:00'
};

// Load settings initially
loadSettings();

function isColorDark(color) {
    // If no color or invalid color, assume it's not dark
    if (!color || color === 'transparent' || color === 'initial' || color === 'inherit') {
        return false;
    }

    try {
        let r, g, b;
        
        if (color.startsWith('rgb')) {
            // Parse RGB/RGBA format
            const parts = color.match(/\d+/g);
            if (!parts || parts.length < 3) return false;
            r = parseInt(parts[0]);
            g = parseInt(parts[1]);
            b = parseInt(parts[2]);
        } else if (color.startsWith('#')) {
            // Parse hex format
            const hex = color.replace('#', '');
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else {
            return false;
        }

        // Use a more accurate luminance formula (sRGB relative luminance)
        const sRGBtoLin = (col) => {
            col = col / 255;
            return col <= 0.03928 ? col / 12.92 : Math.pow((col + 0.055) / 1.055, 2.4);
        };
        
        const luminance = 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
        
        // Return true only for very dark colors (lower threshold)
        return luminance < 0.1; // More strict threshold
    } catch (e) {
        console.error('Error parsing color:', e);
        return false;
    }
}

function hasNativeDarkMode() {
    const url = window.location.hostname;
    
    // Google Search specific check
    if (url.includes('google') && url.includes('search')) {
        // Check multiple indicators that Google uses for dark mode
        return (
            document.documentElement.getAttribute('data-darkmode') === 'true' ||
            document.documentElement.getAttribute('darkmode') === 'true' ||
            getComputedStyle(document.body).backgroundColor === 'rgb(32, 33, 36)' ||
            document.querySelector('html[darkmode="true"]') !== null
        );
    }
    
    // YouTube specific check
    if (url.includes('youtube.com')) {
        return document.documentElement.getAttribute('dark') === 'true'; // TODO: check
    }

    // For other sites, check background colors
    try {
        const bodyStyle = getComputedStyle(document.body);
        const htmlStyle = getComputedStyle(document.documentElement);
        
        // Get the actual rendered background colors
        const bodyBg = bodyStyle.backgroundColor;
        const htmlBg = htmlStyle.backgroundColor;
        
        // Also check text color to ensure we have light text on dark background
        const textColor = bodyStyle.color;
        
        // Consider it dark mode if:
        // 1. Background is very dark (from isColorDark)
        // 2. Text is light colored
        const hasDarkBackground = isColorDark(bodyBg) || isColorDark(htmlBg);
        const hasLightText = !isColorDark(textColor);
        
        return hasDarkBackground && hasLightText;
    } catch (e) {
        console.error('Error checking native dark mode:', e);
        return false;
    }
}

// Listen for settings updates from background script
browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'settingsUpdated') {
        currentSettings = message.settings;
        applyDarkMode();
    }
});

async function loadSettings() {
    try {
        const response = await browser.runtime.sendMessage({ type: 'getSettings' });
        if (response) {
            currentSettings = response;
            applyDarkMode();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function shouldApplyDarkMode() {
    // If site has native dark mode, don't apply our dark mode
    if (hasNativeDarkMode()) {
        console.log('Native dark mode detected, skipping application');
        return false;
    }

    switch (currentSettings.mode) {
        case 'manual':
            return true;
        case 'off':
            return false;
        case 'system':
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        case 'auto_sunset':
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const [sunriseHour, sunriseMinute] = currentSettings.sunriseTime.split(':').map(Number);
            const [sunsetHour, sunsetMinute] = currentSettings.sunsetTime.split(':').map(Number);
            const sunriseTime = sunriseHour * 60 + sunriseMinute;
            const sunsetTime = sunsetHour * 60 + sunsetMinute;
            return currentTime < sunriseTime || currentTime >= sunsetTime;
        default:
            return false;
    }
}

function applyDarkMode() {
    const shouldApply = shouldApplyDarkMode();
    
    if (shouldApply) {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.setAttribute('data-nocturnal-dark', 'true');
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.documentElement.removeAttribute('data-nocturnal-dark');
    }
}

// Initial application
applyDarkMode();

// Check for dark mode periodically (every minute)
setInterval(applyDarkMode, 60000);

// Add mutation observer to handle dynamic content
const observer = new MutationObserver((mutations) => {
    // Only reapply if we're supposed to be in dark mode
    if (shouldApplyDarkMode()) {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.setAttribute('data-nocturnal-dark', 'true');
    }
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-darkmode']
});

// Add specific observer for Google Search
if (window.location.hostname.includes('google') && window.location.hostname.includes('search')) {
    // Watch for theme changes
    const googleObserver = new MutationObserver(() => {
        if (hasNativeDarkMode()) {
            document.documentElement.classList.remove('dark-mode');
            document.documentElement.removeAttribute('data-nocturnal-dark');
        }
    });

    googleObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-darkmode', 'darkmode'],
        subtree: true,
        childList: true
    });
}
