// pakcage.json에서 "main": "src/파일명.확장자명" 을 입력해줘야 연동이 된다.
// 이후 scripts에 "electron": "electron ." 커맨드를 설정해두고 npm run electron을 입력하여 실행한다.window
const { app, BrowserWindow, Tray, Menu, ipcMain} = require('electron')
// 전에 실행했을 때의 위치와 크기를 기억하고 불러오는 역할
const Store = require('electron-store');

let tray; // 트레이 객체를 담을 변수 선언
let win;
let store; // store 변수를 전역 범위로 이동. createWindow 함수 외, 내부에서 같이 쓰기 위함.

function createWindow () {

  // electron app 시작 시 맨 우측에 실행되기 위한 코드
  const { screen } = require('electron');

  // screen.getPrimaryDisplay().workAreaSize는 무조건 width와 height의 문구로 사용해야 하며 다른 이름으로 사용하고 싶으면 { width: garo, height: sero } 이렇게 사용해야 한다.
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  // 초기에 저장되는 위치 크기 선언.
  store = new Store({
    defaults: {
      windowBounds: { width: 800, height: 645, x: width - 800, y: 0 }
    }
  });
  let { width:garo, height:sero, x, y } = store.get('windowBounds'); // width 명칭이 screen에서 사용되고 있기 때문에 별명 붙임.

  // 저장된 투명도 값 불러오기 (기본값 1.0)
  let transparency = store.get('transparency', 1.0);

  win = new BrowserWindow({ 
    width: garo,
    height: sero,
    x,
    y,
    skipTaskbar: true, // 작업 표시줄 숨기기 여부
    autoHideMenuBar: true, // 윈도우 메뉴바 숨기기 여부
    frame: false, // 창의 윗부분 표시 여부
    resizable: false, // 창 사이즈 조절 가능 여부
    // titleBarStyle: 'hidden',
    // titleBarOverlay: true, // 위에 titleBarStyle로 윗부분은 없애지만 최소, 최대, 끄기 버튼은 창 바로 안 쪽에 표시함.
    opacity: transparency, // 불투명도 0 ~ 1
    webPreferences: { 
      nodeIntegration: true,
      contextIsolation : false,
      enableRemoteModule: true, // 메뉴 클릭 시 기능 추가 할 때 추가한 코드. 필요한 경우 추가 (nodeIntegration이나 contextIsolation 설정에 따라 필요할 수 있음)
    }
  })
  

  tray = new Tray('./src/images/calendarTray.png') // 트레이 객체 이미지와 함께 선언
  tray.setToolTip('MyCalendar') // 트레이에 커서 올릴 시 문구 표시

  // tray 더블클릭 시 창을 열거나 맨 앞으로 가져옴
  tray.on('double-click', () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
      setTimeout(() => { // 짧은 딜레이 후에 focus() 호출
        win.focus()
        win.setAlwaysOnTop(true)
        setTimeout(() => win.setAlwaysOnTop(false), 0)
      }, 100) // 딜레이 시간은 조정 가능
    }
  });

  // 초기 위치 및 크기 저장
  let originalSizeAndPosition;
  originalSizeAndPosition = {
    size: [800, 645],
    position: [width - win.getBounds().width, 0] // 오른쪽에 붙도록 설정
  }
  tray.on('right-click', () => { // 기존의 contextMenu만으로도 우클릭하여 메뉴를 불러올 수 있지만 메뉴 위치 때문에 설정
    let { x, y } = screen.getCursorScreenPoint()
    x += 24;
    y -= 100;
    let contextMenu = Menu.buildFromTemplate([ // 트레이 우클릭 시 메뉴 선언
      {label: '열기', click() { win.show(); }}, // click 함수의 경우 화살표 함수로 못쓴다. 
      { 
        label: '크기 및 위치 초기화', 
        click() { 
          const { size, position } = originalSizeAndPosition;
   
          win.setSize(...size);
          win.setPosition(...position);
        } 
      },
      {label: '투명도 초기화',
      click() {
        win.setOpacity(1);
        store.set('transparency', 1);
      }
      },
      {label: '종료', role: 'quit'}
    ])
    tray.popUpContextMenu(contextMenu, {x, y}); // setContextMenu로는 Tray 메뉴의 위치를 지정할 수 없어 이것을 사용
  });

  win.loadURL("http://localhost:3000");
  
  let sizeAndPositionStack = [];
  // 원본 크기와 위치를 스택에 푸시
  sizeAndPositionStack.push({
    size: win.getSize(),
    position: win.getPosition()
  });

  // 창의 크기와 위치를 이전으로 돌림
  ipcMain.on('reset-window', () => {
    if (sizeAndPositionStack.length > 0) {
      const { size, position } = sizeAndPositionStack[sizeAndPositionStack.length -1];
      
      win.setSize(...size);
      win.setPosition(...position);
    }
  })
  // 현재 창의 크기와 위치를 저장하기 위해 렌더러 프로세스 메세지 수신
  ipcMain.on('save-window', () => {
    const currentPositionSize = {
      size: win.getSize(),
      position: win.getPosition()
    };
    // reset-window해도 이전에 저장한 위치에 올 수 있게 하는 조건문
    if (JSON.stringify(currentPositionSize) !== JSON.stringify(sizeAndPositionStack[sizeAndPositionStack.length -1])) {
      // 현재 최상위 요소와 다른 경우에만 스택에 푸시
      sizeAndPositionStack.push(currentPositionSize);
    }
    
  })
} 

app.whenReady().then(() => { 
  createWindow()

  let isResizable = false;

  // 메뉴 클릭 시 실행되는 기능들
  ipcMain.on('minimizeApp', () => {
    win.minimize();
  });

  ipcMain.on('closeApp', () => {
    app.quit();
  });

  ipcMain.on('toggleResizeMode', () => {
    isResizable = !isResizable; // 현재 상태 반전
    win.resizable = isResizable; // 새 상태 적용

    // 크기 및 위치 조절 모드 시 스크롤바가 생겨 hidden옵션을 줌
    if (isResizable) {
      win.webContents.executeJavaScript(`
        document.body.classList.add("resize-mode");
        document.body.style.overflow = "hidden";
      `);
    } else {
      // resize-mode 클래스를 비활성화 시키고, 스크롤을 다시 활성화 시킴
      win.webContents.executeJavaScript(`
        document.body.classList.remove("resize-mode");
        document.body.style.overflow = "";
      `);
    }
  });

}) 
app.on('window-all-closed', function () { 
  if (process.platform !== 'darwin') app.quit() 
})

// 앱이 종료되기 전에 store 기능을 이용하여 현재 위치, 크기를 저장한다.
app.on('before-quit', () => {
    let { x, y, width:w, height:h } = win.getBounds();
    store.set('windowBounds', { x:x, y:y, width:w,height:h });
});

ipcMain.on('update-opacity', (event, arg) => {
  win.setOpacity(arg);
});

ipcMain.on('transparency-changed', (event, newTransparency) => {
  // 받은 새로운 투명도 값 Electron Store에 저장 
  store.set('transparency', newTransparency);
});
// 현재 투명도 표기(스크롤 위치, 수) 업데이트를 위한 반환.
ipcMain.handle('get-transparency', () => {
  return store.get('transparency', 1.0);
});