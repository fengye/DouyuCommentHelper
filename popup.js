function stop_speaking()
{
  chrome.tts.stop();

  var status = document.getElementById('status');
  status.textContent = '语音已停止！';
  setTimeout(function() {
    status.textContent = '';
  }, 750);
}

function enable_tts()
{
  var enable_tts = document.getElementById('enable_tts');
  if (enable_tts.checked)
  {
    // console.log('Checked!');
  }
  else {
    // console.log('Unchecked!');
    chrome.tts.stop();
  }

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {enable_tts: enable_tts.checked}, function(response) {
      // console.log(response.code);
      });
  });
}

function restore_status()
{
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {check_tts_enabled: true}, function(response) {
        var enable_tts = document.getElementById('enable_tts');
        enable_tts.checked = response.code;
        // console.log(response.code);
      });
  });
}

document.addEventListener('DOMContentLoaded', restore_status);

document.getElementById('stop').addEventListener('click', stop_speaking);
document.getElementById('enable_tts').addEventListener('change', enable_tts);
