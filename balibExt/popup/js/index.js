console.log('[balib-ext] this is popup scripts');
const urlEl = document.querySelector('#wifi-url');
const accountEl = document.querySelector('#wifi-account');
const passwordEl = document.querySelector('#wifi-password');
const logoutBtn = document.querySelector('.btn.logout');
const saveBtn = document.querySelector('.btn.save');
const connectBtn = document.querySelector('.btn.connect');

// 消息格式
const msgFormat = {
  source: 'popup',
  action: '',
  msg: '',
};

const wrapMsg = (payload) => {
  return Object.assign({}, msgFormat, payload);
};

// 发送消息给 background 
const sendMessageToBackground = (payload) => {
  chrome.runtime.sendMessage(wrapMsg(payload));
};

// 从本地读取数据
const getLocalData = async (key) => {
  const res = await chrome.storage.local.get([key]);
  console.log('[popup] getLocalData ==> ', res);
  return res ? res[key] : null;
};

// 同步信息
const syncLoginInfo = async () => {
  const key = 'loginInfo';
  const res = await getLocalData(key);
  if(res){
    const { url, account, password } = res;
    url && (urlEl.value = url);
    account && (accountEl.value = account);
    password && (passwordEl.value = password);
  }
}

// 保存
const onSaveBtnClick = () => {
  // 登录页地址
  const url = `${urlEl.value}`.trim();
  // 账号
  const account = `${accountEl.value}`.trim();
  // 密码
  const password = `${passwordEl.value}`.trim();
  if([url, account, password].every(v => !v)) return;
  const msgData = {
    action: 'save',
    msg: {
      key: 'loginInfo',
      value: { url, account, password },
    },
  };
  sendMessageToBackground(msgData);
};

// 连接
const onConnectBtnClick = () => {
  const msgData = {
    action: 'login',
    msg: {
      key: 'loginInfo',
    }
  }
  sendMessageToBackground(msgData);
}

// 注销
const onLogoutBtnClick = () => {
  const msgData = {
    action: 'logout',
    msg: {
      key: 'loginInfo',
    }
  };
  sendMessageToBackground(msgData);
}

saveBtn.addEventListener('click', onSaveBtnClick);
connectBtn.addEventListener('click', onConnectBtnClick);
logoutBtn.addEventListener('click', onLogoutBtnClick);

syncLoginInfo();