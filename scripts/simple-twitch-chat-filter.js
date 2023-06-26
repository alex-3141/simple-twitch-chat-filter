class Lookup {
  constructor() {
    this.keyToValue = new Map();
    this.valueToKey = new Map();
    this.size = 0;
  }

  set(key, value) {
    // First, remove any existing entries that might cause a conflict
    if (this.keyToValue.has(key)) {
      this.valueToKey.delete(this.keyToValue.get(key));
    }
    if (this.valueToKey.has(value)) {
      this.keyToValue.delete(this.valueToKey.get(value));
    }

    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
    this.size = this.keyToValue.size;
  }

  get(key) {
    return this.keyToValue.get(key);
  }

  has(key) {
    return this.keyToValue.has(key);
  }

  getKey(value) {
    return this.valueToKey.get(value);
  }

  hasKey(key) {
    return this.keyToValue.has(key);
  }

  hasValue(value) {
    return this.valueToKey.has(value);
  }

  values() {
    return this.keyToValue.values();
  }
}

function onSettingUpdate(key, newValue, oldValue) {}

// Query selectors required for the entire chat message line, the container for the message text, and a differentiator for text and non-text elements
const chatTypeSelectors = {
  twitchLive: {
    lineSelector: '[data-a-target="chat-line-message"]', // The entire chat message line, including timestamp, username, etc. To be removed if the Remove Entire Message option is enabled
    containerSelector: '[data-a-target="chat-line-message-body"]', // The lowest down element in which the user message elements are contained. Each child element is the highest unique root element of either a text element or a non-text element
    textSelector: '[data-a-target="chat-message-text"]', // This selector will return the raw text content of a text segment
  },
  twitchVOD: {
    lineSelector: ".video-chat__message-list-wrapper > div > ul > li",
    containerSelector: ".video-chat__message > span[class='']",
    textSelector: '[data-a-target="chat-message-text"]',
  },
  sevenTvLive: {
    lineSelector: ".seventv-message",
    containerSelector: ".seventv-chat-message-body",
    textSelector: ".text-token",
  },
  sevenTvVOD: {
    lineSelector: ".seventv-chat-vod-message-patched",
    containerSelector: ".seventv-chat-message-body",
    textSelector: ".text-token",
  },
};

function querySelectorIncludingRoot(node, selector) {
  if (!(node instanceof Element)) {
    console.error(node);
    throw new Error("querySelectorIncludingRoot: node is not an element. This should not happen.");
  }
  if(node.matches(selector) && node){
    return node;
  }
  return node.querySelector(selector);
}

let observer = new MutationObserver((mutations) => {
  if (getSetting("filterActive")) {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        Array.from(mutation.addedNodes).forEach((newNode) => {
          if (newNode.nodeType === Node.ELEMENT_NODE) {
            // Check all of our line selectors until we get a match

            let chatLine, lineSelector, containerSelector, textSelector;

            // Loop throuygh each chat type and check if the new node matches the line selector
            for (const [chatType, selectors] of Object.entries(
              chatTypeSelectors
            )) {
              lineSelector = selectors.lineSelector;
              containerSelector = selectors.containerSelector;
              textSelector = selectors.textSelector;
              chatLine = querySelectorIncludingRoot(newNode, lineSelector);
              if (chatLine) {
                break;
              }
            }

            if (chatLine) {
              const container = chatLine.querySelector(containerSelector);
              const processedText = processMessage(container, textSelector);

            // If the text was modified
            if (processedText.trim() !== container.innerHTML.trim()) {
              // Remove the chat line if the processed text is empty or the Remove Entire Message option is enabled
              if (getSetting("removeMessage") || processedText.trim() === "") {
                chatLine.remove();
              } else {
                container.innerHTML = processedText;
              }
            }
            }
          }
        });
      }
    });
  }
});

// Configure the observer
let config = {
  childList: true,
  subtree: true,
};

// This function takes a container and the textSelector to pick out the text
function processMessage(container, textSelector) {
  const tokenMap = new Lookup();
  let tokenizedMessage = "";
  let originalTextContent = "";
  let templateElement;
  // First pass to get original text content. This is used to prevent token collisions later on
  for (const fragment of container.children) {
    const textFragment = querySelectorIncludingRoot(fragment, textSelector);
    if (textFragment) {
      originalTextContent += textFragment.textContent;
      // Get a copy of the text fragment element to use as a template
      if(!templateElement){
        templateElement = fragment.cloneNode(true);
        // Clear the text content of the template element
        // This change isn't being applied for some reason, but it isn't needed anyway as the text is replaced later
        // querySelectorIncludingRoot(templateElement, textSelector).textContent = '';
      }
    }
  }

  // Second pass to tokenize
  for (const fragment of container.children) {
    const textFragment = querySelectorIncludingRoot(fragment, textSelector);
    if (textFragment) {
      tokenizedMessage += textFragment.textContent;
    } else {
      const elementToken = elementToToken(
        fragment,
        originalTextContent,
        tokenizedMessage,
        tokenMap
      );
      tokenizedMessage += elementToken;
    }
  }

  // Append a whitespace character at the end to help the regex match all sequences, unless there are no text elements
  if (templateElement){
    tokenizedMessage += " ";
  }

  const processedMessage = processText(tokenizedMessage).trim();

  return untokenize(processedMessage, tokenMap, templateElement, textSelector);
}

function processText(tokenizedMessage) {
  // Remove duplicate words
  const sequenceLength = getSetting("minSequenceLength");
  const repetitions = getSetting("replaceWithCount");
  const spamThreshold = getSetting("spamThreshold");
  // Find sequences of at least 4 characters (.{4,}?) that repeat at least 2 times (?=\1{2,}) and replace with one occurance of the matched repeated sequence
  // const regex = /(.{4,}?)(?=\1{2,})(?:(?=\1+\1))\1+/g;
  const regex = new RegExp(
    `(.{${sequenceLength},}?)(?=\\1{${spamThreshold},})(?:(?=\\1+\\1))\\1+`,
    "g"
  );
  const processedText = tokenizedMessage.replace(regex, (match, group1) => {
    return group1.repeat(repetitions);
  });

  return processedText;
}

function elementToToken(
  element,
  originalTextContent,
  tokenizedMessage,
  tokenMap
) {
  const htmlContent = element.outerHTML;
  if (!tokenMap.has(htmlContent)) {
    let token;
    do {
      token = generateToken();
    } while (
      tokenMap.has(token) ||
      originalTextContent.includes(token) ||
      tokenizedMessage.includes(token)
    );

    tokenMap.set(htmlContent, token);
  }
  return tokenMap.get(htmlContent);
}

function generateToken() {
  return Math.random().toString(36).substring(2, 15);
}

function tokenToElement(token, tokenMap) {
  if (tokenMap.hasValue(token)) {
    return tokenMap.getKey(token);
  } else {
    throw new Error("Token not found in map: " + token);
  }
}

// Injects text into an element using the supplied selector
function textToElement(text, templateElement, selector) {
  querySelectorIncludingRoot(templateElement, selector).textContent = escapeString(text);
  return templateElement.outerHTML;
}

function escapeString(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function untokenize(processedMessage, tokenMap, templateElement, textSelector) {
  if (tokenMap.size) {
    // Create a regex to match all tokens, using | as a delimiter
    const tokens = Array.from(tokenMap.values()).join("|");
    let parts = processedMessage.split(new RegExp(`(${tokens})`, "g"));
    // Remove all empty strings from parts array. All entries will be strings so this filter can be used
    parts = parts.filter((part) => part);
    return parts
      .map((part) =>
        tokenMap.hasValue(part)
          ? tokenToElement(part, tokenMap)
          : textToElement(part, templateElement, textSelector)
      )
      .join("");
  } else return textToElement(processedMessage, templateElement, textSelector);
}

function init() {
  console.log("[Simple Twitch Chat Filter] v0.1.0 loaded!");

  // Start observing
  observer.observe(document.body, config);
}

loadSettings().then(() => {
  init();
});
