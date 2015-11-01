var tts_engine_lang = 'zh-CN';
var tts_engine_gender = 'female';
var not_enqueue = false;
var read_name = false;

chrome.storage.sync.get(
  {
    tts_engine_lang: tts_engine_lang,
    tts_engine_gender: tts_engine_gender,
    not_enqueue: not_enqueue,
    read_name: read_name
  },
  function(items) {

    tts_engine_lang = items.tts_engine_lang;
    tts_engine_gender = items.tts_engine_gender;
    not_enqueue = items.not_enqueue;
    read_name = items.read_name;
  }
);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // console.log(sender.tab ?
    //             "from a content script:" + sender.tab.url :
    //             "from the extension");
    console.log(sender);
    if (sender.tab)
    {
      if (request.name && request.content)
      {
        var sentence;
        if (read_name)
        {
          sentence = request.name + "说：" + request.content;
        }
        else {
          sentence = request.content;
        }
        chrome.tts.speak(sentence, {'lang': tts_engine_lang, 'gender': tts_engine_gender, 'rate': 1.0, 'enqueue': !not_enqueue});
        sendResponse({read: sentence});
      }
      else {
        tts_engine_lang = request.tts_engine_lang;
        tts_engine_gender = request.tts_engine_gender;
        not_enqueue = request.not_enqueue;
        read_name = request.read_name;
      }
    }
    else {
      tts_engine_lang = request.tts_engine_lang;
      tts_engine_gender = request.tts_engine_gender;
      not_enqueue = request.not_enqueue;
      read_name = request.read_name;
    }


  });
