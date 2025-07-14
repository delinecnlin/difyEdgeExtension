// content.js
// 根据配置采集页面信息

console.log("Dify extension content script loaded.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content script:", message);
  if (message.action === "getPageInfo") {
    chrome.storage.sync.get(["collectOptions"], (config) => {
      const opts = config.collectOptions || ["title", "url", "selectedText", "content"];
      const pageInfo = {};
      if (opts.includes("url")) pageInfo.url = window.location.href;
      if (opts.includes("title")) pageInfo.title = document.title;
      if (opts.includes("selectedText")) pageInfo.selectedText = window.getSelection ? window.getSelection().toString() : "";
      if (opts.includes("content")) pageInfo.content = document.body ? document.body.innerText.slice(0, 2000) : "";
      console.log("Sending page info:", pageInfo);
      sendResponse(pageInfo);
    });
    return true; // 异步
  }
  return false;
});
