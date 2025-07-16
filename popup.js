// popup.js
// 支持多工作流选择、发送、配置入口

function loadWorkflows(cb) {
  chrome.storage.sync.get(["workflows"], (config) => {
    const workflows = Array.isArray(config.workflows) && config.workflows.length
      ? config.workflows
      : [{ name: "Default Workflow", difyUrl: "", apiKey: "", workflowId: "" }];
    cb(workflows);
  });
}

function renderWorkflowSelect(workflows) {
  const select = document.getElementById("workflowSelect");
  select.innerHTML = workflows.map((wf, idx) =>
    `<option value="${idx}">${wf.name || wf.workflowId || "Unnamed"}</option>`
  ).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const statusDiv = document.getElementById("status");
  const sendBtn = document.getElementById("sendBtn");
  const configBtn = document.getElementById("configBtn");
  const select = document.getElementById("workflowSelect");
  let workflows = [];

  loadWorkflows((wfList) => {
    workflows = wfList;
    renderWorkflowSelect(workflows);
  });

  sendBtn.addEventListener("click", () => {
    const idx = parseInt(select.value, 10) || 0;
    statusDiv.textContent = "Retrieving page information...";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) {
        statusDiv.textContent = "No active page found.";
        return;
      }
      const tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, { action: "getPageInfo" }, (pageInfo) => {
        if (chrome.runtime.lastError) {
          // 友好提示
          if (
            chrome.runtime.lastError.message &&
            chrome.runtime.lastError.message.includes("Could not establish connection")
          ) {
            statusDiv.textContent = "Current page not supported for data collection.";
          } else {
            statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
          }
          console.error(chrome.runtime.lastError);
          return;
        }
        if (!pageInfo) {
          statusDiv.textContent = "Unable to retrieve page information. Please refresh page or try another page.";
          return;
        }
        statusDiv.textContent = "Calling Dify Workflow...";
        chrome.runtime.sendMessage(
          { action: "callDifyWorkflow", workflowIdx: idx, pageInfo },
          (response) => {
            if (response && response.status === "ok") {
              statusDiv.textContent = "Sent to Dify Workflow!";
            } else {
              statusDiv.textContent = "Call failed. Please check your configuration.";
            }
            setTimeout(() => { statusDiv.textContent = ""; }, 2000);
          }
        );
      });
      // Timeout handling to prevent hanging when no response
      setTimeout(() => {
        if (statusDiv.textContent === "Calling Dify Workflow...") {
          statusDiv.textContent = "Call timed out. Please check if content script is properly injected.";
        }
      }, 5000);
    });
  });

  configBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
