String.prototype.hexEncode = function(){
    var hex, i;

    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += "0x" + ("000"+hex).slice(-4) + " ";
    }

    return result
}


var tts_engine_lang = 'zh-CN';
var tts_engine_gender = 'female';
var not_enqueue = false;
var read_name = false;
var fix_number_reading = true;
var fix_symbol_reading = true;
var fix_special_chinese_reading = true;
var read_normal_comments = true;
var read_gift_comments = true;

////////////////////////////
var last_gift_combo_username = "";

chrome.storage.sync.get(
  {
    tts_engine_lang: tts_engine_lang,
    tts_engine_gender: tts_engine_gender,
    not_enqueue: not_enqueue,
    read_name: read_name,
    read_normal_comments: read_normal_comments,
    read_gift_comments: read_gift_comments
  },
  function(items) {

    tts_engine_lang = items.tts_engine_lang;
    tts_engine_gender = items.tts_engine_gender;
    not_enqueue = items.not_enqueue;
    read_name = items.read_name;
    read_normal_comments = items.read_normal_comments;
    read_gift_comments = items.read_gift_comments;
  }
);

function preprocess_string(s)
{
  s = s.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  s = s.replace(/[\'\"\:\,]/g, "");
  return s;
}

function break_gift_sentence(sentence)
{
  var index = sentence.indexOf('赠送');

  var username = sentence.substring(0, index);

  var re = /(\d+)\s*(连击)\s*$/g;
  var matchCombo = re.exec(sentence);
  if (matchCombo)
  {
    var comboText = matchCombo[0];
    var comboIndex = matchCombo.index;

    return [username, sentence.substring(index, comboIndex), comboText];
  }
  else
  {
    return [username, sentence.substring(index), undefined];
  }
}

function check_big_combo(combo_sentence)
{
  if (!combo_sentence)
    return false;

  var re = /(\d+)\s*(连击)\s*/;
  var result = re.exec(combo_sentence);
  var comboCount = parseInt(result[1]);
  if (comboCount == 3 ||
      comboCount == 5 ||
      comboCount == 10 ||
      comboCount == 20 ||
      comboCount == 30 ||
      comboCount == 40 ||
      comboCount == 50 ||
      comboCount == 60 ||
      comboCount == 70 ||
      comboCount == 80 ||
      comboCount == 90 ||
      comboCount == 100 ||
      comboCount == 150 ||
      comboCount == 200 ||
      comboCount == 500 ||
      comboCount == 1000 ||
      comboCount == 2000 ||
      comboCount == 5000 ||
      comboCount == 10000)
  {
    return true;
  }

  return false;
}


function mangle_content(sentence)
{
  var newSentence = sentence;
  if (fix_symbol_reading)
  {
    newSentence = newSentence.replace(/[~～@]+/g, '');
    newSentence = newSentence.replace(/[👏]/g, '');
  }

  if (fix_number_reading)
  {
    // eliminate consecutive digits
    newSentence = newSentence.replace(/(\d)\1\1+/g, '$1$1$1');

    // fix reading numbers as large numeric value
    newSentence = newSentence.replace(/0/g, '零');
    newSentence = newSentence.replace(/1/g, '一');
    newSentence = newSentence.replace(/2/g, '二');
    newSentence = newSentence.replace(/3/g, '三');
    newSentence = newSentence.replace(/4/g, '四');
    newSentence = newSentence.replace(/5/g, '五');
    newSentence = newSentence.replace(/6/g, '六');
    newSentence = newSentence.replace(/7/g, '七');
    newSentence = newSentence.replace(/8/g, '八');
    newSentence = newSentence.replace(/9/g, '九');


  }

  if (fix_special_chinese_reading)
  {
    newSentence = newSentence.replace(/弹幕/g, '蛋幕');
    // any consecutive text like '啊啊啊啊啊啊啊啊啊' will be trimed to 3 times
    newSentence = newSentence.replace(/([\u4E00-\u9FFF])\1\1+/g, '$1$1$1');
    newSentence = newSentence.replace(/([\u3400-\u4DFF])\1\1+/g, '$1$1$1');
  }

  return newSentence;

}


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // console.log(sender.tab ?
    //             "from a content script:" + sender.tab.url :
    //             "from the extension");
    // console.log(sender);
    if (sender.tab)
    {
      if (request.name && request.content)
      {
        var sentence;
        if (request.gift)
        {
            // gift sentence

            var gift_sentence = break_gift_sentence(request.content);
            var username = mangle_content(gift_sentence[0]);
            var remaining = gift_sentence[1];
            var combo = gift_sentence[2];

            //if (last_gift_combo_username != username || check_big_combo(combo))
            if (check_big_combo(combo))
            {
              last_gift_combo_username = username;
              if (combo)
              {
                sentence = username + remaining + combo;
              }
              else
              {
                sentence = username + remaining;
              }
            }
            else if (!combo)
            {
              // single gift always reads out
              sentence = username + remaining;
            }
            else {
              console.log('CANCEL READ');
            }

        }
        else {

          if (read_name)
          {
            sentence = mangle_content(request.name) + "说：" + mangle_content(request.content);
          }
          else {
            sentence = mangle_content(request.content);
          }
        }

        chrome.tts.isSpeaking(function(isSpeaking){
          if (isSpeaking)
          {
            // always enqueue gift
            if (request.gift)
            {
              if (read_gift_comments && sentence)
              {
                console.log(sentence);
                console.log(sentence.hexEncode());
                chrome.tts.speak(sentence, {'lang': tts_engine_lang, 'gender': tts_engine_gender, 'rate': 1.0, 'enqueue': true});
                sendResponse({read: sentence});
              }
            }
            else {

              if (!not_enqueue)
              {
                if (read_normal_comments && !request.gift && sentence)
                {
                  console.log(sentence);
                  console.log(sentence.hexEncode());

                  chrome.tts.speak(sentence, {'lang': tts_engine_lang, 'gender': tts_engine_gender, 'rate': 1.0, 'enqueue': !not_enqueue});
                  sendResponse({read: sentence});
                }
              }
              else {
                sendResponse({code: 'busy'})
              }
            }
          }
          else {

            // always enqueue gift
            if (request.gift)
            {
              if (read_gift_comments && sentence)
              {
                console.log(sentence);
                console.log(sentence.hexEncode());

                chrome.tts.speak(sentence, {'lang': tts_engine_lang, 'gender': tts_engine_gender, 'rate': 1.0, 'enqueue': true});
                sendResponse({read: sentence});
              }
            }
            else {
              if (read_normal_comments && sentence)
              {
                console.log(sentence);
                console.log(sentence.hexEncode());

                chrome.tts.speak(sentence, {'lang': tts_engine_lang, 'gender': tts_engine_gender, 'rate': 1.0, 'enqueue': !not_enqueue});
                sendResponse({read: sentence});
              }
            }
          }
        });

      }
      else {
        tts_engine_lang = request.tts_engine_lang;
        tts_engine_gender = request.tts_engine_gender;
        not_enqueue = request.not_enqueue;
        read_name = request.read_name;
        read_normal_comments = request.read_normal_comments;
        read_gift_comments = request.read_gift_comments;
      }
    }
    else {
      tts_engine_lang = request.tts_engine_lang;
      tts_engine_gender = request.tts_engine_gender;
      not_enqueue = request.not_enqueue;
      read_name = request.read_name;
      read_normal_comments = request.read_normal_comments;
      read_gift_comments = request.read_gift_comments;

    }


  });
