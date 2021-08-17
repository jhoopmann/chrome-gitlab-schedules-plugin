chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url !== undefined) {
        if (tab.url.match('.+\\/pipeline_schedules\\/(\\d.+\\/edit|new)') !== null) {
            chrome.action.enable(tabId);
        } else {
            chrome.action.disable(tabId);
        }
    }
});