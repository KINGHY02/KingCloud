const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');

// 工具配置
const tools = {
  'clash.meta': {
    name: 'Clash.Meta',
    path: 'clash.meta/clash.meta-windows-386.exe',
    configPath: 'clash.meta/config.yaml',
    port: 7890,
    proxyType: 'http'
  },
  'Xray': {
    name: 'Xray',
    path: 'Xray/xray.exe',
    configPath: 'Xray/config.json',
    port: 10808,
    proxyType: 'socks5'
  },
  'hysteria': {
    name: 'Hysteria',
    path: 'hysteria/hysteria-tun-windows-6.0-386.exe',
    configPath: 'hysteria/config.json',
    port: 10809,
    proxyType: 'socks5'
  },
  'hysteria2': {
    name: 'Hysteria2',
    path: 'hysteria2/hysteria2.exe',
    configPath: 'hysteria2/config.yaml',
    port: 10810,
    proxyType: 'socks5'
  },
  'juicity': {
    name: 'Juicity',
    path: 'juicity/juicity-client.exe',
    configPath: 'juicity/config.json',
    port: 10811,
    proxyType: 'socks5'
  },
  'mieru': {
    name: 'Mieru',
    path: 'mieru/mieru.exe',
    configPath: 'mieru/config.json',
    port: 10812,
    proxyType: 'socks5'
  },
  'naiveproxy': {
    name: 'NaiveProxy',
    path: 'naiveproxy/naive.exe',
    configPath: 'naiveproxy/config.json',
    port: 10813,
    proxyType: 'http'
  },
  'shadowquic': {
    name: 'ShadowQuic',
    path: 'shadowquic/shadowquic.exe',
    configPath: 'shadowquic/config.json',
    port: 10814,
    proxyType: 'socks5'
  },
  'singbox': {
    name: 'SingBox',
    path: 'singbox/sing-box.exe',
    configPath: 'singbox/config.json',
    port: 10815,
    proxyType: 'socks5'
  }
};

// 工具进程管理
const toolProcesses = {};

// 创建窗口
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '..', 'icons', '512.png')
  });

  // 隐藏默认菜单栏
  mainWindow.setMenu(null);

  // 加载应用
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 窗口关闭时清理进程
  mainWindow.on('closed', () => {
    // 停止所有运行中的工具
    for (const toolName in toolProcesses) {
      if (toolProcesses[toolName]) {
        try {
          toolProcesses[toolName].kill();
          console.log(`停止工具: ${toolName}`);
        } catch (error) {
          console.log(`停止工具失败 ${toolName}:`, error);
        }
      }
    }
  });
}

// 应用就绪
app.whenReady().then(createWindow);

// 关闭所有窗口时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 激活应用时创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 获取工具列表
ipcMain.handle('get-tools', () => {
  return Object.keys(tools).map(key => ({
    id: key,
    name: tools[key].name
  }));
});

// 更新IP
ipcMain.handle('update-ip', (event, toolName, ipSource) => {
  return new Promise((resolve, reject) => {
    console.log('更新IP:', toolName, ipSource);
    
    // 构建脚本路径
    let scriptPath;
    if (app.isPackaged) {
      // 打包环境
      const resourcesPath = process.resourcesPath;
      scriptPath = path.join(resourcesPath, 'clash.meta', 'ip_Update', `ip_${ipSource}.bat`);
    } else {
      // 开发环境
      scriptPath = path.join(__dirname, '..', 'clash.meta', 'ip_Update', `ip_${ipSource}.bat`);
    }
    
    console.log('IP更新脚本路径:', scriptPath);
    
    // 检查脚本是否存在
    if (!fs.existsSync(scriptPath)) {
      console.log('IP更新脚本不存在:', scriptPath);
      reject(new Error('IP更新脚本不存在'));
      return;
    }
    
    // 检查wget.exe是否存在
    let wgetPath;
    if (app.isPackaged) {
      // 打包环境
      const resourcesPath = process.resourcesPath;
      wgetPath = path.join(resourcesPath, 'wget.exe');
    } else {
      // 开发环境
      wgetPath = path.join(__dirname, '..', 'wget.exe');
    }
    
    console.log('wget.exe路径:', wgetPath);
    
    if (!fs.existsSync(wgetPath)) {
      console.log('wget.exe不存在，尝试复制');
      // 尝试从项目根目录复制wget.exe
      const sourceWget = path.join(__dirname, '..', 'wget.exe');
      if (fs.existsSync(sourceWget)) {
        try {
          fs.copyFileSync(sourceWget, wgetPath);
          console.log('wget.exe复制成功');
        } catch (error) {
          console.log('wget.exe复制失败:', error);
          reject(new Error('wget.exe复制失败'));
          return;
        }
      } else {
        console.log('wget.exe源文件不存在');
        reject(new Error('wget.exe不存在'));
        return;
      }
    }
    
    // 确保wget.exe有执行权限
    try {
      fs.chmodSync(wgetPath, 0o755);
      console.log('wget.exe权限设置成功');
    } catch (error) {
      console.log('wget.exe权限设置失败:', error);
      // 权限设置失败不阻止执行，继续尝试
    }
    
    // 直接执行IP更新逻辑，避免使用脚本中的交互命令
    console.log('开始执行IP更新逻辑');
    
    try {
      // 获取IP源
      const scriptFileName = path.basename(scriptPath);
      const ipSource = scriptFileName.split('ip_')[1].split('.bat')[0];
      console.log('脚本文件名:', scriptFileName);
      console.log('IP源:', ipSource);
      
      // 定义下载链接（从脚本中提取）
      const downloadUrls = [
        `https://www.gitlabip.xyz/Alvin9999/PAC/refs/heads/master/backup/img/1/2/ipp/clash.meta2/${ipSource}/config.yaml`,
        `https://gitlab.com/free9999/ipupdate/-/raw/master/backup/img/1/2/ipp/clash.meta2/${ipSource}/config.yaml`
      ];
      
      console.log('下载链接:', downloadUrls);
      
      // 确保目录存在
      const ipUpdateDir = path.dirname(scriptPath);
      console.log('IP更新目录:', ipUpdateDir);
      
      if (!fs.existsSync(ipUpdateDir)) {
        console.log('IP更新目录不存在，尝试创建');
        try {
          fs.mkdirSync(ipUpdateDir, { recursive: true });
          console.log('IP更新目录创建成功');
        } catch (error) {
          console.log('IP更新目录创建失败:', error);
          reject(new Error('IP更新失败，无法创建目录'));
          return;
        }
      }
      
      // 目标配置文件路径
      const clashMetaDir = path.join(ipUpdateDir, '..');
      const configPath = path.join(clashMetaDir, 'config.yaml');
      const tempConfigPath = path.join(ipUpdateDir, 'config.yaml');
      const backupPath = path.join(clashMetaDir, 'config.yaml_backup');
      
      console.log('clash.meta目录:', clashMetaDir);
      console.log('配置文件路径:', configPath);
      console.log('临时配置文件路径:', tempConfigPath);
      console.log('备份配置文件路径:', backupPath);
      
      // 确保clash.meta目录存在
      if (!fs.existsSync(clashMetaDir)) {
        console.log('clash.meta目录不存在，尝试创建');
        try {
          fs.mkdirSync(clashMetaDir, { recursive: true });
          console.log('clash.meta目录创建成功');
        } catch (error) {
          console.log('clash.meta目录创建失败:', error);
          reject(new Error('IP更新失败，无法创建目录'));
          return;
        }
      }
      
      // 尝试从链接下载配置文件
      let currentUrlIndex = 0;
      
      function tryDownload() {
        if (currentUrlIndex >= downloadUrls.length) {
          // 所有链接都尝试失败
          console.log('所有下载链接都失败');
          reject(new Error('IP更新失败，无法下载配置文件'));
          return;
        }
        
        const url = downloadUrls[currentUrlIndex];
        console.log(`尝试从链接下载: ${url}`);
        
        // 清理之前的临时文件
        if (fs.existsSync(tempConfigPath)) {
          try {
            fs.unlinkSync(tempConfigPath);
            console.log('之前的临时文件已清理');
          } catch (error) {
            console.log('清理临时文件失败:', error);
          }
        }
        
        // 使用绝对路径的wget.exe下载
        console.log('使用wget.exe路径:', wgetPath);
        
        const child = spawn(wgetPath, ['-t', '2', '--no-check-certificate', url, '-O', tempConfigPath], {
          stdio: 'pipe',
          timeout: 30000
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('error', (error) => {
          console.log(`下载错误 (${url}):`, error);
          currentUrlIndex++;
          tryDownload();
        });
        
        child.on('exit', (code) => {
          console.log(`下载完成 (${url})，退出码:`, code);
          console.log('stdout:', stdout);
          console.log('stderr:', stderr);
          
          if (code === 0 && fs.existsSync(tempConfigPath)) {
            // 检查文件大小
            const fileStats = fs.statSync(tempConfigPath);
            console.log('下载的文件大小:', fileStats.size, '字节');
            
            if (fileStats.size === 0) {
              console.log('下载的文件为空，尝试下一个链接');
              currentUrlIndex++;
              tryDownload();
              return;
            }
            
            // 下载成功
            console.log('下载成功，开始复制配置文件');
            
            try {
              // 备份旧配置文件
              if (fs.existsSync(configPath)) {
                console.log('旧配置文件存在，准备备份');
                if (fs.existsSync(backupPath)) {
                  try {
                    fs.unlinkSync(backupPath);
                    console.log('旧备份文件已删除');
                  } catch (error) {
                    console.log('删除旧备份文件失败:', error);
                  }
                }
                try {
                  fs.renameSync(configPath, backupPath);
                  console.log('旧配置文件已备份');
                } catch (error) {
                  console.log('备份旧配置文件失败:', error);
                  // 继续执行，不阻止更新
                }
              }
              
              // 复制新配置文件
              try {
                fs.copyFileSync(tempConfigPath, configPath);
                console.log('新配置文件已复制');
              } catch (error) {
                console.log('复制新配置文件失败:', error);
                reject(new Error('IP更新失败，无法复制配置文件'));
                return;
              }
              
              // 删除临时文件
              try {
                fs.unlinkSync(tempConfigPath);
                console.log('临时文件已删除');
              } catch (error) {
                console.log('删除临时文件失败:', error);
                // 继续执行，不阻止更新
              }
              
              // 检查工具是否在运行，如果是则重启
              if (toolProcesses[toolName]) {
                console.log('工具正在运行，准备重启:', toolName);
                try {
                  toolProcesses[toolName].kill();
                  console.log('工具已停止:', toolName);
                  
                  // 延迟启动工具
                  setTimeout(() => {
                    startTool(toolName).then(() => {
                      console.log('工具重启成功:', toolName);
                      resolve({ success: true, message: 'IP更新成功，工具已重启' });
                    }).catch((error) => {
                      console.log('工具重启失败:', error);
                      resolve({ success: true, message: 'IP更新成功，但工具重启失败' });
                    });
                  }, 1000);
                } catch (error) {
                  console.log('工具停止失败:', error);
                  resolve({ success: true, message: 'IP更新成功，但工具重启失败' });
                }
              } else {
                resolve({ success: true, message: 'IP更新成功' });
              }
            } catch (error) {
              console.log('配置文件处理失败:', error);
              reject(new Error('IP更新失败，配置文件处理错误'));
            }
          } else {
            // 下载失败，尝试下一个链接
            console.log('下载失败，尝试下一个链接');
            currentUrlIndex++;
            tryDownload();
          }
        });
        
        // 添加超时处理
        const timeout = setTimeout(() => {
          console.log(`下载超时 (${url})`);
          child.kill();
          currentUrlIndex++;
          tryDownload();
        }, 30000);
        
        child.on('exit', () => {
          clearTimeout(timeout);
        });
      }
      
      // 开始下载
      tryDownload();
    } catch (error) {
      console.log('IP更新逻辑执行错误:', error);
      reject(new Error('IP更新失败，内部错误'));
    }
  });
});

// 启动工具
function startTool(toolName) {
  return new Promise((resolve, reject) => {
    const tool = tools[toolName];
    if (!tool) {
      reject(new Error('工具不存在'));
      return;
    }
    
    // 构建工具路径
    let toolPath;
    if (app.isPackaged) {
      // 打包环境
      const resourcesPath = process.resourcesPath;
      toolPath = path.join(resourcesPath, tool.path);
    } else {
      // 开发环境
      toolPath = path.join(__dirname, '..', tool.path);
    }
    
    console.log('启动工具:', toolName);
    console.log('工具路径:', toolPath);
    
    // 检查工具是否存在
    if (!fs.existsSync(toolPath)) {
      console.log('工具不存在:', toolPath);
      reject(new Error('工具不存在'));
      return;
    }
    
    // 检查工具是否已经在运行
    if (toolProcesses[toolName]) {
      console.log('工具已经在运行:', toolName);
      resolve({ success: true, message: '工具已经在运行' });
      return;
    }
    
    // 启动工具
    try {
      let process;
      if (toolName === 'clash.meta') {
        // Clash.Meta需要指定工作目录
        let cwd;
        if (app.isPackaged) {
          cwd = path.join(path.dirname(app.getAppPath()), 'clash.meta');
        } else {
          cwd = path.join(__dirname, '..', 'clash.meta');
        }
        console.log('Clash.Meta工作目录:', cwd);
        process = spawn(toolPath, ['-d', cwd], {
          detached: true,
          stdio: 'ignore'
        });
      } else {
        // 其他工具直接启动
        process = spawn(toolPath, {
          detached: true,
          stdio: 'ignore'
        });
      }
      
      process.unref();
      toolProcesses[toolName] = process;
      console.log('工具启动成功:', toolName);
      
      // 监听进程退出
      process.on('exit', (code) => {
        console.log('工具退出:', toolName, '退出码:', code);
        delete toolProcesses[toolName];
      });
      
      resolve({ success: true, message: '工具启动成功' });
    } catch (error) {
      console.log('工具启动失败:', error);
      reject(new Error('工具启动失败'));
    }
  });
}

// 启动工具
ipcMain.handle('start-tool', (event, toolName) => {
  return startTool(toolName);
});

// 停止工具
ipcMain.handle('stop-tool', (event, toolName) => {
  return new Promise((resolve, reject) => {
    console.log('停止工具:', toolName);
    
    if (toolProcesses[toolName]) {
      try {
        toolProcesses[toolName].kill();
        delete toolProcesses[toolName];
        console.log('工具停止成功:', toolName);
        resolve({ success: true, message: '工具停止成功' });
      } catch (error) {
        console.log('工具停止失败:', error);
        reject(new Error('工具停止失败'));
      }
    } else {
      console.log('工具未运行:', toolName);
      resolve({ success: true, message: '工具未运行' });
    }
  });
});

// 检查工具状态
ipcMain.handle('check-tool-status', (event, toolName) => {
  return new Promise((resolve) => {
    const isRunning = !!toolProcesses[toolName];
    console.log('检查工具状态:', toolName, '运行中:', isRunning);
    resolve({ running: isRunning });
  });
});

// 打开浏览器
ipcMain.handle('open-browser', (event, toolName) => {
  return new Promise((resolve, reject) => {
    const tool = tools[toolName];
    if (!tool) {
      reject(new Error('工具不存在'));
      return;
    }

    // 严格按照原始脚本逻辑，使用固定的代理端口7890
    const proxyUrl = 'http://127.0.0.1:7890';
    const url = 'https://www.google.com';

    // 构建路径，支持开发环境和打包环境
    let projectRoot;
    if (app.isPackaged) {
      // 打包环境 - 额外资源在resources目录中
      projectRoot = process.resourcesPath;
    } else {
      // 开发环境
      projectRoot = path.join(__dirname, '..');
    }
    
    const browserPath = path.join(projectRoot, 'Browser', 'chrome.exe');
    const chromeUserDataPath = path.join(projectRoot, 'chrome-user-data');
    
    console.log('项目根路径:', projectRoot);
    console.log('项目浏览器路径:', browserPath);
    console.log('chrome-user-data路径:', chromeUserDataPath);

    // 严格按照.cmd脚本的逻辑
    if (fs.existsSync(browserPath)) {
      // 使用项目自带的Chrome，按照原始脚本格式构建命令
      console.log('使用项目自带的Chrome');
      // 移除路径中的双引号，与原始脚本保持一致
      const cmd = `${browserPath} --user-data-dir=${chromeUserDataPath} --proxy-server=${proxyUrl} ${url}`;
      console.log('执行命令:', cmd);
      
      exec(cmd, (error) => {
        if (error) {
          console.log('项目Chrome启动失败:', error);
          reject(new Error('Chrome启动失败，请确保Chrome已正确安装'));
        } else {
          resolve({ success: true, message: '浏览器已打开，使用代理访问' });
        }
      });
    } else {
      // 尝试使用系统Chrome
      console.log('尝试使用系统Chrome');
      const cmd = `start chrome.exe --user-data-dir=${chromeUserDataPath} --proxy-server=${proxyUrl} ${url}`;
      console.log('执行命令:', cmd);
      
      exec(cmd, (error) => {
        if (error) {
          console.log('系统Chrome启动失败:', error);
          reject(new Error('Chrome启动失败，请确保Chrome已正确安装'));
        } else {
          resolve({ success: true, message: '浏览器已打开，使用代理访问' });
        }
      });
    }
  });
});