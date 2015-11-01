MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

var observer = new MutationObserver(function(mutations, observer) {
    // fired when a mutation occurs
    mutations.forEach(function(mutation){
        if (mutation.addedNodes.length > 0)
        {
          //console.log(mutation.addedNodes);
          for(i = 0; i < mutation.addedNodes.length; ++i)
          {
            var item = mutation.addedNodes.item(i);
            if (item.className == 'text_cont')
            {
              // find childs with class=name and class=text_cont
              for (j = 0; j < item.childElementCount; ++j)
              {
                var speaker;

                var child = item.children.item(j);
                if (child.className == 'name')
                {
                  for (k = 0; k < child.childElementCount; ++k)
                  {
                    var grandChild = child.children.item(k);
                    if (grandChild.className == 'nick js_nick')
                    {
                      // omit the last semi colon
                      speaker = grandChild.textContent;
                      speaker = speaker.substring(0, speaker.length-1);
                    }
                  }
                }
                else if (child.className == 'text_cont')
                {
                  console.log(child.textContent);
                  // prevent reading emoji, which cause tts bugs
                  if (child.textContent.length != 0)
                  {

                    chrome.runtime.sendMessage({name: speaker, content: child.textContent}, function(response) {
                      console.log(response);
                    });
                  }
                }
              }
            }

            if (item.className == 'my_cont')
            {
              for (j = 0; j < item.childElementCount; ++j)
              {
                var speaker;

                var child = item.children.item(j);
                if (child.className == 'name')
                {
                  for (k = 0; k < child.childElementCount; ++k)
                  {
                    var grandChild = child.children.item(k);
                    if (grandChild.className == 'nick js_nick')
                    {
                      // omit the last semi colon
                      speaker = grandChild.textContent;
                      speaker = speaker.substring(0, speaker.length-1);
                    }
                  }
                }
                else if (child.className == 'm')
                {
                  console.log(child.textContent);

                  // prevent reading emoji, which cause tts bugs
                  if (child.textContent.length != 0)
                  {
                    chrome.runtime.sendMessage({name: speaker, content: child.textContent}, function(response) {
                      console.log(response);
                    });
                  }
                }
              }
            }
          }

        }
      }
    );
    // ...
});

var observing = true;

// define what element should be observed by the observer
// and what types of mutations trigger the callback
observer.observe(document, {
  subtree: true,
  attributes: true,
  childList: true
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");

    if (!sender.tab)
    {
      if (request.check_tts_enabled)
      {
        sendResponse({code: observing});
      }
      // from the extension itself
      else if (request.enable_tts)
      {
        observer.observe(document, {
          subtree: true,
          attributes: true,
          childList: true
        });
        observing = true;
        sendResponse({code: "connected"});
      }
      else {
        observer.disconnect();
        observing = false;
        sendResponse({code: "disconnected"});
      }
    }
  });
