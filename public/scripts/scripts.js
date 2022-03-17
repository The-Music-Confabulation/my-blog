let switches = document.getElementsByClassName('switch');
let style = localStorage.getItem('style');

if (style == null) {
  setTheme('light');
} else {
  setTheme(style);
}

for (let i of switches) {
  i.addEventListener('click', function () {
    let theme = this.dataset.theme;
    setTheme(theme);
  });
}

function setTheme(theme) {
  if (theme == 'light') {
    document.getElementById('switcher-id').href = '/css/themes/light.css';
  } else if (theme == 'cadetblue') {
    document.getElementById('switcher-id').href = '/css/themes/cadetblue.css';
  } else if (theme == 'coral') {
    document.getElementById('switcher-id').href = '/css/themes/coral.css';
  } else if (theme == 'dark') {
    document.getElementById('switcher-id').href = '/css/themes/dark.css';
  }
  localStorage.setItem('style', theme);
}


//https://www.w3schools.com/xml/ajax_xmlhttprequest_send.asp
function updateLike(id, title){
  let ajax = new XMLHttpRequest(); 

  //id to change /<%= songs[a]._id %>/like
  // Getting current likes in attempt to increase it
  let data = document.getElementById('/'+id+'/like').innerHTML;
  let current_num_like =  parseInt(data)
  current_num_like +=1 
  let new_data = current_num_like.toString()

  document.getElementById('/'+id+'/like').innerHTML = new_data
 
  post_url = '/'+id+'/'+title+'/like'
  alert(post_url)
  ajax.open("POST", post_url, true);
  ajax.send();
}

//update follow
//follow -> checkmark("following")
function updateFollowing(username, user_id){

  // /profile/:name/following/:id/
  let ajax = new XMLHttpRequest(); 
  url = '/profile/' + username + '/follow/' + user_id

  // Update followers number
  let follower_num = parseInt(document.getElementById('follower-num').innerHTML);
  follower_num += 1
  let new_follower_num = follower_num.toString()

  document.getElementById('follower-num').innerHTML = new_follower_num

  // Set follow to followed 
  document.getElementById('follow-btn').innerHTML = "followed"

  ajax.open("POST", url, true);
  ajax.send();
}

var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
})