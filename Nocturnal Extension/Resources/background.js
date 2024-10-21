// Define sunrise & sunset times
let currentSettings = {
    mode: 'auto_sunset',
    sunriseTime: '06:00',
    sunsetTime: '18:00'
};

// Load settings from storage when extension starts
async function loadStoredSettings() {
    try {
        const storedSettings = await browser.storage.local.get('darkModeSettings');
        if (storedSettings.darkModeSettings) {
            currentSettings = storedSettings.darkModeSettings;
        }
    } catch (error) {
        console.error('Error loading stored settings:', error);
    }
}

// Initialize settings
loadStoredSettings();

browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'getSettings') {
        try {
            // Always try to get the latest from storage first
            const storedSettings = await browser.storage.local.get('darkModeSettings');
            if (storedSettings.darkModeSettings) {
                currentSettings = storedSettings.darkModeSettings;
            }
        } catch (error) {
            console.error('Error reading stored settings:', error);
        }
        return Promise.resolve(currentSettings);
    }
    else if (message.type === 'saveSettings') {
        try {
            // Save to both memory and storage
            currentSettings = message.settings;
            await browser.storage.local.set({
                darkModeSettings: currentSettings
            });

            // Notify all tabs about the settings change
            const tabs = await browser.tabs.query({});
            tabs.forEach(tab => {
                try {
                    browser.tabs.sendMessage(tab.id, {
                        type: 'settingsUpdated',
                        settings: currentSettings
                    });
                } catch (error) {
                    console.error('Error notifying tab:', error);
                }
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            return Promise.reject(error);
        }
        return Promise.resolve(currentSettings);
    }
});
