// content.js
// Collect page information based on configuration

console.log("Dify extension content script loaded.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content script:", message);
  if (message.action === "getPageInfo") {
    chrome.storage.sync.get(["collectOptions", "contentMaxLength"], (config) => {
      const opts = config.collectOptions || ["title", "url", "selectedText", "content"];
      const maxLen = typeof config.contentMaxLength === "number" ? config.contentMaxLength : 2000;
      const pageInfo = {};
      if (opts.includes("url")) pageInfo.url = window.location.href;
      if (opts.includes("title")) pageInfo.title = document.title;
      if (opts.includes("selectedText")) {
        let sel = window.getSelection ? window.getSelection().toString() : "";
        if (!sel && window.location.hash.includes(":~:text=")) {
          const fragment = window.location.hash.split(":~:text=")[1].split(",")[0];
          sel = decodeURIComponent(fragment);
        }
        pageInfo.selectedText = sel;
      }
      if (opts.includes("content")) {
        const raw = document.body ? document.body.innerText : "";
        pageInfo.content = raw.slice(0, maxLen);
      }
      console.log("Sending page info:", pageInfo);
      sendResponse(pageInfo);
    });
    return true; // Asynchronous
  }
  return false;
});
