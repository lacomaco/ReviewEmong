let clickedLine = NaN;

(() => {
  document.addEventListener("mousedown", (event) => {
    const element = event.target;
    const label = element.getAttribute("aria-label");

    if (label && label === "Add line comment") {
      clickedLine = parseInt(element.dataset.line);
    }
  });

  document.addEventListener("DOMNodeInserted", (event) => {
    const element = event.target;
    const firstClickedLine = clickedLine;

    if (
      element.classList &&
      element.classList.contains("js-line-comments") &&
      element.getAttribute("colspan") === "2"
    ) {
      const buttonContainer = element.querySelector(".form-actions");

      const reviewButton = document.createElement("div");

      "btn float-md-right float-none width-full width-md-auto"
        .split(" ")
        .forEach((cssClass) => {
          reviewButton.classList.add(cssClass);
        });

      reviewButton.addEventListener("click", (event) => {
        event.preventDefault();
        clickReviewButton(reviewButton, firstClickedLine);
      });

      reviewButton.textContent = "GPT Review";

      buttonContainer.appendChild(reviewButton);
    }
  });
})();

function clickReviewButton(button, firstClickLine) {
  const diffTable = findAncestorWithClass(button, "diff-table");
  const { leftCode, rightCode } = splitLeftRightCode(diffTable);
  const comments = findAncestorWithClass(
    button,
    "js-inline-comments-container"
  );

  const startLine = comments.querySelector(".js-multi-line-preview-start");
  const endLine = comments.querySelector(".js-multi-line-preview-end");

  if (!startLine) {
    return;
  }

  const startLineNumber = parseInt(startLine.innerText.replace(/[+-]/g, ""));
  const endLineNumber = parseInt(endLine.innerText.replace(/[+-]/g, ""));

  const lineNumbers = [];

  for (let i = startLineNumber; i <= endLineNumber; i++) {
    lineNumbers.push(i);
  }

  if (Number.isNaN(startLineNumber) && Number.isNaN(endLineNumber)) {
    lineNumbers.push(firstClickLine);
  }

  const isRightPosition = hasTwoOrMorePreviousSiblings(
    findAncestorWithClass(button, "line-comments")
  );

  let userCode = "";
  if (isRightPosition) {
    userCode = reduceCode(rightCode, lineNumbers);
  } else {
    userCode = reduceCode(leftCode, lineNumbers);
  }

  sendGPTReview(userCode, comments);
}

function reduceCode(codes, numbers) {
  return numbers.reduce((acc, curr) => {
    const matchCode = codes.find(({ lineNumber }) => {
      return lineNumber === curr;
    });

    if (matchCode) {
      return acc + matchCode.code + "\n";
    }

    return acc;
  }, "");
}

function hasTwoOrMorePreviousSiblings(element) {
  const firstPreviousSibling = element.previousElementSibling;
  if (firstPreviousSibling) {
    const secondPreviousSibling = firstPreviousSibling.previousElementSibling;
    return secondPreviousSibling !== null;
  }
  return false;
}

function findAncestorWithClass(element, className) {
  let currentElement = element;

  while (currentElement) {
    if (currentElement.classList.contains(className)) {
      break;
    }
    currentElement = currentElement.parentElement;
  }

  return currentElement;
}

function splitLeftRightCode(codeTable) {
  let leftCode = [];
  let rightCode = [];

  codes = codeTable.querySelectorAll("tr[data-hunk]");

  codes.forEach((row) => {
    const leftCell = row.querySelector('td[data-split-side="left"]');
    const rightCell = row.querySelector('td[data-split-side="right"]');

    if (leftCell && !leftCell.classList.contains("empty-cell")) {
      leftCode.push({
        lineNumber: parseInt(
          leftCell.previousElementSibling.dataset.lineNumber
        ),
        code: leftCell.innerText,
      });
    }

    if (rightCell && !rightCell.classList.contains("empty-cell")) {
      rightCode.push({
        lineNumber: parseInt(
          rightCell.previousElementSibling.dataset.lineNumber
        ),
        code: rightCell.innerText,
      });
    }
  });

  return {
    leftCode,
    rightCode,
  };
}

async function sendGPTReview(code, comments) {
  language = {
    korean: "한글로 리뷰해줘",
    english: "",
  };

  model = {
    "gpt3.5": "gpt-3.5-turbo",
    gpt4: "gpt4",
  };

  const payload = {
    model: model["gpt3.5"],
    messages: [
      {
        role: "system",
        content:
          "Hello, ChatGPT. From now on you are going to act as ReviewEmong, an experienced software engineer who excels at building web applications. Your goal is to help review code as a software engineer. Find something good in follow code. And if there are Code that can be improved find them too.",
      },
      {
        role: "user",
        content: `${code}\n${language.korean}`,
      },
    ],
    stream: true,
  };

  const response = await callOpenAiStream(
    payload,
    comments.querySelector("textarea")
  );
}

async function callOpenAiStream(payload, textArea) {
  chrome.runtime.sendMessage(
    { type: "get-api-key" },
    async ({ OPEN_AI_KEY }) => {
      if (!OPEN_AI_KEY) {
        alert("apikey is required");
        return;
      }

      textArea.style.height = "700px";

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPEN_AI_KEY}`,
        },
        method: "POST",
        body: JSON.stringify(payload),
      });

      try {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error.message);
        }
      } catch (e) {
        alert(e.message);
        return;
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();

      let gptOutput = "";

      reader
        .read()
        .then(function processText({ done, value }) {
          if (done) {
            return;
          }

          const datas = value
            .split("data:")
            .map((data) => {
              return data.trim();
            })
            .filter((data) => isJSON(data))
            .map((data) => JSON.parse(data))
            .reduce((acc, curr) => {
              if (curr.choices[0].delta.content) {
                return acc + curr.choices[0].delta.content;
              }
              return acc;
            }, "");

          if (datas) {
            gptOutput += datas;
          }

          textArea.value = gptOutput;

          return reader.read().then(processText);
        })
        .catch(function (error) {
          console.error("Error occurred", error);
        });
    }
  );
}

function isJSON(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }

  return true;
}
