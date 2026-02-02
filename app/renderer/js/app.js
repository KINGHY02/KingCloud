// 应用程序主脚本
$(document).ready(function() {
  let selectedTool = null;
  let tools = [];

  // 初始化应用
  function initApp() {
    showLoading('加载工具列表...');
    // 获取工具列表
    window.api.getTools().then(data => {
      tools = data;
      renderToolList();
      hideLoading();
    }).catch(error => {
      console.error('获取工具列表失败:', error);
      hideLoading();
      showStatusMessage('获取工具列表失败', 'error');
    });

    // 绑定事件
    bindEvents();
  }

  // 渲染工具列表
  function renderToolList() {
    const toolList = $('#tool-list');
    toolList.empty();

    tools.forEach(tool => {
      const li = $('<li></li>');
      const button = $('<button></button>')
        .text(tool.name)
        .on('click', function() {
          selectTool(tool);
        });
      li.append(button);
      toolList.append(li);
    });
  }

  // 选择工具
  function selectTool(tool) {
    selectedTool = tool;

    // 更新UI
    $('.tool-list button').removeClass('active');
    $('.tool-list button').each(function() {
      if ($(this).text() === tool.name) {
        $(this).addClass('active');
      }
    });

    // 更新工具详情
    $('#tool-name').text(tool.name);
    $('#config-file').text(tool.config);
    $('#proxy-port').text(tool.port);
    $('#proxy-type').text(tool.proxyType);
    $('#status-text').text('未运行');

    // 重置状态
    $('#tool-status .status-indicator').removeClass('online').addClass('offline');
    $('#tool-status span:last').text('未运行');
    $('#ip-update-status').text('');
    $('#tool-status-message').text('');

    // 检查工具状态
    checkToolStatus(tool.id);
  }

  // 检查工具状态
  function checkToolStatus(toolId) {
    window.api.checkToolStatus(toolId).then(status => {
      if (status.running) {
        updateToolStatus(true);
      } else {
        updateToolStatus(false);
      }
    }).catch(error => {
      console.error('检查工具状态失败:', error);
    });
  }

  // 更新工具状态
  function updateToolStatus(isRunning) {
    if (isRunning) {
      $('#tool-status .status-indicator').removeClass('offline').addClass('online');
      $('#tool-status span:last').text('运行中');
      $('#status-text').text('运行中');
    } else {
      $('#tool-status .status-indicator').removeClass('online').addClass('offline');
      $('#tool-status span:last').text('未运行');
      $('#status-text').text('未运行');
    }
  }

  // 执行IP更新
  function updateIp(toolId, ipIndex) {
    showLoading(`更新IP ${ipIndex}...`);
    // 先检查工具是否正在运行
    window.api.checkToolStatus(toolId).then(status => {
      const wasRunning = status.running;
      
      window.api.updateIp(toolId, ipIndex).then(result => {
        hideLoading();
        showStatusMessage(`IP ${ipIndex} 更新成功`, 'success', '#ip-update-status');
        
        // 如果工具之前正在运行，重启它以应用新的IP配置
        if (wasRunning) {
          showLoading('重启代理工具以应用新配置...');
          window.api.stopTool(toolId).then(() => {
            setTimeout(() => {
              window.api.startTool(toolId).then(() => {
                hideLoading();
                updateToolStatus(true);
                showStatusMessage('代理工具已重启，新IP配置已应用', 'success', '#tool-status-message');
              }).catch(error => {
                hideLoading();
                showStatusMessage(`重启工具失败: ${error.message}`, 'error', '#tool-status-message');
              });
            }, 500);
          }).catch(error => {
            hideLoading();
            showStatusMessage(`停止工具失败: ${error.message}`, 'error', '#tool-status-message');
          });
        }
      }).catch(error => {
        hideLoading();
        showStatusMessage(`IP ${ipIndex} 更新失败: ${error.message}`, 'error', '#ip-update-status');
      });
    }).catch(error => {
      console.error('检查工具状态失败:', error);
      // 继续执行IP更新
      window.api.updateIp(toolId, ipIndex).then(result => {
        hideLoading();
        showStatusMessage(`IP ${ipIndex} 更新成功`, 'success', '#ip-update-status');
      }).catch(error => {
        hideLoading();
        showStatusMessage(`IP ${ipIndex} 更新失败: ${error.message}`, 'error', '#ip-update-status');
      });
    });
  }

  // 启动工具
  function startTool(toolId) {
    showLoading('启动工具...');
    window.api.startTool(toolId).then(result => {
      hideLoading();
      updateToolStatus(true);
      showStatusMessage('工具启动成功', 'success', '#tool-status-message');
    }).catch(error => {
      hideLoading();
      showStatusMessage(`工具启动失败: ${error.message}`, 'error', '#tool-status-message');
    });
  }

  // 停止工具
  function stopTool(toolId) {
    showLoading('停止工具...');
    window.api.stopTool(toolId).then(result => {
      hideLoading();
      updateToolStatus(false);
      showStatusMessage('工具停止成功', 'success', '#tool-status-message');
    }).catch(error => {
      hideLoading();
      showStatusMessage(`工具停止失败: ${error.message}`, 'error', '#tool-status-message');
    });
  }

  // 打开浏览器
  function openBrowser(toolId) {
    showLoading('打开浏览器...');
    window.api.openBrowser(toolId).then(result => {
      hideLoading();
      showStatusMessage('浏览器已打开', 'success', '#tool-status-message');
    }).catch(error => {
      hideLoading();
      showStatusMessage(`打开浏览器失败: ${error.message}`, 'error', '#tool-status-message');
    });
  }

  // 显示加载动画
  function showLoading(message = '加载中...') {
    $('#loading').show().find('p').text(message);
  }

  // 隐藏加载动画
  function hideLoading() {
    $('#loading').hide();
  }

  // 显示状态消息
  function showStatusMessage(message, type, selector = '#tool-status-message') {
    const statusElement = $(selector);
    statusElement.text(message)
      .removeClass('success error')
      .addClass(type);

    // 3秒后清除消息
    setTimeout(() => {
      statusElement.text('').removeClass('success error');
    }, 3000);
  }

  // 绑定事件
  function bindEvents() {
    // IP更新按钮
    $('.btn-ip').on('click', function() {
      if (!selectedTool) {
        showStatusMessage('请先选择一个工具', 'error', '#ip-update-status');
        return;
      }

      const ipIndex = $(this).data('index');
      updateIp(selectedTool.id, ipIndex);
    });

    // 启动按钮
    $('#start-btn').on('click', function() {
      if (!selectedTool) {
        showStatusMessage('请先选择一个工具', 'error');
        return;
      }

      startTool(selectedTool.id);
    });

    // 停止按钮
    $('#stop-btn').on('click', function() {
      if (!selectedTool) {
        showStatusMessage('请先选择一个工具', 'error');
        return;
      }

      stopTool(selectedTool.id);
    });

    // 打开浏览器按钮
    $('#open-browser-btn').on('click', function() {
      if (!selectedTool) {
        showStatusMessage('请先选择一个工具', 'error');
        return;
      }

      openBrowser(selectedTool.id);
    });

    // 主题切换
    $('#theme-toggle').on('click', function() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
    });

    // 帮助按钮
    $('#help-btn').on('click', function() {
      alert('KingCloud 帮助\n\n1. 选择代理工具\n2. 更新IP地址（可选）\n3. 启动代理服务\n4. 打开浏览器访问网络\n\n如有问题，请联系技术支持。');
    });

    // 免责声明按钮
    $(document).on('click', '#disclaimer-btn', function() {
      $('#disclaimer-content').toggleClass('show');
    });

    // 关闭免责声明
    $(document).on('click', '#close-disclaimer', function() {
      $('#disclaimer-content').removeClass('show');
    });

    // 点击外部关闭免责声明
    $(document).on('click', function(event) {
      if (!$(event.target).closest('.disclaimer').length) {
        $('#disclaimer-content').removeClass('show');
      }
    });
  }

  // 初始化应用
  initApp();
});