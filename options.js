// Saves options to chrome.storage
function save_options() {
  var tts_engine_value = document.getElementById('tts_engine').value;

  chrome.tts.getVoices(
    function(voices)
    {
      var tts_engine_array = tts_engine_value.split('#');
      var tts_engine_lang = tts_engine_array[0];
      var tts_engine_gender = tts_engine_array[1];

      var not_enqueue = document.getElementById('not_enqueue').checked;
      var read_name = document.getElementById('read_name').checked;
      var read_normal_comments = document.getElementById('read_normal_comments').checked;
      var read_gift_comments = document.getElementById('read_gift_comments').checked;
      var limit_comment_length = document.getElementById('comment_length_limit').checked;
      var comment_length = parseInt(document.getElementById('comment_length_limit_count').value) || 0;
      var comment_length_complain = document.getElementById('comment_length_limit_complain').checked;
      var censorship_words = document.getElementById('censorship_keyword').value.trim();
      var censorship_complain = document.getElementById('censorship_complain').checked;

      chrome.storage.sync.set({
        tts_engine_lang: tts_engine_lang,
        tts_engine_gender: tts_engine_gender,
        not_enqueue: not_enqueue,
        read_name: read_name,
        read_normal_comments: read_normal_comments,
        read_gift_comments: read_gift_comments,
        limit_comment_length: limit_comment_length,
        comment_length: comment_length,
        comment_length_complain: comment_length_complain,
        censorship_words: censorship_words,
        censorship_complain: censorship_complain

      }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = '选项已存储。';
        setTimeout(function() {
          status.textContent = '';
        }, 750);

        // pass to background page
        chrome.runtime.sendMessage({
            tts_engine_lang: tts_engine_lang,
            tts_engine_gender: tts_engine_gender,
            not_enqueue: not_enqueue,
            read_name: read_name,
            read_normal_comments: read_normal_comments,
            read_gift_comments: read_gift_comments,
            limit_comment_length: limit_comment_length,
            comment_length: comment_length,
            comment_length_complain: comment_length_complain,
            censorship_words: censorship_words,
            censorship_complain: censorship_complain
          },
          function(response) {

          });

      });
    }
  );


}

function list_tts_engines()
{
  var select = document.getElementById('tts_engine');

  chrome.tts.getVoices(
          function(voices) {
            for (var i = 0; i < voices.length; i++) {

              var option = document.createElement('option');
              option.text = voices[i].voiceName;
              option.value = voices[i].lang + '#' + voices[i].gender;
              select.add(option);

              // console.log('Voice ' + i + ':');
              // console.log('  name: ' + voices[i].voiceName);
              // console.log('  lang: ' + voices[i].lang);
              // console.log('  gender: ' + voices[i].gender);
              // console.log('  extension id: ' + voices[i].extensionId);
              // console.log('  event types: ' + voices[i].eventTypes);
            }
          });
}
// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  list_tts_engines();

  chrome.storage.sync.get(
    {
      tts_engine_lang: 'zh-CN',
      tts_engine_gender: 'female',
      not_enqueue: true,
      read_name: false,
      read_normal_comments: true,
      read_gift_comments: true,
      limit_comment_length: true,
      comment_length: '15',
      comment_length_complain: false,
      censorship_words: '',
      censorship_complain: false
    },
    function(items) {
    chrome.tts.getVoices(
            function(voices) {
              for (var i = 0; i < voices.length; i++) {
                if (voices[i].lang == items.tts_engine_lang &&
                  voices[i].gender == items.tts_engine_gender)
                {
                  document.getElementById('tts_engine').value = items.tts_engine_lang + '#' + items.tts_engine_gender;
                  // console.log(voices[i].voiceName);
                  break;
                }
              }
            });

    document.getElementById('not_enqueue').checked = items.not_enqueue;
    document.getElementById('enqueue').checked = !items.not_enqueue;

    document.getElementById('read_name').checked = items.read_name;
    document.getElementById('read_normal_comments').checked = items.read_normal_comments;
    document.getElementById('read_gift_comments').checked = items.read_gift_comments;

    document.getElementById('comment_length_limit').checked = items.limit_comment_length;
    document.getElementById('comment_length_limit_count').value = String(items.comment_length);
    document.getElementById('comment_length_limit_complain').checked = items.comment_length_complain;
    document.getElementById('censorship_keyword').innerHTML = items.censorship_words;
    document.getElementById('censorship_complain').checked = items.censorship_complain;

    }
  );
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
