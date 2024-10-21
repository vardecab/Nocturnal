document.addEventListener('DOMContentLoaded', async () => {
    const timeSettings = document.getElementById('timeSettings');
    const DEFAULT_SETTINGS = {
        mode: 'auto_sunset',
        sunriseTime: '06:00',
        sunsetTime: '18:00'
    };
    
    // Function to check if dark mode should be active
    function shouldApplyDarkMode(settings) {
        switch (settings.mode) {
            case 'manual':
                return true;
            case 'off':
                return false;
            case 'system':
                return window.matchMedia('(prefers-color-scheme: dark)').matches;
            case 'auto_sunset':
                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();
                const [sunriseHour, sunriseMinute] = settings.sunriseTime.split(':').map(Number);
                const [sunsetHour, sunsetMinute] = settings.sunsetTime.split(':').map(Number);
                const sunriseTime = sunriseHour * 60 + sunriseMinute;
                const sunsetTime = sunsetHour * 60 + sunsetMinute;
                return currentTime < sunriseTime || currentTime >= sunsetTime;
            default:
                return false;
        }
    }

    // Function to update popup theme
    function updatePopupTheme(settings) {
        const isDark = shouldApplyDarkMode(settings);
        document.body.classList.toggle('dark', isDark);
    }

    // Show/hide time settings based on selection
    document.querySelectorAll('input[name="darkMode"]').forEach(input => {
        input.addEventListener('change', (e) => {
            timeSettings.classList.toggle('visible', e.target.value === 'auto_sunset');
            saveSettings();
        });
    });
    
    try {
        // Load saved settings
        const settings = await browser.runtime.sendMessage({ type: 'getSettings' }) || DEFAULT_SETTINGS;
        
        // Apply loaded settings to form
        const modeInput = document.querySelector(`input[value="${settings.mode}"]`);
        if (modeInput) {
            modeInput.checked = true;
            timeSettings.classList.toggle('visible', settings.mode === 'auto_sunset');
        }

        // Set time inputs if they exist
        if (settings.sunriseTime) {
            document.getElementById('sunriseTime').value = settings.sunriseTime;
        }
        if (settings.sunsetTime) {
            document.getElementById('sunsetTime').value = settings.sunsetTime;
        }

        // Initial theme update
        updatePopupTheme(settings);

        // Listen for system theme changes if in system mode
        if (settings.mode === 'system') {
            window.matchMedia('(prefers-color-scheme: dark)').addListener(() => {
                updatePopupTheme(settings);
            });
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }

    // Add event listeners for time input changes
    document.querySelectorAll('input[type="time"]').forEach(input => {
        input.addEventListener('change', async () => {
            await saveSettings();
            const settings = await browser.runtime.sendMessage({ type: 'getSettings' });
            updatePopupTheme(settings);
        });
        input.addEventListener('blur', async () => {
            await saveSettings();
            const settings = await browser.runtime.sendMessage({ type: 'getSettings' });
            updatePopupTheme(settings);
        });
    });
});

async function saveSettings() {
    await new Promise(resolve => setTimeout(resolve, 50));

    const mode = document.querySelector('input[name="darkMode"]:checked')?.value || 'auto_sunset';
    const settings = {
        mode: mode,
        sunriseTime: document.getElementById('sunriseTime')?.value || '06:00',
        sunsetTime: document.getElementById('sunsetTime')?.value || '18:00'
    };

    try {
        await browser.runtime.sendMessage({
            type: 'saveSettings',
            settings: settings
        });

        // Update popup theme after saving
        const savedSettings = await browser.runtime.sendMessage({ type: 'getSettings' });
        document.body.classList.toggle('dark', shouldApplyDarkMode(savedSettings));
        
        console.log('Saved settings verified:', savedSettings);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}
