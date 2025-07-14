// options.js
// 支持多个工作流配置、采集项筛选、输入变量名

function createWorkflowItem(workflow, idx, total) {
  return `
    <div class="workflow-item" data-idx="${idx}">
      <label>名称 <input type="text" class="wf-name" value="${workflow.name || ""}" required></label>
      <label>服务器URL <input type="text" class="wf-url" value="${workflow.difyUrl || ""}" required></label>
      <label>API Key <input type="text" class="wf-key" value="${workflow.apiKey || ""}" required></label>
      <div class="workflow-actions">
        ${total > 1 ? `<button type="button" class="remove-btn">删除</button>` : ""}
      </div>
    </div>
  `;
}

function renderWorkflowList(workflows) {
  const list = document.getElementById("workflowList");
  list.innerHTML = workflows.map((wf, idx) => createWorkflowItem(wf, idx, workflows.length)).join("");
}

function getWorkflowsFromDOM() {
  const items = document.querySelectorAll(".workflow-item");
  return Array.from(items).map(item => ({
    name: item.querySelector(".wf-name").value.trim(),
    difyUrl: item.querySelector(".wf-url").value.trim(),
    apiKey: item.querySelector(".wf-key").value.trim()
  }));
}

function getCollectOptionsFromDOM() {
  return Array.from(document.querySelectorAll('input[name="collect"]:checked')).map(i => i.value);
}

function setCollectOptions(options) {
  document.querySelectorAll('input[name="collect"]').forEach(i => {
    i.checked = options.includes(i.value);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const statusDiv = document.getElementById("status");
  const form = document.getElementById("options-form");
  const addBtn = document.getElementById("addWorkflowBtn");
  const inputVarNameInput = document.getElementById("inputVarName");
  let workflows = [];

  // 读取已保存配置
  chrome.storage.sync.get(["workflows", "collectOptions", "inputVarName"], (config) => {
    workflows = Array.isArray(config.workflows) && config.workflows.length
      ? config.workflows
      : [{ name: "默认工作流", difyUrl: "", apiKey: "" }];
    renderWorkflowList(workflows);
    setCollectOptions(config.collectOptions || ["title", "url", "selectedText", "content"]);
    inputVarNameInput.value = config.inputVarName || "webinfo";
  });

  // 添加工作流
  addBtn.addEventListener("click", () => {
    workflows.push({ name: "", difyUrl: "", apiKey: "" });
    renderWorkflowList(workflows);
  });

  // 删除工作流
  document.getElementById("workflowList").addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-btn")) {
      const idx = parseInt(e.target.closest(".workflow-item").dataset.idx, 10);
      workflows.splice(idx, 1);
      renderWorkflowList(workflows);
    }
  });

  // 保存配置
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    workflows = getWorkflowsFromDOM();
    const collectOptions = getCollectOptionsFromDOM();
    const inputVarName = inputVarNameInput.value.trim() || "webinfo";
    chrome.storage.sync.set({ workflows, collectOptions, inputVarName }, () => {
      statusDiv.textContent = "配置已保存！";
      setTimeout(() => { statusDiv.textContent = ""; }, 2000);
    });
  });
});
