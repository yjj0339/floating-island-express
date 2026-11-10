const DICT = {
  zh: {
    brandName: '天空邮局 · 浮空岛分局',
    titleA: '浮空岛',
    titleB: '快递',
    subtitle: 'Floating Island Express',
    tagline: '驾驶珊瑚橙小飞机，在云海与浮岛之间穿梭。穿过风环借力加速，把五份天空快递送到指定岛屿。',
    secMode: '飞行模式',
    mOrders: '5 份订单',
    mOrdersD: '依次送达 5 座浮岛，完成第 7 航线',
    mRush: '风环冲刺',
    mRushD: '60 秒内穿越尽可能多的金色风环',
    mFree: '自由飞行',
    mFreeD: '没有时限，随意探索云海与浮岛',
    secCtrl: '操作方式',
    ctrlPitch: '上升 / 下降',
    ctrlTurn: '左右转向',
    ctrlBoost: '加速冲刺',
    ctrlArrows: '方向键同样可用',
    keySpace: '空格',
    start: '开始飞行',
    bestLabel: '最高分',
    footHint: '本地记录 · 支持键盘与触屏',
    route: '天空邮局 · 第 7 航线',
    routeSub: 'ROUTE 07 · SKY POST',
    best: '最佳',
    speed: '速度',
    boost: '冲刺',
    boostShort: '加速',
    pausedEyebrow: 'PAUSED',
    paused: '暂停中',
    pausedLead: '云海很安静，随时可以继续。',
    menu: '返回主菜单',
    resume: '继续飞行',
    again: '再飞一次',
    newBest: '新纪录',
    pickup: '前往 {name} 投递',
    deliverNear: '目标就在前方',
    delivered: '快递已送达 · {n}/5',
    allDone: '第 7 航线完成！',
    ringHit: '+{n} 分 · 风环加速',
    routeTitle: '第 7 航线完成',
    routeLead: '五份天空快递全部送达浮空岛。',
    rushTitle: '冲刺结束',
    rushLead: '60 秒风环挑战结束。',
    freeTitle: '自由飞行结束',
    freeLead: '云海随时等你再来。',
    eyebrowOrders: 'ROUTE 07 COMPLETE',
    eyebrowRush: 'RING SPRINT',
    eyebrowFree: 'FREE FLIGHT',
    statTime: '用时',
    statRings: '风环',
    statBest: '最佳',
    statDelivered: '送达',
    clickHint: '提示：穿过金色风环可以补充冲刺能量',
    hitIsland: '小心浮岛！',
    pkg: '快递',
    langLabel: 'EN',
  },
  en: {
    brandName: 'Sky Post · Floating Branch',
    titleA: 'Island',
    titleB: ' Express',
    subtitle: 'Floating Island Express',
    tagline: 'Pilot a coral-orange seaplane between cloud seas and floating islands. Thread the wind rings, then deliver five sky packages.',
    secMode: 'Flight mode',
    mOrders: '5 Deliveries',
    mOrdersD: 'Drop all five packages along Route 07',
    mRush: 'Ring Sprint',
    mRushD: 'Fly through as many gold rings as you can in 60s',
    mFree: 'Free Flight',
    mFreeD: 'No timer — just explore the cloud sea',
    secCtrl: 'Controls',
    ctrlPitch: 'Climb / descend',
    ctrlTurn: 'Turn left / right',
    ctrlBoost: 'Boost',
    ctrlArrows: 'Arrow keys too',
    keySpace: 'SPACE',
    start: 'Start Flight',
    bestLabel: 'Best',
    footHint: 'Saved locally · Keyboard & touch',
    route: 'Sky Post · Route 07',
    routeSub: 'ROUTE 07 · SKY POST',
    best: 'BEST',
    speed: 'SPEED',
    boost: 'BOOST',
    boostShort: 'BOOST',
    pausedEyebrow: 'PAUSED',
    paused: 'Taking a break',
    pausedLead: 'The cloud sea is quiet. Ready when you are.',
    menu: 'Main menu',
    resume: 'Resume',
    again: 'Fly again',
    newBest: 'New record',
    pickup: 'Deliver to {name}',
    deliverNear: 'Target dead ahead',
    delivered: 'Package delivered · {n}/5',
    allDone: 'Route 07 complete!',
    ringHit: '+{n} pts · ring boost',
    routeTitle: 'Route 07 complete',
    routeLead: 'All five packages delivered across the floating islands.',
    rushTitle: 'Sprint over',
    rushLead: 'Your 60-second ring run has ended.',
    freeTitle: 'Free flight ended',
    freeLead: 'The cloud sea will be here whenever you return.',
    eyebrowOrders: 'ROUTE 07 COMPLETE',
    eyebrowRush: 'RING SPRINT',
    eyebrowFree: 'FREE FLIGHT',
    statTime: 'TIME',
    statRings: 'RINGS',
    statBest: 'BEST',
    statDelivered: 'DELIVERED',
    clickHint: 'Tip: fly through gold rings to refill your boost',
    hitIsland: 'Watch the islands!',
    pkg: 'PACKAGE',
    langLabel: '中',
  },
};

export const ISLAND_NAMES = {
  mist: { zh: '晨雾岛', en: 'Mist Island' },
  wheat: { zh: '麦田岛', en: 'Wheat Island' },
  mill: { zh: '风车岛', en: 'Mill Island' },
  beacon: { zh: '灯塔岛', en: 'Beacon Isle' },
  bloom: { zh: '樱花岛', en: 'Blossom Isle' },
  post: { zh: '天空邮局', en: 'Sky Post' },
};

let lang = 'zh';

export function setLang(l) {
  lang = l === 'en' ? 'en' : 'zh';
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

export function getLang() {
  return lang;
}

export function t(key, vars) {
  let s = (DICT[lang] && DICT[lang][key]) || DICT.zh[key] || key;
  if (vars) {
    for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
  }
  return s;
}

export function islandName(key) {
  const n = ISLAND_NAMES[key];
  return n ? n[lang] : key;
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  const lt = document.getElementById('langTxt');
  if (lt) lt.textContent = t('langLabel');
}
