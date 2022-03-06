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
  } else if (theme == 'grey') {
    document.getElementById('switcher-id').href = '/css/themes/grey.css';
  }
  localStorage.setItem('style', theme);
}