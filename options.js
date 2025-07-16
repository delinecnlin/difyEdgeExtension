// options.js
// 支持工作流卡片展示、增加/删除/编辑、导入导出配置、美观交互（无ID字段）

function renderWorkflowCards(workflows) {
  const list = document.getElementById("workflowList");
  if (!workflows.length) {
    list.innerHTML = '<div style="color:#888;text-align:center;padding:18px 0;">No saved workflows</div>';
    return;
  }
  list.innerHTML = workflows.map((wf, idx) => `
    <div class="workflow-card" data-idx="${idx}">
      <div class="workflow-card-title">${wf.name || "Unnamed"}</div>
      <div class="workflow-card-meta">URL: ${wf.difyUrl || "-"}</div>
      <div class="workflow-card-meta">API Key: ${wf.apiKey ? "••••••••" : "-"}</div>
      <div class="workflow-card-actions">
        <button type="button" class="edit-btn">Edit</button>
        <button type="button" class="remove-btn">Delete</button>
      </div>
    </div>
  `).join("");
}

function showWorkflowForm(editIdx = null, wf = null) {
  const form = document.getElementById("workflowForm");
  form.classList.remove("hidden");
  form.dataset.editIdx = editIdx !== null ? editIdx : "";
  document.getElementById("wfName").value = wf ? wf.name : "";
  document.getElementById("wfUrl").value = wf ? wf.difyUrl : "";
  document.getElementById("wfApiKey").value = wf ? wf.apiKey : "";
}

function hideWorkflowForm() {
  const form = document.getElementById("workflowForm");
  form.classList.add("hidden");
  form.reset && form.reset();
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

document.addEventListener("DOMContentLoaded", () => {
  const statusDiv = document.getElementById("status");
  const optionsForm = document.getElementById("options-form");
  const addBtn = document.getElementById("addWorkflowBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  const workflowForm = document.getElementById("workflowForm");
  const cancelAddBtn = document.getElementById("cancelAddBtn");
  const saveWorkflowBtn = document.getElementById("saveWorkflowBtn");
  const inputVarNameInput = document.getElementById("inputVarName");
  let workflows = [];

  // 读取已保存配置
  chrome.storage.sync.get(["workflows", "collectOptions", "inputVarName", "contentMaxLength", "defaultWorkflowIdx"], (config) => {
    workflows = Array.isArray(config.workflows) && config.workflows.length
      ? config.workflows
      : [];
    renderWorkflowCards(workflows);
    setCollectOptions(config.collectOptions || ["title", "url", "selectedText", "content"]);
    inputVarNameInput.value = config.inputVarName || "webinfo";
    document.getElementById("contentMaxLength").value = config.contentMaxLength || 2000;
    const defaultSelect = document.getElementById("defaultWorkflowIdx");
    defaultSelect.innerHTML = workflows.map((wf, idx) => `<option value="${idx}">${wf.name || wf.workflowId || "Unnamed"}</option>`).join("");
    defaultSelect.value = Number.isInteger(config.defaultWorkflowIdx) ? config.defaultWorkflowIdx : 0;
    defaultSelect.addEventListener("change", () => {
      chrome.storage.sync.set({ defaultWorkflowIdx: parseInt(defaultSelect.value, 10) }, () => {
        statusDiv.textContent = "默认工作流已更新";
        setTimeout(() => { statusDiv.textContent = ""; }, 1800);
      });
    });
  });

  // 展示新增表单
  addBtn.addEventListener("click", () => {
    showWorkflowForm();
  });

  // 取消新增/编辑
  cancelAddBtn.addEventListener("click", () => {
    hideWorkflowForm();
  });

  // 保存工作流（新增或编辑）
  workflowForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const wf = {
      name: document.getElementById("wfName").value.trim(),
      difyUrl: document.getElementById("wfUrl").value.trim(),
      apiKey: document.getElementById("wfApiKey").value.trim()
    };
    const editIdx = workflowForm.dataset.editIdx;
    if (editIdx !== "" && !isNaN(editIdx)) {
      workflows[Number(editIdx)] = wf;
    } else {
      workflows.push(wf);
    }
    chrome.storage.sync.set({ workflows }, () => {
      renderWorkflowCards(workflows);
      hideWorkflowForm();
      statusDiv.textContent = "Workflow saved!";
      setTimeout(() => { statusDiv.textContent = ""; }, 1800);
    });
  });

  // 删除/编辑工作流
  document.getElementById("workflowList").addEventListener("click", (e) => {
    const card = e.target.closest(".workflow-card");
    if (!card) return;
    const idx = parseInt(card.dataset.idx, 10);
    if (e.target.classList.contains("remove-btn")) {
      workflows.splice(idx, 1);
      chrome.storage.sync.set({ workflows }, () => {
        renderWorkflowCards(workflows);
        statusDiv.textContent = "Workflow deleted";
        setTimeout(() => { statusDiv.textContent = ""; }, 1200);
      });
    } else if (e.target.classList.contains("edit-btn")) {
      showWorkflowForm(idx, workflows[idx]);
    }
  });

  // 导出配置
  exportBtn.addEventListener("click", () => {
    chrome.storage.sync.get(null, (all) => {
      downloadJSON(all, "dify-extension-config.json");
    });
  });

  // 导入配置
  importBtn.addEventListener("click", () => {
    importFile.value = "";
    importFile.click();
  });
  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = JSON.parse(evt.target.result);
        chrome.storage.sync.set(data, () => {
          workflows = Array.isArray(data.workflows) ? data.workflows : [];
          renderWorkflowCards(workflows);
          setCollectOptions(data.collectOptions || ["title", "url", "selectedText", "content"]);
          inputVarNameInput.value = data.inputVarName || "webinfo";
          statusDiv.textContent = "Configuration imported!";
          setTimeout(() => { statusDiv.textContent = ""; }, 1800);
        });
      } catch (err) {
        statusDiv.textContent = "Import failed: invalid file format";
        setTimeout(() => { statusDiv.textContent = ""; }, 2000);
      }
    };
    reader.readAsText(file);
  });

  // 保存采集项和变量名
  optionsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const collectOptions = getCollectOptionsFromDOM();
    const inputVarName = inputVarNameInput.value.trim() || "webinfo";
    const contentMaxLength = parseInt(document.getElementById("contentMaxLength").value, 10) || 2000;
    chrome.storage.sync.set({ collectOptions, inputVarName, contentMaxLength }, () => {
      statusDiv.textContent = "Configuration saved!";
      setTimeout(() => { statusDiv.textContent = ""; }, 1800);
    });
  });

  // 工具函数
  function getCollectOptionsFromDOM() {
    return Array.from(document.querySelectorAll('input[name="collect"]:checked')).map(i => i.value);
  }
  function setCollectOptions(options) {
    document.querySelectorAll('input[name="collect"]').forEach(i => {
      i.checked = options.includes(i.value);
    });
  }
});
