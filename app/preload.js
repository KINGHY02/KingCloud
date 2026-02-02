const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 获取工具列表
  getTools: () => ipcRenderer.invoke('get-tools'),
  
  // 执行IP更新
  updateIp: (toolName, ipIndex) => ipcRenderer.invoke('update-ip', toolName, ipIndex),
  
  // 启动工具
  startTool: (toolName) => ipcRenderer.invoke('start-tool', toolName),
  
  // 停止工具
  stopTool: (toolName) => ipcRenderer.invoke('stop-tool', toolName),
  
  // 检查工具状态
  checkToolStatus: (toolName) => ipcRenderer.invoke('check-tool-status', toolName),
  
  // 打开浏览器
  openBrowser: (toolName) => ipcRenderer.invoke('open-browser', toolName)
});