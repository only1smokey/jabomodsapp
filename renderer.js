// Change require to import for modern JavaScript syntax
const { ipcRenderer } = require('electron');

function checkMinecraft() {
  ipcRenderer.send('checkMinecraft');
}

ipcRenderer.on('checkMinecraftResult', (event, result) => {
  const resultDiv = document.getElementById('result');

  let fabricStatus = result.fabricInstalled ? 'Installed' : 'Not Installed';
  let minecraftStatus = result.minecraftInstalled ? 'Installed' : 'Not Installed';

  // Customize the output based on the availability of Minecraft and Fabric
  let message = `Minecraft Status: ${minecraftStatus}`;
  if (result.minecraftInstalled) {
    message += `<br>Fabric Status: ${fabricStatus}`;
  } else {
    message += '<br><i>(Fabric status is only applicable if Minecraft is installed)</i>';
  }

  resultDiv.innerHTML = message;
});


function installMods() {
  ipcRenderer.send('installMods');
}
function minimizeBtn() {
  ipcRenderer.send('minimizeApp');
}

function exitBtn() {
  ipcRenderer.send('exitApp');
}

ipcRenderer.on('installationStatus', (event, status) => {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = status;
});

// Add the following code to call the installMods function on button click
document.addEventListener('DOMContentLoaded', () => {
  const installModsButton = document.getElementById('installModsButton');
  installModsButton.addEventListener('click', installMods);
});
