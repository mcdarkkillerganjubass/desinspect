if(globalThis.designInspectTokens && document.documentElement){
  const tokens=globalThis.designInspectTokens,system=globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  const updateTheme=()=>tokens.applyTo(document.documentElement,system?.matches?'dark':'light');updateTheme();system?.addEventListener('change',updateTheme);
  for(const font of tokens.fontAssets){
    new FontFace(font.family,`url("fonts/${font.file}")`,{weight:font.weight}).load().then(face=>document.fonts.add(face)).catch(()=>{});
  }
}
const tabId = Number(new URLSearchParams(location.search).get("tab"));
const button = document.querySelector("#grant"), status = document.querySelector("#status");
let origins = [];
const send = type => chrome.runtime.sendMessage({channel:"design-inspect", type, tabId});
send("access-info").then(info => {
  if (info.error) throw new Error(info.error);
  origins = info.origins;
  for (const origin of origins) {
    const li = document.createElement("li"); li.textContent = origin; document.querySelector("#origins").append(li);
  }
  button.disabled = false;
  button.textContent = origins.length ? "Разрешить доступ" : "Повторить подключение";
  status.textContent = origins.length ? "Доступ запрашивается только для перечисленных доменов." : "Разрешения уже выданы. Можно повторить подключение фреймов.";
}).catch(error => {status.textContent = error.message;});
button.addEventListener("click", () => {
  // Keep the permissions request inside the direct user gesture.
  const request = origins.length ? chrome.permissions.request({origins}) : Promise.resolve(true);
  button.disabled = true;
  status.textContent = origins.length ? "Запрос должен появиться в интерфейсе браузера…" : "Подключаем фреймы…";
  request.then(async granted => {
    if (!granted) {status.textContent = "Доступ не выдан. Основная страница продолжит работать."; button.disabled = false; return;}
    status.textContent = "Доступ выдан. Подключаем фреймы…";
    const result = await send("refresh-frames");
    status.textContent = result.error || (result.blockedCount ? `Доступ обновлён. Недоступных фреймов: ${result.blockedCount}. Они могут быть ограничены браузером; доступные фреймы уже подключены.` : "Готово. Вернитесь на страницу и выберите элемент внутри iframe.");
    if (!result.error) button.hidden = true;
  }).catch(error => {status.textContent = error.message; button.disabled = false;});
});
