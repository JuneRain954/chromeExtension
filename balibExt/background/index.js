console.log('[balib-ext][background] this is background scripts');

// 接口集合
const apiMap = {
  LOGIN: 'http://10.21.1.253:9088/Radius/readerLogin', // wifi的登录接口
  LOGOUT: 'http://10.21.1.253:9088/Radius/readerLogout', // wifi的注销接口
};

// 弹窗消息集合
const msgMap = {
  LACK_OF_LOGIN_INFO: '没有获取到登录页地址/账号/密码信息噢~输入信息并且保存后再试试吧~',
  NETWORK_ERR: '网络错误啦，再来一次吧~',
  LOGIN_SUCCESS: '登录成功！快刷新页面试试~',
  SAVE_SUCCESS: '信息保存成功~',
  WRONG: '发生意外啦，再来一次吧~',
  LOGOUT_FAIL: '注销失败，再来一次吧~',
  LOGOUT_SUCCESS: '注销成功',
}

// 消息来源映射
const sourceMap = {
  POPUP: 'popup',
  CONTENT: 'content',
};

// 消息动作类型映射
const actionMap = {
  SAVE: 'save',
  LOGIN: 'login',
  LOAD: 'load',
  LOGOUT: 'logout',
};

const sleep = (time = 300) => {
  const suspend = (resolve) => setTimeout(resolve, time);
  return new Promise(suspend);
}

const sendMsgToTab = (id, msg) => {
  chrome.tabs.sendMessage(id, msg);
}

// 创建新标签页
const createTab = async (url, active = true) => {
  const res = await chrome.tabs.create({ url, active });
  return res;
}

const closeTabById = async (id) => {
  await chrome.tabs.remove(id);
}

const closeTabByUrl = async (url) => {
  const [tab] = await chrome.tabs.query({ url });
  tab && closeTabById(tab.id);
}

// 打开登录页面
const openLoginPage = async (msg) => {
  const res = await getLocalData(msg.key);
  if (!res) return showNotification({ msg: msgMap.LACK_OF_LOGIN_INFO });
  const webUrl = new URL(res.url);
  // 添加标志: opener 为插件 balibExt
  webUrl.searchParams.append('opener', 'balibExt');
  await createTab(webUrl.toString(), false);
}

// 注销
const logout = async (msg) => {
  const localData = await getLocalData(msg.key);
  if(!localData) return showNotification({ msg: msgMap.LOGOUT_FAIL });
  console.log('[logout] ==> ', localData);
  const { url, account: username } = localData;
  const [cookie] = await getAllCookies({ url });
  const config = {
    method: 'GET',
    headers: {
      Cookie: `${cookie.name}=${cookie.value}`
    }
  };
  const param = new URLSearchParams({
    callback: 'checkUser',
    addition: 0,
    username,
  })
  const logoutUrl = `${apiMap.LOGOUT}?${param.toString()}`;
  const res = await fetch(logoutUrl, config);
  const text = await res.text();
  console.log('[logout] ==> ', text, res);
  const resMsg = text === '????' ? msgMap.LOGOUT_SUCCESS : msgMap.LOGOUT_FAIL;
  showNotification({ msg: resMsg });
}


// 处理来自 popup 页面的消息
const onPopupMsg = async (msgData) => {
  console.log('[background][onPopupMsg] ==> ', msgData);
  const { action, msg } = msgData;
  if (action === actionMap.SAVE) {
    saveLocalData(msg.key, msg.value);
  }
  if (action === actionMap.LOGIN) {
    openLoginPage(msg)
  }
  if(action === actionMap.LOGOUT){
    logout(msg);
  }
}

// 请求接口进行登录
const sendRequestToLogin = async (msg) => {
  const cookies = await getAllCookies({ url: msg.url });
  if (cookies.length) {
    const key = 'loginInfo';
    const res = await getLocalData(key);
    if (!res) return showNotification({ msg: msgMap.LACK_OF_LOGIN_INFO });
    const { account, password } = res;
    const [cookie] = cookies;
    const config = {
      method: 'GET',
      mode: 'cors',
      dataType: 'jsonp',
      credentials: 'include',
      headers: {
        Cookie: `${cookie.name}=${cookie.value}`,
        dataType: 'jsonp',
      }
    };
    const param = new URLSearchParams({
      callback: 'checkUser',
      username: account,
      password,
      addition: 0,
    });
    const url = `${apiMap.LOGIN}?${param.toString()}`;
    const ret = await fetch(url, config);
    const text = await ret.text();
    const reg = /\('([a-zA-z0-9%]+)'\)/i;
    let toastTxt = reg.exec(text)?.[1] ?? msgMap.NETWORK_ERR;
    toastTxt = toastTxt === '0' ? msgMap.LOGIN_SUCCESS : toastTxt;
    showNotification({ msg: toastTxt });
  } else {
    // 提示错误
    showNotification({ msg: msgMap.WRONG });
  }
  closeTabByUrl(msg.url);
}

// 处理来自 content 页面的消息
const onContentMsg = (msgData) => {
  console.log('[background][onContentMsg] ==> ', msgData);
  const { action, msg } = msgData;
  if(action === actionMap.LOAD){
    sendRequestToLogin(msg);
  }
}

// 消息处理器
const msgHandlerMap = {
  [sourceMap.POPUP]: onPopupMsg,
  [sourceMap.CONTENT]: onContentMsg,
};

// 消息处理
const onMessage = async (msgData) => {
  console.log('[background][onMessage] ==> ', msgData);
  const { source } = msgData;
  const msgHandler = msgHandlerMap[source];
  msgHandler && msgHandler(msgData);
};

// 展示提示信息
const showNotification = (msg) => {
  const iconUrl = '../icons/logo128.png';
  const { type = 'basic', title = '提示', msg: message } = msg;
  const msgInfo = { type, iconUrl, title, message };
  chrome.notifications.create(msgInfo);
}

// 保存数据到本地
const saveLocalData = async (key, data) => {
  const res = await chrome.storage.local.set({ [key]: data });
  console.log('[background][saveLocalData] ==> ', res);
  showNotification({ msg: msgMap.SAVE_SUCCESS });
}

// 获取本地数据
const getLocalData = async (key) => {
  const res = await chrome.storage.local.get([key]);
  console.log('[background][getLocalData] ==> ', res);
  return res ? res[key] : null;
}

const getAllCookies = async (config) => {
  const res = await chrome.cookies.getAll(config);
  return res;
}


// 监听消息
chrome.runtime.onMessage.addListener(onMessage);
