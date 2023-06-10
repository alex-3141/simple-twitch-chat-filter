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

let observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
          Array.from(mutation.addedNodes).forEach((newNode) => {
              // Check if the added node has the desired property
              if (newNode.nodeType === Node.ELEMENT_NODE && newNode.getAttribute('data-a-target') === 'chat-line-message-body') {
                processElement(newNode);
              }

              // If the added node is the parent node of the target node
              if (newNode.childNodes.length) {
                  Array.from(newNode.querySelectorAll('[data-a-target="chat-line-message-body"]')).forEach((targetNode) => {
                    processElement(targetNode);
                  });
              }
          });
      }
  });
});

// Configure the observer
let config = {
  childList: true, 
  subtree: true
};

function init() {
  console.log('[Twitch Chat Spam Filter] Twitch Chat Spam Filter v0.1.0 loaded!');
  // Start observing
  observer.observe(document.body, config);
}


function processElement(newElement) {
    const tokenMap = new Lookup();
    let tokenizedMessage = '';
    let processedMessage = '';
    let originalTextContent = '';
    // First pass to get original text content
    for (const child of newElement.children) {
        if (child.getAttribute('data-a-target') === 'chat-message-text') {
            originalTextContent += child.textContent;
        }
    }
    // Second pass to tokenize
    for (const child of newElement.children) {
        if (child.className === 'text-fragment') {
            tokenizedMessage += child.textContent;
        } else {
            const elementToken = elementToToken(child, originalTextContent, tokenizedMessage, tokenMap);
            tokenizedMessage += elementToken;
        }
    }

    processedMessage = processText(tokenizedMessage);

    newElement.innerHTML = untokenize(processedMessage, tokenMap);    
}

function processText(tokenizedMessage){
    // Remove duplicate words
    const regex = /(.{4,}?)(?=\1{2,})(?:(?=\1+\1))\1+/g;
    const processedText = tokenizedMessage.replace(regex, (match, group1) => group1);
    return processedText;
}

function elementToToken(element, originalTextContent, tokenizedMessage, tokenMap) {
    const htmlContent = element.outerHTML;
    if (!tokenMap.has(htmlContent)) {
        let token;
        do {
            token = generateToken();
        } while (tokenMap.has(token) || originalTextContent.includes(token) || tokenizedMessage.includes(token));

        tokenMap.set(htmlContent, token);
    }
    return tokenMap.get(htmlContent);
}

function generateToken(){
    return Math.random().toString(36).substring(2, 15);
}

function tokenToElement(token, tokenMap) {
    if (tokenMap.hasValue(token)) {
        return tokenMap.getKey(token);
    } else {
        throw new Error("Token not found in map: " + token);
    }
}

function textToElement(text){
    const span = document.createElement('span');
    span.className = 'text-fragment';
    span.setAttribute('data-a-target', 'chat-message-text');
    span.textContent = escapeString(text);
    return span.outerHTML;
}

function escapeString(text){
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function untokenize(processedMessage, tokenMap){
  if(tokenMap.size){
    const tokens = Array.from(tokenMap.values()).join('|');
    const parts = processedMessage.split(new RegExp(`(${tokens})`, 'g'));
    return parts.map(part => tokenMap.hasValue(part) ? tokenToElement(part, tokenMap) : textToElement(part)).join('');
  } else
    return textToElement(processedMessage);
}

init();