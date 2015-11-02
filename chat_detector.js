function stringHexEncode(s)
{
  var hex, i;

  var result = "";
  for (i=0; i<s.length; i++) {
      hex = s.charCodeAt(i).toString(16);
      result += "0x" + ("000"+hex).slice(-4) + " ";
  }

  return result
}

MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

function preprocess_string(s)
{
  s = s.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  s = s.replace(/[\s\'\"\:\,]*/g, "");
  return s;
}

var observer = new MutationObserver(function(mutations, observer) {
    // fired when a mutation occurs
    mutations.forEach(function(mutation){
        if (mutation.addedNodes.length > 0)
        {
          //console.log(mutation.addedNodes);
          for(i = 0; i < mutation.addedNodes.length; ++i)
          {
            var item = mutation.addedNodes.item(i);

            // check for gift
            if (item.className == 'jschartli new_bs_li' || item.className == 'jschartli')
            {
              // first check if the comments needs to be read out,
              // i.e. class==lw_imgs
              var found = true;
              var j;
              for (j = 0; j < item.childElementCount; ++j)
              {
                var child = item.children.item(j);
                if (child.childElementCount > 0)
                {
                  var k;
                  for(k = 0; k < child.childElementCount; ++k)
                  {
                    var grandChild = child.children.item(k);
                    if (grandChild.nodeName == 'IMG' && grandChild.className == 'lw_imgs')
                    {
                      found = true;
                      //console.log("FOUND!!!");
                    }
                    if (grandChild.nodeName == 'IMG' && grandChild.src.indexOf('yw.png') >= 0)
                    {
                      found = true;
                      // console.log("FOUND type 2!!!");
                    }
                  }
                }

              }

              if (found)
              {
                var speaker;
                var j;
                // find speaker name
                for (j = 0; j < item.childElementCount; ++j)
                {
                  var child = item.children.item(j);

                  var k;
                  for(k = 0; k < child.childElementCount; ++k)
                  {
                    var grandChild = child.children.item(k);
                    if (grandChild.className == 'nick js_nick')
                    {
                      speaker = grandChild.textContent;
                    }
                  }
                }

                // find speaking content
                var textContent = preprocess_string(item.textContent);

                if (textContent.length != 0)
                {
                  console.log(textContent);
                  // if (textContent.indexOf('来到本直播间') < 0 &&
                  if (textContent.indexOf('次在线领鱼丸时') < 0 &&
                  //     textContent.indexOf('次在线领鱼丸时') < 0 &&
                  //     textContent.indexOf('高级酬勤') < 0 &&
                      textContent.indexOf('系统广播') < 0)
                  {

                    speaker = speaker || " ";
                    textContent = textContent || " ";
                    chrome.runtime.sendMessage({name: speaker, content: textContent, gift: true}, function(response) {
                      console.log(response);
                    });
                  }
                }


              }
            }

            // normal and vip user
            if (item.className == 'text_cont' || item.className == 'text_cont cqback')
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
                  var textContent = preprocess_string(child.textContent);
                  console.log(textContent);
                  // prevent reading emoji, which cause tts bugs
                  if (textContent.length != 0)
                  {
                    speaker = speaker || " ";
                    textContent = textContent || " ";

                    chrome.runtime.sendMessage({name: speaker, content: textContent, gift: false}, function(response) {
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
                  var textContent = preprocess_string(child.textContent);
                  console.log(textContent);

                  // prevent reading emoji, which cause tts bugs
                  if (textContent.length != 0)
                  {
                    speaker = speaker || " ";
                    textContent = textContent || " ";

                    chrome.runtime.sendMessage({name: speaker, content: textContent, gift: false}, function(response) {
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
