const fs = require('fs');
fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("https://www.novelhall.com/the-vampire-her-witch-36934/"))
  .then(res => res.text())
  .then(text => fs.writeFileSync("scratch/novelhall2.html", text));
