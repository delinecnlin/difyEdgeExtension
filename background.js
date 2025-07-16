 // background.js
 console.log('Dify background service worker started');
 // 支持多个工作流、动态右键菜单、action 默认调用首选工作流

// 注册上下文菜单
function registerContextMenus(workflows) {
  chrome.contextMenus.removeAll(function() {
    for (var i = 0; i < workflows.length; i++) {
      var wf = workflows[i];
      chrome.contextMenus.create({
        id: 'dify-workflow-' + i,
        title: 'Send to: ' + (wf.name || wf.workflowId || 'Unnamed'),
        contexts: ['page', 'selection']
      });
    }
    chrome.contextMenus.create({
      id: 'dify-config',
      title: 'Configure Dify Workflow...',
      contexts: ['page', 'selection']
    });
  });
}

// 初始化
function initMenus() {
  chrome.storage.sync.get(['workflows'], function(cfg) {
    var wfs = Array.isArray(cfg.workflows) && cfg.workflows.length
      ? cfg.workflows
      : [{ name: 'Default Workflow', difyUrl: '', apiKey: '', workflowId: '' }];
    registerContextMenus(wfs);
  });
}
chrome.runtime.onInstalled.addListener(initMenus);
chrome.runtime.onStartup.addListener(initMenus);

// 右键菜单点击
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'dify-config') {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (info.menuItemId.indexOf('dify-workflow-') === 0) {
    var idx = parseInt(info.menuItemId.split('-').pop(), 10);
    gatherPageInfoAndRun(idx, tab.id);
  }
});

// popup 消息
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.action === 'callDifyWorkflow') {
    gatherPageInfoAndRun(msg.workflowIdx || 0, sender.tab.id);
    sendResponse({ status: 'ok' });
  }
  return true;
});

// 点击扩展图标执行默认工作流
function setupClickListeners() {
  console.log('Dify setupClickListeners registered');
  chrome.action.onClicked.addListener(function(tab) {
    handleActionClick(tab.id);
  });
  if (chrome.browserAction && chrome.browserAction.onClicked) {
    chrome.browserAction.onClicked.addListener(function(tab) {
      handleActionClick(tab.id);
    });
  }
}
setupClickListeners();
initMenus();
chrome.action.setPopup({popup: ""});

 // 处理点击
function handleActionClick(tabId) {
  console.log('handleActionClick invoked for tab', tabId);
  gatherPageInfoAndRunDefault(tabId);
}

      // 获取默认并执行
function gatherPageInfoAndRunDefault(tabId) {
  chrome.storage.sync.get(['defaultWorkflowIdx'], function(c) {
    var idx = Number.isInteger(c.defaultWorkflowIdx) ? c.defaultWorkflowIdx : 0;
    // 注入 content.js 脚本，确保脚本已加载
    chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] }, function() {
      setTimeout(function() {
        chrome.tabs.sendMessage(tabId, { action: 'getPageInfo' }, function(pageInfo) {
          if (chrome.runtime.lastError || !pageInfo) {
            pageInfo = {};
          }
          callDifyWorkflowByIndex(idx, pageInfo);
        });
      }, 300);
    });
  });
}

 // 通用：获取页面信息并执行指定工作流
function gatherPageInfoAndRun(idx, tabId) {
  chrome.tabs.sendMessage(tabId, { action: 'getPageInfo' }, function(pageInfo) {
    if (chrome.runtime.lastError || !pageInfo) {
      pageInfo = {};
    }
    callDifyWorkflowByIndex(idx, pageInfo);
  });
}

// 调用
function callDifyWorkflowByIndex(idx, pageInfo) {
  chrome.storage.sync.get(['workflows', 'inputVarName'], function(c) {
    var wfs = Array.isArray(c.workflows) && c.workflows.length ? c.workflows : [];
    var wf = (wfs[idx] || wfs[0]) || { name: '', difyUrl: '', apiKey: '' };
    var inputName = c.inputVarName || 'webinfo';
    if (!wf.difyUrl || !wf.apiKey) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '配置缺失',
        message: '请先在设置中配置服务器 URL 和 API Key'
      });
      return;
    }
    var infoLines = [
      'Title: ' + (pageInfo.title || ''),
      'URL: ' + (pageInfo.url || ''),
      'Selected Text: ' + (pageInfo.selectedText || ''),
      'Content: ' + (pageInfo.content || '')
    ];
    var payload = { inputs: {}, user: 'edge-extension-user' };
    var inputStr = infoLines.join('\n');
    if (inputStr.length > 3500) {
      console.warn('Truncate webinfo, length:', inputStr.length);
      inputStr = inputStr.slice(0, 3500);
    }
    payload.inputs[inputName] = inputStr;
    fetch(wf.difyUrl + '/v1/workflows/run', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + wf.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(function(resp) { return resp.text().then(function(text) { return { ok: resp.ok, status: resp.status, text: text }; }); })
      .then(function(r) {
        console.error('Dify response:', r);
        if (r.ok) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '调用成功',
            message: '成功触发: ' + (wf.name || 'Unnamed')
          });
        } else {
          console.error('Dify error details:', r.text);
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '调用失败',
            message: '状态: ' + r.status
          });
        }
      })
      .catch(function(err) {
        console.error('Dify exception:', err);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: '调用异常',
          message: err.message
        });
      });
  });
}

// 监听配置变更刷新菜单
chrome.storage.onChanged.addListener(function(changes, area) {
  if (area === 'sync' && changes.workflows) {
    registerContextMenus(changes.workflows.newValue || []);
  }
});
