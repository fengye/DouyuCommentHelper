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
var limit_comment_length = true;
var comment_length = 15;
var comment_length_complain = false;
var censorship_word_list = new Array();
var censorship_complain = false;

var too_long_complain_words = [
  '人家不要再读了',
  '讨厌，太常了',
  '好泪啦',
  '话儿为什么这么常',
  '太常了啦'
];

var censorship_complain_words = [
  '好脏，不想读',
  '好污，不想读',
  '讨厌，不想读',
  '好变态，不读了',
  '我还是个孩子',
  '都说了不读了'
];

function get_too_long_complain_word()
{
  return too_long_complain_words[Math.floor(Math.random() * too_long_complain_words.length)];
}

function get_censorship_complain_word()
{
  return censorship_complain_words[Math.floor(Math.random() * censorship_complain_words.length)];
}

////////////////////////////
var last_gift_combo_username = "";
var user_activity_table = new Array();

chrome.storage.sync.get(
  {
    tts_engine_lang: tts_engine_lang,
    tts_engine_gender: tts_engine_gender,
    not_enqueue: not_enqueue,
    read_name: read_name,
    read_normal_comments: read_normal_comments,
    read_gift_comments: read_gift_comments,
    limit_comment_length: limit_comment_length,
    comment_length: comment_length,
    comment_length_complain: comment_length_complain,
    censorship_words: '',
    censorship_complain: censorship_complain

  },
  function(items) {

    tts_engine_lang = items.tts_engine_lang;
    tts_engine_gender = items.tts_engine_gender;
    not_enqueue = items.not_enqueue;
    read_name = items.read_name;
    read_normal_comments = items.read_normal_comments;
    read_gift_comments = items.read_gift_comments;
    limit_comment_length = items.limit_comment_length;
    comment_length = items.comment_length;
    comment_length_complain = items.comment_length_complain;
    if (items.censorship_words != '')
    {
      censorship_word_list = items.censorship_words.split(/\s+/);
    }
    censorship_complain = censorship_complain
  }
);

function update_user_activity()
{
  var currentTime = new Date().getTime() / 1000;
  var userToBeRemoved = [];

  for (var key in user_activity_table)
  {
    if(currentTime - user_activity_table[key] >= 15)
    {
      userToBeRemoved.push(key);
    }
  }

  for(var i = 0; i < userToBeRemoved.length; ++i)
  {
    delete user_activity_table[userToBeRemoved[i]];
  }

  // debug
  // console.log('===========');
  // for (var key in user_activity_table)
  // {
  //   console.log(key);
  // }
  // console.log('===========');
}

function chlog_user_too_frequent(username)
{
  var currentTime = new Date().getTime() / 1000;
  for (var key in user_activity_table)
  {
    if (key == username)
    {
      return true;
    }
  }

  user_activity_table[username] = currentTime;
  return false;
}

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
  if (comboCount == 5 ||
      comboCount == 10 ||
      comboCount == 20 ||
      comboCount == 50 ||
      comboCount == 100 ||
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
      update_user_activity();

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

            if (!chlog_user_too_frequent(username))
            //if (last_gift_combo_username != username)
            {

              if (combo)
              {
                sentence = username + remaining + combo;
              }
              else
              {
                sentence = username + remaining;
              }

              // last_gift_combo_username = username;
            }
            else if (check_big_combo(combo))
            {
              if (last_gift_combo_username == username)
              {
                sentence = combo;
              }
              else
              {
                sentence = username + remaining + combo;
              }

              last_gift_combo_username = username;
            }
            // sometimes douyu won't says it's combo, but we needs to be conservative
            // about speech
            // else if (!combo && last_gift_combo_username != username)
            // {
            //   last_gift_combo_username = username;
            //
            //   // single gift always reads out
            //   sentence = username + remaining;
            // }
            else {
              console.log('CANCEL READ');
              sentence = ' ';
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

          // check length
          if (limit_comment_length)
          {
            if (sentence.length > comment_length)
            {
              if (comment_length_complain)
              {
                sentence = get_too_long_complain_word();
              }
              else {
                sentence = ' ';
              }
            }
          }

          console.log(censorship_word_list);
          // check censorship
          if (censorship_word_list.length > 0)
          {
            console.log(censorship_word_list.join("|"));

            var censorshipRE = new RegExp(censorship_word_list.join("|"), 'gi');
            var censored = censorshipRE.exec(sentence);
            if (censored)
            {
              if (censorship_complain)
              {
                console.log("CENSORED REPLACED");
                sentence = get_censorship_complain_word();
              }
              else {
                console.log("CENSORED");
                sentence = ' ';
              }
            }
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
                console.log(tts_engine_lang);
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
                  console.log(tts_engine_lang);
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
                console.log(tts_engine_lang);
                sendResponse({read: sentence});
              }
            }
            else {
              if (read_normal_comments && sentence)
              {
                console.log(sentence);
                console.log(sentence.hexEncode());

                chrome.tts.speak(sentence, {'lang': tts_engine_lang, 'gender': tts_engine_gender, 'rate': 1.0, 'enqueue': !not_enqueue});
                console.log(tts_engine_lang);
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

        limit_comment_length = request.limit_comment_length;
        comment_length = request.comment_length;
        comment_length_complain = request.comment_length_complain;
        if (request.censorship_words)
        {
          if (request.censorship_words != '')
            censorship_word_list = request.censorship_words.split(/\s+/);
        }

        // console.log(request.censorship_words);

        censorship_complain = request.censorship_complain;
      }
    }
    else {
      tts_engine_lang = request.tts_engine_lang;
      tts_engine_gender = request.tts_engine_gender;
      not_enqueue = request.not_enqueue;
      read_name = request.read_name;
      read_normal_comments = request.read_normal_comments;
      read_gift_comments = request.read_gift_comments;

      limit_comment_length = request.limit_comment_length;
      comment_length = request.comment_length;
      comment_length_complain = request.comment_length_complain;
      if (request.censorship_words)
      {
        if (request.censorship_words != '')
          censorship_word_list = request.censorship_words.split(/\s+/);
      }

      // console.log(request.censorship_words);
      censorship_complain = request.censorship_complain;
    }

  });
