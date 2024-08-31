console.log('[balib-ext] this is content scripts');
const msgFormat = {
  source: 'content',
  action: '',
  msg: '',
};

const wrapMsg = (msg) => {
  return Object.assign({}, msgFormat, msg);
}

// 根据xpath获取元素
const getElByXpath = (xpath) => {
  const el = document.evaluate(xpath, document).iterateNext();
  return el;
}

const sendMessageToBackground = async (msg) => {
  await chrome.runtime.sendMessage(wrapMsg(msg));
}

// 处理消息
const onMessage = async (msgData) => {
  const { source, action } = msgData;
  if(action === 'login'){
    const key = 'loginInfo';
    const res = await chrome.storage.local.get([key]);
    console.log('[onMessage][login] ==> ', res);
    if(res[key]){
      const { account, password } = res[key];
      const accountEl = getElByXpath('/html/body/div/div[3]/div[1]/p[1]/input');
      const passwordEl = getElByXpath('/html/body/div/div[3]/div[1]/p[2]/input');
      const loginEl = getElByXpath('/html/body/div/div[3]/div[1]/div[2]/a');
      // 账号
      accountEl.value = account;
      // 密码
      passwordEl.value = password;
      // 登录
      setTimeout(() => {
        loginEl.dispatchEvent(new Event('click'));
        // loginEl.click();
      }, 500)
    }
  }
}

// 登录
const login = () => {
  const url = new URL(location.href);
  const openerList = url.searchParams.getAll('opener');
  // 页面是由插件打开的情况下才通知后台脚本进行登录, 避开正常手动打开的情况
  if(openerList.includes('balibExt')){
    const msg = {
      action: 'load',
      msg: {
        url: location.href,
      }
    }
    sendMessageToBackground(msg);
  }
}

const onLoad = () => {
  login();
}

// 监听消息
chrome.runtime.onMessage.addListener(onMessage);

window.addEventListener('load', onLoad);