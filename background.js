// background.js
// 支持多个工作流、动态右键菜单、action 默认调用第一个

function registerContextMenus(workflows) {
  chrome.contextMenus.removeAll(() => {
    workflows.forEach((wf, idx) => {
      chrome.contextMenus.create({
        id: "dify-workflow-" + idx,
        title: `Send to: ${wf.name || wf.workflowId || "Unnamed"}`,
        contexts: ["page", "selection"]
      });
    });
    chrome.contextMenus.create({
      id: "dify-config",
      title: "Configure Dify Workflow...",
      contexts: ["page", "selection"]
    });
  });
}

// 安装/启动时注册菜单
function initMenus() {
  chrome.storage.sync.get(["workflows"], (config) => {
    const workflows = Array.isArray(config.workflows) && config.workflows.length
      ? config.workflows
      : [{ name: "Default Workflow", difyUrl: "", apiKey: "", workflowId: "" }];
    registerContextMenus(workflows);
  });
}
chrome.runtime.onInstalled.addListener(initMenus);
chrome.runtime.onStartup.addListener(initMenus);

// 监听菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "dify-config") {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (info.menuItemId.startsWith("dify-workflow-")) {
    const idx = parseInt(info.menuItemId.replace("dify-workflow-", ""), 10);
    chrome.tabs.sendMessage(tab.id, { action: "getPageInfo" }, (response) => {
      if (response) {
        callDifyWorkflowByIndex(idx, response);
      }
    });
  }
});

// 监听 popup 或 action 消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "callDifyWorkflow") {
    callDifyWorkflowByIndex(message.workflowIdx || 0, message.pageInfo);
    sendResponse({ status: "ok" });
  }
  return true;
});

// action 左键点击默认调用第一个工作流
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "getPageInfo" }, (response) => {
    if (response) {
      callDifyWorkflowByIndex(0, response);
    }
  });
});

// 调用指定序号的工作流
function callDifyWorkflowByIndex(idx, pageInfo) {
  chrome.storage.sync.get(["workflows", "inputVarName"], (config) => {
    const workflows = Array.isArray(config.workflows) && config.workflows.length
      ? config.workflows
      : [{ name: "Default Workflow", difyUrl: "", apiKey: "" }];
    const wf = workflows[idx] || workflows[0];
    const inputVarName = config.inputVarName && typeof config.inputVarName === "string" ? config.inputVarName : "webinfo";
    if (!wf.difyUrl || !wf.apiKey) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Dify Configuration Missing",
        message: "Please configure Dify server URL and API Key in extension options first."
      });
      return;
    }
    const formattedInfo = `
Title: ${pageInfo.title || ""}
URL: ${pageInfo.url || ""}
Selected Text: ${pageInfo.selectedText || ""}
Content: ${pageInfo.content || ""}
`.trim();

    fetch(`${wf.difyUrl}/v1/workflows/run`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${wf.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: { [inputVarName]: formattedInfo }, user: "edge-extension-user" })
    }).then(async res => {
      console.log("Dify API Response Status:", res.status);
      const responseText = await res.text();
      console.log("Dify API Response Body:", responseText);
      if (res.ok) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Dify Call Successful",
          message: `Successfully called: ${wf.name || "Unnamed Workflow"}`
        });
      } else {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Dify Call Failed",
          message: `Status: ${res.status}, Response: ${responseText.slice(0, 100)}`
        });
      }
    }).catch(e => {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Dify Call Exception",
        message: e.message
      });
    });
  });
}

// 配置变更时动态更新菜单
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.workflows) {
    const workflows = changes.workflows.newValue || [];
    registerContextMenus(workflows);
  }
});
