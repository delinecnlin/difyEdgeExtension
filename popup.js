// popup.js
// 支持多工作流选择、发送、配置入口

function loadWorkflows(cb) {
  chrome.storage.sync.get(["workflows"], (config) => {
    const workflows = Array.isArray(config.workflows) && config.workflows.length
      ? config.workflows
      : [{ name: "默认工作流", difyUrl: "", apiKey: "", workflowId: "" }];
    cb(workflows);
  });
}

function renderWorkflowSelect(workflows) {
  const select = document.getElementById("workflowSelect");
  select.innerHTML = workflows.map((wf, idx) =>
    `<option value="${idx}">${wf.name || wf.workflowId || "未命名"}</option>`
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
    statusDiv.textContent = "正在获取页面信息...";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) {
        statusDiv.textContent = "未找到活动页面。";
        return;
      }
      const tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, { action: "getPageInfo" }, (pageInfo) => {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = `错误: ${chrome.runtime.lastError.message}`;
          console.error(chrome.runtime.lastError);
          return;
        }
        if (!pageInfo) {
          statusDiv.textContent = "无法获取页面信息。请刷新页面或尝试其他页面。";
          return;
        }
        statusDiv.textContent = "正在调用 Dify 工作流...";
        chrome.runtime.sendMessage(
          { action: "callDifyWorkflow", workflowIdx: idx, pageInfo },
          (response) => {
            if (response && response.status === "ok") {
              statusDiv.textContent = "已发送到 Dify 工作流！";
            } else {
              statusDiv.textContent = "调用失败，请检查配置。";
            }
            setTimeout(() => { statusDiv.textContent = ""; }, 2000);
          }
        );
      });
      // 超时处理，防止无响应卡死
      setTimeout(() => {
        if (statusDiv.textContent === "正在调用 Dify 工作流...") {
          statusDiv.textContent = "调用超时，请检查内容脚本是否正常注入。";
        }
      }, 5000);
    });
  });

  configBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
