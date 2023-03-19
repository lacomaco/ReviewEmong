const OPEN_AI_KEY = "OPEN_AI_KEY";

const gptMode = document.querySelector(".gptMode");
const keyChange = document.querySelector(".keyChange");

const title = document.querySelector(".title");
const apiInput = document.querySelector(".openApiInput");
const keyInput = document.querySelector(".keyInput");

function setOpenAiKey(key) {
  chrome.storage.local
    .set({
      OPEN_AI_KEY: key,
    })
    .then(() => console.log("api key setup"));
}

function getOpenAiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(OPEN_AI_KEY, ({ OPEN_AI_KEY }) => {
      resolve(OPEN_AI_KEY);
    });
  });
}

function isEmpty(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

(async () => {
  const key = await getOpenAiKey();

  keyChange.addEventListener("click", async () => {
    const key = await getOpenAiKey();
    gptDisableMode(key);
  });

  keyInput.addEventListener("click", () => {
    const key = apiInput.value;

    setOpenAiKey(key);
    gptActivateMode();
  });

  if (!key || !isEmpty(key)) {
    gptActivateMode();
    return;
  }

  gptDisableMode(key);
})();

function gptActivateMode() {
  gptMode.classList.remove("hide");
  keyChange.classList.remove("hide");

  title.classList.add("hide");
  apiInput.classList.add("hide");
  keyInput.classList.add("hide");
}

function gptDisableMode(key) {
  gptMode.classList.add("hide");
  keyChange.classList.add("hide");

  title.classList.remove("hide");
  apiInput.classList.remove("hide");
  keyInput.classList.remove("hide");

  apiInput.value = key;
}

