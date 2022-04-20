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
  var video = document.getElementById('myVideo');
  if (theme == 'light') {
    document.getElementById('switcher-id').href = '/css/themes/light.css';
    video.pause();

    document.getElementById('vid-source').src="/video/new.mp4";
    video.load();
    video.play();
    
  } 
  // else if (theme == 'cadetblue') {
  //   document.getElementById('switcher-id').href = '/css/themes/cadetblue.css';
  // } else if (theme == 'coral') {
  //   document.getElementById('switcher-id').href = '/css/themes/coral.css';
  else if (theme == 'dark') {
      document.getElementById('switcher-id').href = '/css/themes/dark.css';
      video.pause();
      document.getElementById('vid-source').src=('/video/city.mp4');
      video.load();
      video.play();
      
  }
  localStorage.setItem('style', theme);
}


//https://www.w3schools.com/xml/ajax_xmlhttprequest_send.asp
function updateLike(id, title, numberLikes, post_number, user){
  let ajax = new XMLHttpRequest(); 

  numberLikes = parseInt(numberLikes);
  numberLikes+=1;
  text_id = post_number.toString() + 'other-likes'

  
  document.getElementById(text_id).textContent = numberLikes.toString();
  document.getElementById(post_number.toString()+"heart-icon").style.color= "#EB0000";
  document.getElementById(post_number.toString()+"heart-icon").onclick = null;
  document.getElementById(post_number.toString() + "heart-icon").className = "fa-solid fa-heart";

  
  
  post_url = '/'+id+'/like'
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

