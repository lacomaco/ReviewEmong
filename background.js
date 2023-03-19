const OPEN_AI_KEY = "OPEN_AI_KEY";

function setOpenAiKey(key) {
  chrome.storage.local.set(
    {
      OPEN_AI_KEY: key,
    },
    () => {
      console.log("api key setup.");
    }
  );
}

function deleteOpenAiKey(){
  chrome.storage.local.remove(OPEN_AI_KEY, () => {
    console.log("api key delete.");
  });
}

function getOpenAiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(OPEN_AI_KEY, (result) => {
      resolve(result);
    });
  });
}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === "get-api-key") {
    getOpenAiKey().then((api)=> sendResponse(api));
    return true;
  }
});

